/* istanbul ignore file */
import { filesTable } from './20251028000000-create-files-table.js';

import type { Knex } from 'knex';

const indexName = 'files_vault_id_index';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable(filesTable, (table) => {
    table.index(['vault_id'], indexName);
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.alterTable(filesTable, (table) => {
    table.dropIndex(['vault_id'], indexName);
  });
};
