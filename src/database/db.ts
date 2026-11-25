import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import knex from 'knex';

import { config } from '../config.js';

import type { Knex } from 'knex';

const fileName = fileURLToPath(import.meta.url);
const dirName = dirname(fileName);

const sslConfig =
  config.database.ssl === 'disable'
    ? undefined
    : {
        rejectUnauthorized: config.database.ssl === 'verify-full',
        ...(config.database.sslCa ? { ca: config.database.sslCa } : {}),
      };

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
    ...(sslConfig ? { ssl: sslConfig } : {}),
  },
  pool: {
    min: config.database.poolMin,
    max: config.database.poolMax,
    acquireTimeoutMillis: config.database.connectionTimeoutMs,
  },
};

export const db = knex(knexConfig);
