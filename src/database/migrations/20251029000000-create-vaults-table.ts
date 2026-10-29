/* istanbul ignore file */
import type { Knex } from 'knex';

export const vaultsTable = 'vaults';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable(vaultsTable, (table) => {
    table.uuid('id').primary();
    table.text('first_name').notNullable();
    table.text('last_name').notNullable();
    table.text('wrapped_master_key').notNullable();
    table.integer('kek_version').notNullable().defaultTo(1);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    `CREATE UNIQUE INDEX ${vaultsTable}_name_unique ON ${vaultsTable} (lower(first_name), lower(last_name))`,
  );
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists(vaultsTable);
};
