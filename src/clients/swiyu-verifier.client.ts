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
// The BCS migrated the Beta-ID credential type from `betaid-sdjwt` to
// `urn:vct:ch.admin.bcs.betaid`; accept both while older credentials are still around.
const credentialVcts = ['betaid-sdjwt', 'urn:vct:ch.admin.bcs.betaid'];

// The BCS migrated its issuer DID method from `did:tdw` (deprecated) to `did:webvh` (same SCID +
// UUID). Accept the legacy DID too so Beta-IDs issued before the migration still verify.
const legacyBetaIdIssuerDid =
  'did:tdw:QmPEZPhDFR4nEYSFK5bMnvECqdpf1tPTPJuWs9QrMjCumw:identifier-reg.trust-infra.swiyu-int.admin.ch:api:v1:did:9a5559f0-b81c-4368-a170-e7b4ae424527';

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
 * `given_name` and `family_name` from a Beta-ID credential.
 */
export const createVerification = (): Promise<CreateVerificationResult> => {
  const body = {
    accepted_issuer_dids: [config.swiyu.issuerDid, legacyBetaIdIssuerDid],
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
          id: credentialId,
          format: 'dc+sd-jwt',
          meta: { vct_values: credentialVcts },
          claims: [{ path: ['given_name'] }, { path: ['family_name'] }],
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
    const firstName = claims.given_name?.[0];
    const lastName = claims.family_name?.[0];
    if (firstName && lastName) {
      return { firstName, lastName };
    }
  }

  return undefined;
};
