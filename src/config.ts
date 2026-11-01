import env from 'env-var';

// Beta-ID (BCS) issuer DID. The BCS re-onboarded to a new `did:webvh` DID (verified from the
// live BCS issuer metadata at bcs.admin.ch); the old `did:tdw` DID is deprecated/frozen.
const betaIdIssuerDid =
  'did:webvh:QmdPxnNc9MzGYZ6qcHuvi8YpDVYWW7mmefnCTPcKapNEL5:identifier-reg.trust-infra.swiyu-int.admin.ch:api:v1:did:5f8a3c95-1772-4ebf-ada0-c88bafb258e1';

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
