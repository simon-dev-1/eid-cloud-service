import { config } from '../config.js';
import { externalServiceError } from '../utils/errors.js';

export type VerificationState = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface CredentialSubject {
  given_name?: string;
  family_name?: string;
  [key: string]: unknown;
}

export interface CredentialSubjectData {
  [credentialId: string]: CredentialSubject[];
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
    // The verifier (>=5.x) returns the requested claims under `credential_subject_data`
    // (keyed by credential id, each value an array of credential objects with string claims).
    credential_subject_data?: CredentialSubjectData;
  };
}

const credentialId = 'identity_credential';
// The BCS migrated the Beta-ID credential type from `betaid-sdjwt` to
// `urn:vct:ch.admin.bcs.betaid`; accept both while older credentials are still around.
const credentialVcts = ['betaid-sdjwt', 'urn:vct:ch.admin.bcs.betaid'];

// The BCS re-onboarded from `did:tdw` (deprecated/frozen) to a new `did:webvh` DID. Keep the
// legacy `did:tdw` DID too so Beta-IDs issued before the migration still verify.
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
 * Extracts the verified first/last name from the verifier's management response. The verifier
 * returns the requested claims in `wallet_response.credential_subject_data`, keyed by credential
 * id; each value is an array of credential objects with string `given_name`/`family_name` claims.
 */
export const extractName = (
  result: GetVerificationResult,
):
  | {
      firstName: string;
      lastName: string;
    }
  | undefined => {
  const subjectData = result.wallet_response?.credential_subject_data;
  if (!subjectData) {
    return undefined;
  }

  for (const credentials of Object.values(subjectData)) {
    for (const credential of credentials) {
      const firstName = credential.given_name;
      const lastName = credential.family_name;
      if (firstName && lastName) {
        return { firstName, lastName };
      }
    }
  }

  return undefined;
};
