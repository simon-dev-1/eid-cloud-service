import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { config } from '../config.js';
import { internalServiceError } from './errors.js';

const masterKeyBytes = 32;
const kekBytes = 32;
const gcmIvBytes = 12;
const gcmTagBytes = 16;
const gcmAlgo = 'aes-256-gcm';

/**
 * Returns the server-held key-encryption-key (KEK) that wraps vault master keys at rest.
 * `SERVER_KEK` is expected to be the base64 encoding of 32 random bytes.
 */
export const getKek = (): Buffer => {
  const decoded = Buffer.from(config.vault.kek, 'base64');
  if (decoded.length !== kekBytes) {
    throw new internalServiceError('SERVER_KEK must be a base64-encoded 32-byte key');
  }
  return decoded;
};

/** Generates a fresh random vault master key (32 bytes). */
export const generateMasterKey = (): Buffer => randomBytes(masterKeyBytes);

/**
 * Wraps a vault master key with the KEK using AES-256-GCM.
 * Returns a base64 string of `iv || ciphertext || authTag`.
 */
export const wrapMasterKey = (key: Buffer): string => {
  const iv = randomBytes(gcmIvBytes);
  const cipher = createCipheriv(gcmAlgo, getKek(), iv);
  const ciphertext = Buffer.concat([cipher.update(key), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, ciphertext, tag]).toString('base64');
};

/** Unwraps a base64-encoded wrapped master key back to the raw 32-byte key. */
export const unwrapMasterKey = (wrapped: string): Buffer => {
  const payload = Buffer.from(wrapped, 'base64');
  const iv = payload.subarray(0, gcmIvBytes);
  const tag = payload.subarray(payload.length - gcmTagBytes);
  const ciphertext = payload.subarray(gcmIvBytes, payload.length - gcmTagBytes);

  const decipher = createDecipheriv(gcmAlgo, getKek(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
};
