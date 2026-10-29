import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';

jest.unstable_mockModule('../../../src/domains/vault/vault-dao.js', () => ({
  findByNames: jest.fn(),
  createVault: jest.fn(),
}));

const { setConfig } = await import('../../../src/config.js');
const vaultDao = await import('../../../src/domains/vault/vault-dao.js');
const vaultService = await import('../../../src/domains/vault/vault-service.js');
const { generateMasterKey, wrapMasterKey } = await import('../../../src/utils/crypto.js');
const { testConfig } = await import('../../test-utils.ts');

const findByNamesMock = jest.mocked(vaultDao.findByNames);
const createVaultMock = jest.mocked(vaultDao.createVault);

const masterKey = generateMasterKey();

const record = {
  id: '00000000-0000-4000-8000-000000000001',
  firstName: 'Max',
  lastName: 'Muster',
  wrappedMasterKey: wrapMasterKey(masterKey),
  kekVersion: 1,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeAll(() => {
  setConfig({ ...testConfig });
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('vault service', () => {
  describe('unlockByName', () => {
    it('reuses an existing vault and unwraps its master key', async () => {
      findByNamesMock.mockResolvedValue(record);

      const result = await vaultService.unlockByName(' Max ', ' Muster ');

      expect(findByNamesMock).toHaveBeenCalledWith('Max', 'Muster');
      expect(createVaultMock).not.toHaveBeenCalled();
      expect(result.vaultId).toBe(record.id);
      expect(result.displayName).toBe('Max Muster');
      expect(result.masterKey).toBe(masterKey.toString('base64'));
    });

    it('creates a vault on first verification', async () => {
      findByNamesMock.mockResolvedValue(undefined);
      createVaultMock.mockResolvedValue(record);

      const result = await vaultService.unlockByName('Max', 'Muster');

      expect(createVaultMock).toHaveBeenCalledTimes(1);
      expect(createVaultMock).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Max',
          lastName: 'Muster',
        }),
      );
      expect(result.vaultId).toBe(record.id);
      expect(result.masterKey).toBe(masterKey.toString('base64'));
    });
  });
});
