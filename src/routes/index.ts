import { Router } from 'express';

import { router as filesRouter } from '../domains/files/files-routes.js';
import { router as verificationsRouter } from '../domains/verifications/verifications-routes.js';
import { requireSession } from '../middlewares/require-session.js';

const router = Router();

router.use(verificationsRouter);
router.use(requireSession, filesRouter);

export const routes = router;
