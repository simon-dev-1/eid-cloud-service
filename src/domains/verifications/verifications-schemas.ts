import { z } from 'zod';

export const verificationIdParams = z.object({
  id: z.string().trim().uuid('Verification ID must be a valid UUID'),
});
