import { ZodError } from 'zod';

import { setValidatedBody, setValidatedParams, setValidatedQuery } from './async-context.js';
import { validationError } from '../utils/errors.js';

import type { NextFunction, Request, Response } from 'express';
import type { z } from 'zod';

type ValidateRequest = {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
};

export const validate =
  (schema: ValidateRequest) => (req: Request, _res: Response, next: NextFunction) => {
    const { body, query, params } = schema;
    try {
      if (params) {
        setValidatedParams(params.parse(req.params));
      }
      if (query) {
        setValidatedQuery(query.parse(req.query));
      }
      if (body) {
        setValidatedBody(body.parse(req.body));
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        throw new validationError('Validation failed', error);
      }
      throw error;
    }
  };
