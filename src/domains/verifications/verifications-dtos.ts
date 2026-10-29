export type VerificationState = 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface CreateVerificationResponse {
  verificationId: string;
  deeplink: string;
}

export interface PollVerificationResponse {
  state: VerificationState;
  displayName?: string;
  vaultId?: string;
  masterKey?: string;
  error?: string;
}

export interface PollVerificationOutcome extends PollVerificationResponse {
  sessionToken?: string;
}

export interface VerificationIdParams {
  id: string;
}
