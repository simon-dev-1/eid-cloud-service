import { config } from '../config.js';
import { forbidden } from '../utils/errors.js';

import type { NextFunction, Request, Response } from 'express';

const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Rejects cross-origin requests on state-changing methods when the request
 * carries an `Origin` that does not match the configured app origin.
 *
 * This is defense-in-depth on top of `SameSite=Lax`: browsers attach an `Origin`
 * header on unsafe requests, so a mismatch here is a strong signal of CSRF.
 * Requests without an `Origin` (e.g. curl, server-to-server) are allowed through.
 */
export const originCheck = (req: Request, _res: Response, next: NextFunction): void => {
  if (!config.appOrigin) {
    next();
    return;
  }

  if (!unsafeMethods.has(req.method)) {
    next();
    return;
  }

  const origin = req.get('origin');
  if (origin && origin !== config.appOrigin) {
    throw new forbidden('Cross-origin request rejected');
  }

  next();
};
