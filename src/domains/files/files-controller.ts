import * as filesService from './files-service.js';
import { getValidatedParams } from '../../middlewares/async-context.js';
import { badRequestError } from '../../utils/errors.js';

import type { FileIdParams } from './files-dtos.js';
import type { Request, Response } from 'express';

export const uploadFile = async (request: Request, response: Response): Promise<void> => {
  if (!request.file) {
    throw new badRequestError('File is required');
  }

  const file = await filesService.uploadFile({
    originalName: request.file.originalname,
    contentType: request.file.mimetype,
    data: request.file.buffer,
    size: request.file.size,
  });

  response.status(201).send(file);
};

export const listFiles = async (_request: Request, response: Response): Promise<void> => {
  const files = await filesService.listFiles();
  response.status(200).send(files);
};

export const downloadFile = async (_request: Request, response: Response): Promise<void> => {
  const { id } = getValidatedParams<FileIdParams>()!;

  const { data, record } = await filesService.downloadFile(id);

  response.attachment(record.originalName);
  response.type(record.contentType);
  response.status(200).send(data);
};

export const deleteFile = async (_request: Request, response: Response): Promise<void> => {
  const { id } = getValidatedParams<FileIdParams>()!;

  await filesService.deleteFile(id);

  response.status(204).send();
};
