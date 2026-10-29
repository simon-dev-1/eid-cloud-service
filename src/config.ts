import env from 'env-var';

// Beta-ID (BCS) issuer DID from the swiyu verifier cookbook. Used as the accepted issuer for
// name verification until a stable, configured issuer is required.
// Note: the BCS migrated its DID method from `did:tdw` (deprecated) to `did:webvh`; the SCID and
// UUID are unchanged, only the method identifier differs.
const betaIdIssuerDid =
  'did:webvh:QmPEZPhDFR4nEYSFK5bMnvECqdpf1tPTPJuWs9QrMjCumw:identifier-reg.trust-infra.swiyu-int.admin.ch:api:v1:did:9a5559f0-b81c-4368-a170-e7b4ae424527';

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
  swiyu: {
    verifierBaseUrl: env.get('SWIYU_VERIFIER_BASE_URL').default('http://localhost:8083').asString(),
    issuerDid: env.get('SWIYU_VERIFIER_ISSUER_DID').default(betaIdIssuerDid).asString(),
  },
  verification: {
    scope: env
      .get('VQPS_SCOPE')
      .default('com.example.identityCardCredential_presentation')
      .asString(),
    purposeName: env.get('VQPS_PURPOSE_NAME').default('name verification').asString(),
    purposeDescription: env
      .get('VQPS_PURPOSE_DESCRIPTION')
      .default('This purpose allows verification of name for a test')
      .asString(),
  },
  session: {
    secret: env.get('SESSION_SECRET').required().asString(),
    ttlSeconds: env.get('SESSION_TTL_SECONDS').default(1800).asIntPositive(),
    cookieName: 'eid_session',
  },
  vault: {
    kek: env.get('SERVER_KEK').required().asString(),
  },
};

function setConfig(newConfig: Partial<typeof config>): void {
  Object.assign(config, newConfig);
}

export { config, setConfig };
