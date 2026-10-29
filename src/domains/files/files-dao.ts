import { db } from '../../database/db.js';
import { filesTable } from '../../database/migrations/20251028000000-create-files-table.js';

import type { FileDto, FileRecord, CreateFileInput } from './files-dtos.js';

type FilesRow = {
  id: string;
  storage_key: string;
  original_name: string;
  content_type: string;
  size: string | number;
  created_at: Date | string;
};

const mapRow = (row: FilesRow): FileDto => ({
  id: row.id,
  originalName: row.original_name,
  contentType: row.content_type,
  size: typeof row.size === 'number' ? row.size : Number(row.size),
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
});

type InsertFileRecord = Omit<CreateFileInput, 'data'> & { id: string; storageKey: string };

export const createFile = async (record: InsertFileRecord, vaultId: string): Promise<FileDto> => {
  const [row] = await db(filesTable)
    .insert({
      id: record.id,
      storage_key: record.storageKey,
      original_name: record.originalName,
      content_type: record.contentType,
      size: record.size,
      vault_id: vaultId,
    })
    .returning('*');
  return mapRow(row as FilesRow);
};

export const getFileById = async (id: string, vaultId: string): Promise<FileRecord | undefined> => {
  const row = (await db(filesTable).where({ id, vault_id: vaultId }).first()) as
    FilesRow | undefined;
  return row ? { ...mapRow(row), storageKey: row.storage_key } : undefined;
};

export const listFiles = async (vaultId: string): Promise<FileDto[]> => {
  const rows = (await db(filesTable)
    .where({ vault_id: vaultId })
    .orderBy('created_at', 'desc')) as FilesRow[];
  return rows.map(mapRow);
};

export const deleteFile = async (id: string, vaultId: string): Promise<void> => {
  await db(filesTable).where({ id, vault_id: vaultId }).delete();
};
