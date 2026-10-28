import { Router } from 'express';

import { router as filesRouter } from '../domains/files/files-routes.js';

const router = Router();

router.use(filesRouter);

export const routes = router;
