import { randomUUID } from 'node:crypto';

import * as vaultDao from './vault-dao.js';
import { generateMasterKey, unwrapMasterKey, wrapMasterKey } from '../../utils/crypto.js';

import type { UnlockedVault } from './vault-dtos.js';

const trimName = (name: string): string => name.trim();

/**
 * Resolves (or creates) the vault bound to the verified first/last name and returns its master
 * key. Name matching is case-insensitive; the vault is created on first successful verification.
 */
export const unlockByName = async (firstName: string, lastName: string): Promise<UnlockedVault> => {
  const trimmedFirst = trimName(firstName);
  const trimmedLast = trimName(lastName);

  let record = await vaultDao.findByNames(trimmedFirst, trimmedLast);
  if (!record) {
    record = await vaultDao.createVault({
      id: randomUUID(),
      firstName: trimmedFirst,
      lastName: trimmedLast,
      wrappedMasterKey: wrapMasterKey(generateMasterKey()),
    });
  }

  const masterKey = unwrapMasterKey(record.wrappedMasterKey).toString('base64');

  return {
    vaultId: record.id,
    firstName: record.firstName,
    lastName: record.lastName,
    displayName: `${record.firstName} ${record.lastName}`,
    masterKey,
  };
};
