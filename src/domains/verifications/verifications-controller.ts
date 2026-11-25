import * as verificationsService from './verifications-service.js';
import { config } from '../../config.js';
import { getValidatedParams } from '../../middlewares/async-context.js';
import { sessionCookieOptions } from '../../utils/session.js';

import type { VerificationIdParams } from './verifications-dtos.js';
import type { Request, Response } from 'express';

export const createVerificationHandler = async (
  _request: Request,
  response: Response,
): Promise<void> => {
  const result = await verificationsService.createVerification();
  response.status(201).send(result);
};

export const pollVerificationHandler = async (
  _request: Request,
  response: Response,
): Promise<void> => {
  const { id } = getValidatedParams<VerificationIdParams>()!;

  const result = await verificationsService.pollVerification(id);

  if (result.state === 'SUCCESS' && result.sessionToken) {
    response.cookie(config.session.cookieName, result.sessionToken, sessionCookieOptions());
  }

  response.status(200).send({
    state: result.state,
    displayName: result.displayName,
    vaultId: result.vaultId,
    masterKey: result.masterKey,
    error: result.error,
  });
};
