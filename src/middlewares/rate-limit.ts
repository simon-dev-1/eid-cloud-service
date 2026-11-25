import rateLimit from 'express-rate-limit';

import { config } from '../config.js';

import type { Request, Response } from 'express';
import type { Options, RateLimitRequestHandler } from 'express-rate-limit';

const tooManyRequests = (_request: Request, response: Response): void => {
  response.status(429).json({
    message: 'Too many requests, please slow down',
    errorCode: 'RATE_LIMITED',
  });
};

const commonOptions: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooManyRequests,
  skip: (): boolean => !config.http.rateLimit.enabled,
};

/**
 * Builds a rate limiter. `limit`/`windowMs` default to the global config but can
 * be overridden per route (verification creation and uploads are stricter).
 */
export const createRateLimiter = (options: Partial<Options> = {}): RateLimitRequestHandler =>
  rateLimit({
    windowMs: config.http.rateLimit.windowMs,
    limit: config.http.rateLimit.max,
    ...commonOptions,
    ...options,
  });

export const apiRateLimiter: RateLimitRequestHandler = createRateLimiter();

export const verificationRateLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: 60_000,
  limit: config.http.rateLimit.verificationMax,
});

export const uploadRateLimiter: RateLimitRequestHandler = createRateLimiter({
  windowMs: 60_000,
  limit: config.http.rateLimit.uploadMax,
});
