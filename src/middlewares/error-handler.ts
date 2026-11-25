import { CustomError, validationError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

import type { Request, Response, NextFunction } from 'express';

type ErrorWithMetadata = Error & {
  name?: string;
  code?: string;
  type?: string;
  status?: number;
  statusCode?: number;
};

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const meta = err as ErrorWithMetadata;

  // Multer / body-parser produce their own error shapes; map them to clean
  // client errors instead of a generic 500.
  if (meta.name === 'MulterError') {
    const tooLarge = meta.code === 'LIMIT_FILE_SIZE';
    res
      .status(tooLarge ? 413 : 400)
      .json({ message: tooLarge ? 'File is too large' : 'Invalid upload' });
    return;
  }

  if (meta.type === 'entity.parse.failed' || meta.type === 'entity.too.large') {
    res
      .status(meta.type === 'entity.too.large' ? 413 : 400)
      .json({ message: 'Invalid request body' });
    return;
  }

  if (err instanceof validationError) {
    const { statusCode, message, errors, flatMessage } = err;
    res.status(statusCode).json({ message, errors, errorMessage: flatMessage });
    return;
  }

  if (err instanceof CustomError) {
    const { statusCode, message, errorCode } = err;
    logger.warn({ statusCode, errorCode, message }, 'Request failed with a known error');
    res.status(statusCode).json(errorCode ? { message, errorCode } : { message });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ errors: [{ message: 'Something went wrong' }] });
};
