import { Router } from 'express';
import multer from 'multer';

import { deleteFile, downloadFile, listFiles, uploadFile } from './files-controller.js';
import { fileIdParams } from './files-schemas.js';
import { config } from '../../config.js';
import { validate } from '../../middlewares/request-validator.js';

export const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes },
});

router.post('/api/v1/files', upload.single('file'), uploadFile);
router.get('/api/v1/files', listFiles);
router.get('/api/v1/files/:id', validate({ params: fileIdParams }), downloadFile);
router.delete('/api/v1/files/:id', validate({ params: fileIdParams }), deleteFile);
