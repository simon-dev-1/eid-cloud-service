import { setSessionVaultId } from './async-context.js';
import { config } from '../config.js';
import { unauthorized } from '../utils/errors.js';
import { verifySession } from '../utils/session.js';

import type { NextFunction, Request, Response } from 'express';

const parseCookies = (header: string | undefined): Record<string, string> => {
  if (!header) {
    return {};
  }

  const cookies: Record<string, string> = {};
  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }
    const key = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (key) {
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        // Malformed percent-encoding — keep the raw value so verification fails
        // with a 401 instead of throwing a 500.
        cookies[key] = value;
      }
    }
  }
  return cookies;
};

/**
 * Requires a valid `eid_session` cookie. On success, the session's vault id is attached to the
 * async context so downstream handlers can scope their work to the authenticated vault.
 */
export const requireSession = (req: Request, _res: Response, next: NextFunction): void => {
  const token = parseCookies(req.headers.cookie)[config.session.cookieName];

  if (!token) {
    throw new unauthorized('Authentication required');
  }

  const payload = verifySession(token);
  if (!payload) {
    throw new unauthorized('Invalid or expired session');
  }

  setSessionVaultId(payload.vaultId);
  next();
};
