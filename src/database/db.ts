import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import knex from 'knex';

import { config } from '../config.js';

import type { Knex } from 'knex';

const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);

export const knexConfig: Knex.Config = {
  client: 'pg',
  migrations: {
    directory: join(dirName, 'migrations'),
  },
  connection: {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: config.database.database,
  },
  pool: {
    min: 1,
    max: 10,
  },
};

export const db = knex(knexConfig);
