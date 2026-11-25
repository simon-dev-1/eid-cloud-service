import { z } from 'zod';

// ─── swiyu integration defaults (overridable via environment) ───────────────
// These are the Beta-ID (BCS) integration values. Production must override them
// with the values issued by the swiyu production trust infrastructure.

// Beta-ID (BCS) issuer DID. The BCS re-onboarded to a new `did:webvh` DID
// (verified from the live BCS issuer metadata at bcs.admin.ch).
const betaIdIssuerDid =
  'did:webvh:QmdPxnNc9MzGYZ6qcHuvi8YpDVYWW7mmefnCTPcKapNEL5:identifier-reg.trust-infra.swiyu-int.admin.ch:api:v1:did:5f8a3c95-1772-4ebf-ada0-c88bafb258e1';

// Legacy `did:tdw` DID kept so Beta-IDs issued before the migration still verify.
const legacyBetaIdIssuerDid =
  'did:tdw:QmPEZPhDFR4nEYSFK5bMnvECqdpf1tPTPJuWs9QrMjCumw:identifier-reg.trust-infra.swiyu-int.admin.ch:api:v1:did:9a5559f0-b81c-4368-a170-e7b4ae424527';

// The BCS migrated the Beta-ID credential type from `betaid-sdjwt` to
// `urn:vct:ch.admin.bcs.betaid`; accept both while older credentials are around.
const defaultCredentialVcts = ['betaid-sdjwt', 'urn:vct:ch.admin.bcs.betaid'];

// ─── Environment schema ──────────────────────────────────────────────────────

const logLevels = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'] as const;

const booleanFromEnv = (defaultValue: boolean) =>
  z
    .preprocess((value) => {
      if (typeof value === 'boolean') {
        return value;
      }
      if (value === 'true' || value === '1') {
        return true;
      }
      if (value === 'false' || value === '0') {
        return false;
      }
      return value;
    }, z.boolean())
    .default(defaultValue);

const csvList = (defaultValue: string[]) =>
  z
    .string()
    .optional()
    .transform((value) => {
      if (!value || value.trim().length === 0) {
        return defaultValue;
      }
      return value
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0);
    });

const envSchema = z.object({
  ENVIRONMENT: z.enum(['local', 'sandbox', 'production']).default('local'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(logLevels).default('info'),
  APP_ORIGIN: z.string().trim().optional(),

  HTTP_TRUST_PROXY: booleanFromEnv(false),
  HTTP_RATE_LIMIT_ENABLED: booleanFromEnv(true),
  HTTP_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  HTTP_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(1000),
  HTTP_RATE_LIMIT_VERIFICATION_MAX: z.coerce.number().int().positive().default(10),
  HTTP_RATE_LIMIT_UPLOAD_MAX: z.coerce.number().int().positive().default(30),

  POSTGRES_HOST: z.string().min(1).default('localhost'),
  POSTGRES_PORT: z.coerce.number().int().positive().default(5432),
  POSTGRES_USER: z.string().min(1).default('eid'),
  POSTGRES_PASSWORD: z.string().min(1).default('eid'),
  POSTGRES_DATABASE: z.string().min(1).default('eid'),
  POSTGRES_SSL: z.enum(['disable', 'require', 'verify-full']).default('disable'),
  POSTGRES_SSL_CA: z.string().optional(),
  POSTGRES_POOL_MIN: z.coerce.number().int().min(0).default(1),
  POSTGRES_POOL_MAX: z.coerce.number().int().min(1).default(10),
  POSTGRES_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

  STORAGE_DRIVER: z.enum(['disk', 's3']).default('disk'),
  STORAGE_DIR: z.string().default('./storage'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('ch-gva-2'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: booleanFromEnv(true),

  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(10485760),

  SWIYU_VERIFIER_BASE_URL: z.string().url().default('http://localhost:8083'),
  SWIYU_VERIFIER_ISSUER_DID: z.string().min(1).optional(),
  SWIYU_VERIFIER_LEGACY_ISSUER_DID: z.string().min(1).optional(),
  SWIYU_VERIFIER_CREDENTIAL_ID: z.string().min(1).default('identity_credential'),
  SWIYU_VERIFIER_CREDENTIAL_VCTS: csvList(defaultCredentialVcts),
  SWIYU_MANAGEMENT_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

  VQPS_SCOPE: z.string().min(1).default('com.example.identityCardCredential_presentation'),
  VQPS_PURPOSE_NAME: z.string().min(1).default('name verification'),
  VQPS_PURPOSE_DESCRIPTION: z
    .string()
    .default('This purpose allows verification of name for a test'),

  // Secrets default to empty at parse time so non-API processes (e.g. the
  // `migrate` service) can load config without them. `validateConfig()` enforces
  // their presence/strength when the API actually starts.
  SESSION_SECRET: z.string().default(''),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
  SESSION_COOKIE_NAME: z.string().min(1).default('eid_session'),

  SERVER_KEK: z.string().default(''),
});

// ─── Config type ─────────────────────────────────────────────────────────────

export interface Config {
  env: 'local' | 'sandbox' | 'production';
  port: number;
  logLevel: string;
  appOrigin?: string;
  http: {
    trustProxy: boolean;
    rateLimit: {
      enabled: boolean;
      windowMs: number;
      max: number;
      verificationMax: number;
      uploadMax: number;
    };
  };
  database: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    ssl: 'disable' | 'require' | 'verify-full';
    sslCa?: string;
    poolMin: number;
    poolMax: number;
    connectionTimeoutMs: number;
  };
  storage: {
    driver: 'disk' | 's3';
    dir: string;
    s3: {
      endpoint?: string;
      region: string;
      bucket?: string;
      accessKeyId?: string;
      secretAccessKey?: string;
      forcePathStyle: boolean;
    };
  };
  maxUploadBytes: number;
  swiyu: {
    verifierBaseUrl: string;
    issuerDid: string;
    legacyIssuerDid: string;
    credentialId: string;
    credentialVcts: string[];
    managementTimeoutMs: number;
  };
  verification: {
    scope: string;
    purposeName: string;
    purposeDescription: string;
  };
  session: {
    secret: string;
    ttlSeconds: number;
    cookieName: string;
  };
  vault: {
    kek: string;
  };
}

// ─── Loading & validation ────────────────────────────────────────────────────

function loadConfigFromEnv(): Config {
  const env = envSchema.parse(process.env);

  return {
    env: env.ENVIRONMENT,
    port: env.PORT,
    logLevel: env.LOG_LEVEL,
    appOrigin: env.APP_ORIGIN,
    http: {
      trustProxy: env.HTTP_TRUST_PROXY,
      rateLimit: {
        enabled: env.HTTP_RATE_LIMIT_ENABLED,
        windowMs: env.HTTP_RATE_LIMIT_WINDOW_MS,
        max: env.HTTP_RATE_LIMIT_MAX,
        verificationMax: env.HTTP_RATE_LIMIT_VERIFICATION_MAX,
        uploadMax: env.HTTP_RATE_LIMIT_UPLOAD_MAX,
      },
    },
    database: {
      host: env.POSTGRES_HOST,
      port: env.POSTGRES_PORT,
      user: env.POSTGRES_USER,
      password: env.POSTGRES_PASSWORD,
      database: env.POSTGRES_DATABASE,
      ssl: env.POSTGRES_SSL,
      sslCa: env.POSTGRES_SSL_CA,
      poolMin: env.POSTGRES_POOL_MIN,
      poolMax: env.POSTGRES_POOL_MAX,
      connectionTimeoutMs: env.POSTGRES_CONNECTION_TIMEOUT_MS,
    },
    storage: {
      driver: env.STORAGE_DRIVER,
      dir: env.STORAGE_DIR,
      s3: {
        endpoint: env.S3_ENDPOINT,
        region: env.S3_REGION,
        bucket: env.S3_BUCKET,
        accessKeyId: env.S3_ACCESS_KEY_ID,
        secretAccessKey: env.S3_SECRET_ACCESS_KEY,
        forcePathStyle: env.S3_FORCE_PATH_STYLE,
      },
    },
    maxUploadBytes: env.MAX_UPLOAD_BYTES,
    swiyu: {
      verifierBaseUrl: env.SWIYU_VERIFIER_BASE_URL,
      issuerDid: env.SWIYU_VERIFIER_ISSUER_DID ?? betaIdIssuerDid,
      legacyIssuerDid: env.SWIYU_VERIFIER_LEGACY_ISSUER_DID ?? legacyBetaIdIssuerDid,
      credentialId: env.SWIYU_VERIFIER_CREDENTIAL_ID,
      credentialVcts: env.SWIYU_VERIFIER_CREDENTIAL_VCTS,
      managementTimeoutMs: env.SWIYU_MANAGEMENT_TIMEOUT_MS,
    },
    verification: {
      scope: env.VQPS_SCOPE,
      purposeName: env.VQPS_PURPOSE_NAME,
      purposeDescription: env.VQPS_PURPOSE_DESCRIPTION,
    },
    session: {
      secret: env.SESSION_SECRET,
      ttlSeconds: env.SESSION_TTL_SECONDS,
      cookieName: env.SESSION_COOKIE_NAME,
    },
    vault: {
      kek: env.SERVER_KEK,
    },
  };
}

export const config: Config = loadConfigFromEnv();

type DeepPartial<T> = T extends unknown[]
  ? T
  : T extends object
    ? { [P in keyof T]?: DeepPartial<T[P]> }
    : T;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Deep-merges `source` into `target` in place, so callers can override a single
 * nested field without having to reconstruct the whole config object.
 */
function deepMergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = target[key];
    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      deepMergeInto(targetValue, sourceValue);
    } else {
      target[key] = sourceValue;
    }
  }
}

function setConfig(newConfig: DeepPartial<Config>): void {
  deepMergeInto(
    config as unknown as Record<string, unknown>,
    newConfig as unknown as Record<string, unknown>,
  );
}

/**
 * Runtime semantic validation that must run at startup (not at import time, so
 * tests importing `config`/`app` are not coupled to the secret format). Fails
 * fast on obviously misconfigured production setups.
 */
function validateConfig(): void {
  const problems: string[] = [];

  if (config.session.secret.length < 32) {
    problems.push('SESSION_SECRET must be at least 32 characters');
  }

  const kek = Buffer.from(config.vault.kek, 'base64');
  if (config.vault.kek.length === 0 || kek.length !== 32) {
    problems.push('SERVER_KEK must be a base64-encoded 32-byte key');
  }

  if (config.env !== 'local') {
    if (!config.appOrigin) {
      problems.push('APP_ORIGIN is required when ENVIRONMENT is not "local"');
    } else if (!/^https:\/\//.test(config.appOrigin)) {
      problems.push('APP_ORIGIN must be an https URL outside of "local"');
    }
  }

  if (config.storage.driver === 's3') {
    const { endpoint, bucket, accessKeyId, secretAccessKey } = config.storage.s3;
    if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
      problems.push(
        'STORAGE_DRIVER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY',
      );
    }
  }

  if (problems.length > 0) {
    throw new Error(`Invalid configuration:\n- ${problems.join('\n- ')}`);
  }
}

export { setConfig, validateConfig };
