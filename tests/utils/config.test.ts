import { describe, expect, it } from '@jest/globals';

import { setConfig, validateConfig } from '../../src/config.ts';
import { testConfig } from '../test-utils.ts';

const validKek = Buffer.alloc(32, 1).toString('base64');
const validSecret = 'x'.repeat(44);

describe('validateConfig', () => {
  it('accepts a valid local configuration', () => {
    setConfig({
      env: 'local',
      session: { secret: validSecret },
      vault: { kek: validKek },
    });

    expect(() => validateConfig()).not.toThrow();
  });

  it('rejects a short session secret', () => {
    setConfig({ session: { secret: 'short' } });

    expect(() => validateConfig()).toThrow(/SESSION_SECRET/);
  });

  it('rejects a non-32-byte KEK', () => {
    setConfig({ vault: { kek: 'c2hvcnQ=' } });

    expect(() => validateConfig()).toThrow(/SERVER_KEK/);
  });

  it('rejects a missing APP_ORIGIN outside local', () => {
    setConfig({ env: 'production', appOrigin: undefined });

    expect(() => validateConfig()).toThrow(/APP_ORIGIN/);
  });

  it('rejects a non-https APP_ORIGIN outside local', () => {
    setConfig({ env: 'production', appOrigin: 'http://app.eid-cloud.ch' });

    expect(() => validateConfig()).toThrow(/APP_ORIGIN/);
  });

  it('accepts an https APP_ORIGIN outside local', () => {
    setConfig({
      env: 'production',
      appOrigin: 'https://app.eid-cloud.ch',
      session: { secret: validSecret },
      vault: { kek: validKek },
    });

    expect(() => validateConfig()).not.toThrow();
  });

  it('rejects an s3 storage driver without credentials', () => {
    setConfig({
      env: 'local',
      storage: {
        ...testConfig.storage,
        driver: 's3',
        s3: { region: 'ch-gva-2', forcePathStyle: true },
      },
      session: { secret: validSecret },
      vault: { kek: validKek },
    });

    expect(() => validateConfig()).toThrow(/STORAGE_DRIVER=s3/);
  });
});
