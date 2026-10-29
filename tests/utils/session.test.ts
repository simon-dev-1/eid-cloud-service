import { beforeAll, describe, expect, it } from '@jest/globals';

import { setConfig } from '../../src/config.ts';
import { signSession, verifySession } from '../../src/utils/session.ts';
import { testConfig } from '../test-utils.ts';

beforeAll(() => {
  setConfig({
    ...testConfig,
    session: { ...testConfig.session, secret: 'test-secret', ttlSeconds: 60 },
  });
});

describe('session', () => {
  it('round-trips a signed session payload', () => {
    const token = signSession('vault-123');

    const payload = verifySession(token);

    expect(payload?.vaultId).toBe('vault-123');
  });

  it('rejects a tampered signature', () => {
    const token = signSession('vault-123');
    const [head, signature] = token.split('.');
    const tampered = `${head}.${`0${signature}`.slice(0, signature.length)}`;

    expect(verifySession(tampered)).toBeUndefined();
  });

  it('rejects a token signed with a different secret', () => {
    const token = signSession('vault-123');

    setConfig({
      ...testConfig,
      session: { ...testConfig.session, secret: 'other-secret', ttlSeconds: 60 },
    });

    expect(verifySession(token)).toBeUndefined();
  });

  it('rejects an expired token', () => {
    setConfig({
      ...testConfig,
      session: { ...testConfig.session, secret: 'test-secret', ttlSeconds: 0 },
    });

    const token = signSession('vault-123');

    expect(verifySession(token)).toBeUndefined();
  });

  it('rejects malformed tokens', () => {
    expect(verifySession('not-a-token')).toBeUndefined();
    expect(verifySession('onlyone.part')).toBeUndefined();
    expect(verifySession('a.b.c')).toBeUndefined();
  });
});
