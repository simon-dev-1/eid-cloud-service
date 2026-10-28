import { z } from 'zod';

export const fileIdParams = z.object({
  id: z.string().trim().uuid('File ID must be a valid UUID'),
});
