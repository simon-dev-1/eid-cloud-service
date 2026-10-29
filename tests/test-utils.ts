import { config } from '../src/config.ts';
import { signSession } from '../src/utils/session.ts';

export const testConfig = {
  ...config,
  storage: {
    dir: '/tmp/eid-cloud-test-storage',
  },
  maxUploadBytes: 1024 * 1024,
};

export const testVaultId = '11111111-1111-4111-8111-111111111111';

export const signTestSession = (vaultId: string = testVaultId): string => signSession(vaultId);

export const sessionCookie = (vaultId: string = testVaultId): string =>
  `eid_session=${signTestSession(vaultId)}`;
