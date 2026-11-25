import { config } from '../config.js';
import { externalServiceError } from '../utils/errors.js';

export type VerificationState = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface DcqlClaims {
  [claim: string]: unknown[];
}

export interface DcqlResponse {
  [credentialId: string]: DcqlClaims;
}

export interface CreateVerificationResult {
  id: string;
  verification_deeplink: string;
  state: string;
}

export interface GetVerificationResult {
  id: string;
  state: string;
  wallet_response?: {
    // verifier 5.1.0 returns the requested claims under `dcql_response`, keyed by credential id,
    // then by claim path; each value is an array (the first element is the value).
    dcql_response?: DcqlResponse;
  };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

interface RequestOptions {
  retries?: number;
}

/**
 * Performs an HTTP call against the verifier's management API with a hard timeout.
 * Retries transient failures (network errors, timeouts, 5xx) up to `retries`
 * extra attempts; client errors (4xx) are never retried.
 */
const request = async <T>(
  path: string,
  init: RequestInit = {},
  { retries = 1 }: RequestOptions = {},
): Promise<T> => {
  const maxAttempts = retries + 1;
  let lastError: Error = new externalServiceError('swiyu verifier is unreachable');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.swiyu.managementTimeoutMs);

    let retryable = false;
    try {
      const response = await fetch(`${config.swiyu.verifierBaseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      lastError = new externalServiceError(`swiyu verifier returned status ${response.status}`);
      retryable = response.status >= 500;
      if (!retryable) {
        throw lastError;
      }
    } catch (error) {
      if (controller.signal.aborted) {
        lastError = new externalServiceError('swiyu verifier timed out');
        retryable = true;
      } else if (error instanceof externalServiceError) {
        lastError = error;
      } else {
        lastError = new externalServiceError('swiyu verifier is unreachable');
        retryable = true;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (!retryable || attempt >= maxAttempts - 1) {
      throw lastError;
    }
    await sleep(200 * (attempt + 1));
  }

  throw lastError;
};

/**
 * Creates a verification request on the swiyu Generic Verifier, requesting the holder's
 * `given_name` and `family_name` from a Beta-ID credential.
 */
export const createVerification = (): Promise<CreateVerificationResult> => {
  const body = {
    accepted_issuer_dids: [config.swiyu.issuerDid, config.swiyu.legacyIssuerDid],
    jwt_secured_authorization_request: true,
    // `direct_post.jwt` (encrypted response) is required by the current swiyu wallet(s).
    // Plain `direct_post` is rejected with `invalid_request`; the verifier then auto-adds the
    // `jwks` + `encrypted_response_enc_values_supported` metadata for the encrypted response.
    response_mode: 'direct_post.jwt',
    verification_purpose: {
      scope: config.verification.scope,
      purpose_name: { default: config.verification.purposeName },
      purpose_description: { default: config.verification.purposeDescription },
    },
    dcql_query: {
      credentials: [
        {
          id: config.swiyu.credentialId,
          format: 'dc+sd-jwt',
          meta: { vct_values: config.swiyu.credentialVcts },
          claims: [{ path: ['given_name'] }, { path: ['family_name'] }],
          require_cryptographic_holder_binding: true,
        },
      ],
    },
  };

  return request<CreateVerificationResult>(
    '/management/api/verifications',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    { retries: 0 },
  );
};

export const getVerification = (id: string): Promise<GetVerificationResult> =>
  request<GetVerificationResult>(`/management/api/verifications/${id}`, {}, { retries: 1 });

/**
 * Extracts the verified first/last name from the verifier's management response. verifier 5.1.0
 * returns the requested claims in `wallet_response.dcql_response`, keyed by credential id and then
 * claim path; each claim value is an array whose first element is the value.
 */
export const extractName = (
  result: GetVerificationResult,
):
  | {
      firstName: string;
      lastName: string;
    }
  | undefined => {
  const dcql = result.wallet_response?.dcql_response;
  if (!dcql) {
    return undefined;
  }

  for (const claims of Object.values(dcql)) {
    const firstName = claims.given_name?.[0];
    const lastName = claims.family_name?.[0];
    if (typeof firstName === 'string' && typeof lastName === 'string') {
      return { firstName, lastName };
    }
  }

  return undefined;
};
