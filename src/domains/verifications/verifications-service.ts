import * as verifierClient from '../../clients/swiyu-verifier.client.js';
import { signSession } from '../../utils/session.js';
import * as vaultService from '../vault/vault-service.js';

import type { CreateVerificationResponse, PollVerificationOutcome } from './verifications-dtos.js';

export const createVerification = async (): Promise<CreateVerificationResponse> => {
  const result = await verifierClient.createVerification();

  return {
    verificationId: result.id,
    deeplink: result.verification_deeplink,
  };
};

export const pollVerification = async (id: string): Promise<PollVerificationOutcome> => {
  const result = await verifierClient.getVerification(id);

  if (result.state === 'SUCCESS') {
    const name = verifierClient.extractName(result);
    if (!name) {
      return { state: 'FAILED', error: 'Verified credential did not include a name' };
    }

    const unlocked = await vaultService.unlockByName(name.firstName, name.lastName);

    return {
      state: 'SUCCESS',
      displayName: unlocked.displayName,
      vaultId: unlocked.vaultId,
      masterKey: unlocked.masterKey,
      sessionToken: signSession(unlocked.vaultId),
    };
  }

  if (result.state === 'FAILED') {
    return { state: 'FAILED', error: 'Verification failed or was rejected' };
  }

  return { state: result.state === 'EXPIRED' ? 'EXPIRED' : 'PENDING' };
};
