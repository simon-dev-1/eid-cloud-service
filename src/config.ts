import env from 'env-var';

const config = {
  env: env.get('ENVIRONMENT').required().asString(),
  port: env.get('PORT').default(3000).asPortNumber(),
  logLevel: env.get('LOG_LEVEL').default('info').asString(),
  database: {
    host: env.get('POSTGRES_HOST').required().asString(),
    port: env.get('POSTGRES_PORT').default(5432).asPortNumber(),
    user: env.get('POSTGRES_USER').required().asString(),
    password: env.get('POSTGRES_PASSWORD').required().asString(),
    database: env.get('POSTGRES_DATABASE').required().asString(),
  },
  storage: {
    dir: env.get('STORAGE_DIR').default('./storage').asString(),
  },
  maxUploadBytes: env.get('MAX_UPLOAD_BYTES').default(10485760).asIntPositive(),
};

function setConfig(newConfig: Partial<typeof config>): void {
  Object.assign(config, newConfig);
}

export { config, setConfig };
