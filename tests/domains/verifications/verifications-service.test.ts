import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/clients/swiyu-verifier.client.js', () => ({
  createVerification: jest.fn(),
  getVerification: jest.fn(),
  extractName: jest.fn(),
}));

jest.unstable_mockModule('../../../src/domains/vault/vault-service.js', () => ({
  unlockByName: jest.fn(),
}));

const { setConfig } = await import('../../../src/config.js');
const verifierClient = await import('../../../src/clients/swiyu-verifier.client.js');
const vaultService = await import('../../../src/domains/vault/vault-service.js');
const verificationsService =
  await import('../../../src/domains/verifications/verifications-service.js');
const { testConfig } = await import('../../test-utils.ts');

const createVerificationMock = jest.mocked(verifierClient.createVerification);
const getVerificationMock = jest.mocked(verifierClient.getVerification);
const extractNameMock = jest.mocked(verifierClient.extractName);
const unlockByNameMock = jest.mocked(vaultService.unlockByName);

beforeAll(() => {
  setConfig({ ...testConfig });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('verifications service', () => {
  describe('createVerification', () => {
    it('returns the verification id and deeplink from the verifier', async () => {
      createVerificationMock.mockResolvedValue({
        id: 'verifier-id',
        verification_deeplink: 'swiyu-verify://?client_id=...',
        state: 'PENDING',
      });

      const result = await verificationsService.createVerification();

      expect(result).toEqual({
        verificationId: 'verifier-id',
        deeplink: 'swiyu-verify://?client_id=...',
      });
    });
  });

  describe('pollVerification', () => {
    it('unlocks the vault and returns a session token on success', async () => {
      getVerificationMock.mockResolvedValue({
        id: 'verifier-id',
        state: 'SUCCESS',
        wallet_response: {},
      });
      extractNameMock.mockReturnValue({ firstName: 'Max', lastName: 'Muster' });
      unlockByNameMock.mockResolvedValue({
        vaultId: 'vault-id',
        firstName: 'Max',
        lastName: 'Muster',
        displayName: 'Max Muster',
        masterKey: 'bWFzdGVy',
      });

      const result = await verificationsService.pollVerification('verifier-id');

      expect(result.state).toBe('SUCCESS');
      expect(result.displayName).toBe('Max Muster');
      expect(result.vaultId).toBe('vault-id');
      expect(result.masterKey).toBe('bWFzdGVy');
      expect(result.sessionToken).toEqual(expect.any(String));
    });

    it('fails when the credential has no name', async () => {
      getVerificationMock.mockResolvedValue({
        id: 'verifier-id',
        state: 'SUCCESS',
        wallet_response: {},
      });
      extractNameMock.mockReturnValue(undefined);

      const result = await verificationsService.pollVerification('verifier-id');

      expect(result.state).toBe('FAILED');
      expect(unlockByNameMock).not.toHaveBeenCalled();
    });

    it('returns FAILED when the verifier reports failure', async () => {
      getVerificationMock.mockResolvedValue({ id: 'verifier-id', state: 'FAILED' });

      const result = await verificationsService.pollVerification('verifier-id');

      expect(result.state).toBe('FAILED');
    });

    it('returns PENDING for an in-flight verification', async () => {
      getVerificationMock.mockResolvedValue({ id: 'verifier-id', state: 'PENDING' });

      const result = await verificationsService.pollVerification('verifier-id');

      expect(result.state).toBe('PENDING');
    });

    it('returns EXPIRED for an expired verification', async () => {
      getVerificationMock.mockResolvedValue({ id: 'verifier-id', state: 'EXPIRED' });

      const result = await verificationsService.pollVerification('verifier-id');

      expect(result.state).toBe('EXPIRED');
    });
  });
});
