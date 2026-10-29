import { createHmac, timingSafeEqual } from 'node:crypto';

import { config } from '../config.js';

export interface SessionPayload {
  vaultId: string;
  exp: number;
}

const b64url = (buffer: Buffer): string => buffer.toString('base64url');

/**
 * Signs a session token: `base64url(payload).base64url(hmac-sha256(secret, base64url(payload)))`.
 * The payload carries the vault id and an absolute expiry (epoch seconds).
 */
export const signSession = (vaultId: string): string => {
  const payload: SessionPayload = {
    vaultId,
    exp: Math.floor(Date.now() / 1000) + config.session.ttlSeconds,
  };
  const encodedPayload = b64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signature = createHmac('sha256', config.session.secret).update(encodedPayload).digest();

  return `${encodedPayload}.${b64url(signature)}`;
};

/**
 * Verifies a session token's signature and expiry, returning the payload or `undefined` if
 * invalid/expired. Uses a constant-time comparison for the signature.
 */
export const verifySession = (token: string): SessionPayload | undefined => {
  const [encodedPayload, encodedSignature] = token.split('.');
  if (!encodedPayload || !encodedSignature) {
    return undefined;
  }

  const expected = createHmac('sha256', config.session.secret).update(encodedPayload).digest();
  const provided = Buffer.from(encodedSignature, 'base64url');

  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return undefined;
  }

  let payload: SessionPayload;
  try {
    payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as SessionPayload;
  } catch {
    return undefined;
  }

  if (typeof payload.vaultId !== 'string' || typeof payload.exp !== 'number') {
    return undefined;
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return undefined;
  }

  return payload;
};
