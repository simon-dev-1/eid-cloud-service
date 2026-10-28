import { randomUUID } from 'node:crypto';

import * as filesDao from './files-dao.js';
import { storage } from '../../clients/storage.js';
import { notFoundError } from '../../utils/errors.js';

import type { CreateFileInput, FileDto, FileRecord } from './files-dtos.js';

const sanitizeFileName = (name: string): string => {
  const baseName = name.replace(/\\/g, '/').split('/').pop() ?? 'file';
  const cleaned = baseName.replace(/[\u0000-\u001f"<>]/g, '').trim();
  return cleaned.length > 0 ? cleaned.slice(0, 255) : 'file';
};

export const uploadFile = async (input: CreateFileInput): Promise<FileDto> => {
  const id = randomUUID();
  const storageKey = id;
  const originalName = sanitizeFileName(input.originalName);

  await storage.put(storageKey, input.data, input.contentType);

  return filesDao.createFile({
    id,
    storageKey,
    originalName,
    contentType: input.contentType,
    size: input.size,
  });
};

export const listFiles = async (): Promise<FileDto[]> => {
  return filesDao.listFiles();
};

export const downloadFile = async (id: string): Promise<{ data: Buffer; record: FileRecord }> => {
  const record = await filesDao.getFileById(id);
  if (!record) {
    throw new notFoundError(`File with id ${id} not found`);
  }

  const { data } = await storage.get(record.storageKey);
  return { data, record };
};

export const deleteFile = async (id: string): Promise<void> => {
  const record = await filesDao.getFileById(id);
  if (!record) {
    throw new notFoundError(`File with id ${id} not found`);
  }

  await storage.delete(record.storageKey);
  await filesDao.deleteFile(id);
};
