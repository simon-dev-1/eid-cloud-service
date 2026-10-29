import { db } from '../../database/db.js';
import { vaultsTable } from '../../database/migrations/20251029000000-create-vaults-table.js';

import type { CreateVaultInput, VaultRecord } from './vault-dtos.js';

type VaultRow = {
  id: string;
  first_name: string;
  last_name: string;
  wrapped_master_key: string;
  kek_version: number;
  created_at: Date | string;
  updated_at: Date | string;
};

const mapRow = (row: VaultRow): VaultRecord => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  wrappedMasterKey: row.wrapped_master_key,
  kekVersion: row.kek_version,
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
  updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
});

export const findByNames = async (
  firstName: string,
  lastName: string,
): Promise<VaultRecord | undefined> => {
  const row = (await db(vaultsTable)
    .whereRaw('lower(first_name) = ? AND lower(last_name) = ?', [
      firstName.toLowerCase(),
      lastName.toLowerCase(),
    ])
    .first()) as VaultRow | undefined;

  return row ? mapRow(row) : undefined;
};

export const createVault = async (input: CreateVaultInput): Promise<VaultRecord> => {
  const [row] = (await db(vaultsTable)
    .insert({
      id: input.id,
      first_name: input.firstName,
      last_name: input.lastName,
      wrapped_master_key: input.wrappedMasterKey,
    })
    .returning('*')) as VaultRow[];

  return mapRow(row);
};
