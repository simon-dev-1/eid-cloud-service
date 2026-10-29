import { Router } from 'express';

import { createVerificationHandler, pollVerificationHandler } from './verifications-controller.js';
import { verificationIdParams } from './verifications-schemas.js';
import { validate } from '../../middlewares/request-validator.js';

export const router = Router();

router.post('/api/v1/verifications', createVerificationHandler);
router.get(
  '/api/v1/verifications/:id',
  validate({ params: verificationIdParams }),
  pollVerificationHandler,
);
