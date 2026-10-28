import { CustomError, validationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

import type { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, 'Error occurred');

  if (err instanceof validationError) {
    const { statusCode, message, errors, flatMessage } = err;

    res.status(statusCode).json({
      message,
      errors,
      errorMessage: flatMessage,
    });
    return;
  }

  if (err instanceof CustomError) {
    const { statusCode, message, errorCode } = err;
    res.status(statusCode).json(errorCode ? { message, errorCode } : { message });
    return;
  }

  res.status(500).json({ errors: [{ message: 'Something went wrong' }] });
};
