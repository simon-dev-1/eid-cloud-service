/* istanbul ignore file */
import { filesTable } from './20251028000000-create-files-table.js';
import { vaultsTable } from './20251029000000-create-vaults-table.js';

import type { Knex } from 'knex';

export const up = async (knex: Knex): Promise<void> => {
  // Nullable: pre-existing rows (before vaults existed) are not backfilled and become
  // inaccessible, since every query now scopes by vault id. Acceptable for the beta.
  await knex.schema.alterTable(filesTable, (table) => {
    table.uuid('vault_id').nullable().references('id').inTable(vaultsTable).onDelete('CASCADE');
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable(filesTable, (table) => {
    table.dropColumn('vault_id');
  });
};
