import { beforeAll, describe, expect, it } from '@jest/globals';

import { setConfig } from '../../src/config.ts';
import { generateMasterKey, unwrapMasterKey, wrapMasterKey } from '../../src/utils/crypto.ts';
import { testConfig } from '../test-utils.ts';

beforeAll(() => {
  setConfig({ ...testConfig });
});

describe('crypto', () => {
  it('wraps and unwraps a master key', () => {
    const key = generateMasterKey();

    const wrapped = wrapMasterKey(key);

    expect(wrapped).not.toContain(key.toString('base64'));
    expect(unwrapMasterKey(wrapped)).toEqual(key);
  });

  it('generates distinct master keys', () => {
    expect(generateMasterKey().equals(generateMasterKey())).toBe(false);
  });

  it('produces distinct ciphertexts for the same key (random IV)', () => {
    const key = generateMasterKey();

    expect(wrapMasterKey(key)).not.toBe(wrapMasterKey(key));
  });

  it('throws when SERVER_KEK is not a 32-byte base64 key', () => {
    setConfig({
      ...testConfig,
      vault: { ...testConfig.vault, kek: 'c2hvcnQ=' },
    });

    expect(() => wrapMasterKey(generateMasterKey())).toThrow();
  });
});
