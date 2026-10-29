export interface VaultRecord {
  id: string;
  firstName: string;
  lastName: string;
  wrappedMasterKey: string;
  kekVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnlockedVault {
  vaultId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  masterKey: string;
}

export interface CreateVaultInput {
  id: string;
  firstName: string;
  lastName: string;
  wrappedMasterKey: string;
}
