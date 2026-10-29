import { config } from '../config.js';
import { externalServiceError } from '../utils/errors.js';

export type VerificationState = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface DcqlClaims {
  [claim: string]: string[];
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
    dcql_response?: DcqlResponse;
  };
}

const credentialId = 'identity_credential';
const credentialVct = 'betaid-sdjwt';

const request = async <T>(path: string, init: RequestInit = {}): Promise<T> => {
  let response: Response;
  try {
    response = await fetch(`${config.swiyu.verifierBaseUrl}${path}`, init);
  } catch {
    throw new externalServiceError('swiyu verifier is unreachable');
  }

  if (!response.ok) {
    throw new externalServiceError(`swiyu verifier returned status ${response.status}`);
  }

  return (await response.json()) as T;
};

/**
 * Creates a verification request on the swiyu Generic Verifier, requesting the holder's
 * `first_name` and `last_name` from a Beta-ID credential.
 */
export const createVerification = (): Promise<CreateVerificationResult> => {
  const body = {
    accepted_issuer_dids: [config.swiyu.issuerDid],
    jwt_secured_authorization_request: true,
    response_mode: 'direct_post',
    verification_purpose: {
      scope: config.verification.scope,
      purpose_name: { default: config.verification.purposeName },
      purpose_description: { default: config.verification.purposeDescription },
    },
    dcql_query: {
      credentials: [
        {
          id: credentialId,
          format: 'dc+sd-jwt',
          meta: { vct_values: [credentialVct] },
          claims: [{ path: ['first_name'] }, { path: ['last_name'] }],
          require_cryptographic_holder_binding: true,
        },
      ],
    },
  };

  return request<CreateVerificationResult>('/management/api/verifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

export const getVerification = (id: string): Promise<GetVerificationResult> =>
  request<GetVerificationResult>(`/management/api/verifications/${id}`);

/**
 * Extracts the verified first/last name from the verifier's DCQL response. The response maps
 * credential ids to claim paths, where each claim value is an array (the first value is used).
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
    const firstName = claims.first_name?.[0];
    const lastName = claims.last_name?.[0];
    if (firstName && lastName) {
      return { firstName, lastName };
    }
  }

  return undefined;
};
