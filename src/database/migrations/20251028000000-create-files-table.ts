/* istanbul ignore file */
import type { Knex } from 'knex';

export const filesTable = 'files';

export const up = async (knex: Knex): Promise<void> => {
  await knex.schema.createTable(filesTable, (table) => {
    table.uuid('id').primary();
    table.text('storage_key').notNullable();
    table.text('original_name').notNullable();
    table.text('content_type').notNullable();
    table.bigInteger('size').notNullable();
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

export const down = async (knex: Knex): Promise<void> => {
  await knex.schema.dropTableIfExists(filesTable);
};
