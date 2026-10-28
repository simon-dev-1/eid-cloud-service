import { config } from '../src/config.ts';

export const testConfig = {
  ...config,
  storage: {
    dir: '/tmp/eid-cloud-test-storage',
  },
  maxUploadBytes: 1024 * 1024,
};
