import path from "node:path";
import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const inferredRepoRoot = process.cwd();
const defaultSqlitePath = path.join(inferredRepoRoot, ".catalog-data", "catalog.sqlite");
const defaultDocsEnabled = process.env.NODE_ENV !== "production";

const DEFAULT_TYPESENSE_KEY = "change-me-search-key";
const DEFAULT_SNAPSHOT_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const DEFAULT_TOKEN_PEPPER = "local-dev-pepper";
const DEFAULT_SERVICE_TOKENS =
  "reader:dev-read-token:catalog.read,operator:dev-operator-token:catalog.queue|catalog.session|catalog.feed";
const DEFAULT_ADMIN_LOGIN_SECRET = "local-admin-login-secret";
const DEFAULT_ADMIN_SESSION_SECRET = "local-admin-session-secret-change-me";
const DEFAULT_ALLOWED_ORIGINS = [
  "https://hayeer.com",
  "https://www.hayeer.com",
  "https://h-db.site",
  "https://www.h-db.site",
  "https://cf.h-db.site",
].join(",");

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4400),
  CATALOG_BIND_HOST: z.string().min(1).default("127.0.0.1"),
  CATALOG_TRUST_PROXY: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  CATALOG_REPO_ROOT: z.string().min(1).default(inferredRepoRoot),
  CATALOG_API_BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(128 * 1024),
  CATALOG_API_MAX_URL_LENGTH: z.coerce.number().int().positive().default(2048),
  CATALOG_PUBLIC_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  CATALOG_PUBLIC_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  CATALOG_PUBLIC_SEARCH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(40),
  CATALOG_ALLOWED_ORIGINS: z.string().default(DEFAULT_ALLOWED_ORIGINS),
  CATALOG_DOCS_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  CATALOG_DOCS_ENABLED: z
    .string()
    .optional()
    .transform((value) => (value == null ? defaultDocsEnabled : value === "true")),
  CATALOG_OUTBOUND_MAX_RESPONSE_BYTES: z.coerce.number().int().positive().default(5 * 1024 * 1024),
  CATALOG_OUTBOUND_MAX_REDIRECTS: z.coerce.number().int().min(0).max(5).default(3),
  CATALOG_DB_DRIVER: z.enum(["sqlite", "postgres"]).default("sqlite"),
  SQLITE_DATABASE_PATH: z.string().min(1).default(defaultSqlitePath),
  DATABASE_URL: z.string().url().default("postgres://catalog:catalog@localhost:5432/catalog"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
  CATALOG_SEARCH_DRIVER: z.enum(["sqlite", "typesense"]).optional(),
  TYPESENSE_URL: z.string().url().default("http://localhost:8108"),
  TYPESENSE_API_KEY: z.string().min(8).default(DEFAULT_TYPESENSE_KEY),
  STORAGE_BUCKET: z.string().min(1).default("catalog-snapshots"),
  STORAGE_ENDPOINT: z.string().url().optional(),
  STORAGE_REGION: z.string().min(1).default("us-east-1"),
  STORAGE_ACCESS_KEY: z.string().optional(),
  STORAGE_SECRET_KEY: z.string().optional(),
  STORAGE_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  SNAPSHOT_ENCRYPTION_KEY_BASE64: z
    .string()
    .default(DEFAULT_SNAPSHOT_KEY),
  SNAPSHOT_STORAGE_DRIVER: z.enum(["s3", "local"]).default("s3"),
  SNAPSHOT_LOCAL_STORAGE_DIR: z.string().optional(),
  INTERNAL_SERVICE_TOKENS: z.string().default(DEFAULT_SERVICE_TOKENS),
  TOKEN_PEPPER: z.string().min(4).default(DEFAULT_TOKEN_PEPPER),
  INTERNAL_REQUIRE_REQUEST_SIGNATURE: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  INTERNAL_REQUEST_MAX_SKEW_SECONDS: z.coerce.number().int().positive().default(300),
  ADMIN_LOGIN_SECRET: z.string().min(8).default(DEFAULT_ADMIN_LOGIN_SECRET),
  ADMIN_SESSION_SECRET: z.string().min(16).default(DEFAULT_ADMIN_SESSION_SECRET),
  ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().positive().max(168).default(12),
  CATALOG_ALLOW_INSECURE_DEFAULTS: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  PROBE_USER_AGENT: z
    .string()
    .default(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36",
    ),
  QUEUE_PREFIX: z.string().default("iraq_catalog"),
});

const parsedEnv = envSchema.parse(process.env);

export interface CatalogServiceTokenConfig {
  name: string;
  token: string;
  scopes: string[];
}

function parseInternalServiceTokens(raw: string): CatalogServiceTokenConfig[] {
  const tokens = raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry, index) => {
      const [name, token, scopeBlob] = entry.split(":");
      const normalizedName = name?.trim();
      const normalizedToken = token?.trim();
      const scopes = scopeBlob
        ?.split("|")
        .map((scope) => scope.trim())
        .filter(Boolean);
      if (!normalizedName || !normalizedToken || !scopes || scopes.length === 0) {
        throw new Error(
          `INTERNAL_SERVICE_TOKENS entry #${index + 1} must use name:token:scope1|scope2 format.`,
        );
      }
      return {
        name: normalizedName,
        token: normalizedToken,
        scopes,
      };
    });

  if (tokens.length === 0) {
    throw new Error("At least one internal service token must be configured.");
  }

  return tokens;
}

function parseAllowedOrigins(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((origin) => origin.trim().replace(/\/+$/, ""))
        .filter(Boolean),
    ),
  ];
}

const allowInsecureDefaults =
  parsedEnv.CATALOG_ALLOW_INSECURE_DEFAULTS === true || process.env.NODE_ENV === "test";

const parsedServiceTokens = parseInternalServiceTokens(parsedEnv.INTERNAL_SERVICE_TOKENS);
const resolvedSearchDriver =
  parsedEnv.CATALOG_SEARCH_DRIVER ?? (parsedEnv.CATALOG_DB_DRIVER === "sqlite" ? "sqlite" : "typesense");

export const catalogConfig = {
  port: parsedEnv.PORT,
  bindHost: parsedEnv.CATALOG_BIND_HOST,
  trustProxy: parsedEnv.CATALOG_TRUST_PROXY ?? false,
  repoRoot: parsedEnv.CATALOG_REPO_ROOT,
  api: {
    bodyLimitBytes: parsedEnv.CATALOG_API_BODY_LIMIT_BYTES,
    maxUrlLength: parsedEnv.CATALOG_API_MAX_URL_LENGTH,
  },
  docs: {
    enabled: parsedEnv.CATALOG_DOCS_ENABLED ?? defaultDocsEnabled,
    rateLimitMax: parsedEnv.CATALOG_DOCS_RATE_LIMIT_MAX,
  },
  publicRateLimit: {
    max: parsedEnv.CATALOG_PUBLIC_RATE_LIMIT_MAX,
    windowMs: parsedEnv.CATALOG_PUBLIC_RATE_LIMIT_WINDOW_MS,
    searchMax: parsedEnv.CATALOG_PUBLIC_SEARCH_RATE_LIMIT_MAX,
  },
  cors: {
    allowedOrigins: parseAllowedOrigins(parsedEnv.CATALOG_ALLOWED_ORIGINS),
  },
  outbound: {
    maxResponseBytes: parsedEnv.CATALOG_OUTBOUND_MAX_RESPONSE_BYTES,
    maxRedirects: parsedEnv.CATALOG_OUTBOUND_MAX_REDIRECTS,
  },
  databaseUrl: parsedEnv.DATABASE_URL,
  sqliteDatabasePath: parsedEnv.SQLITE_DATABASE_PATH,
  database: {
    driver: parsedEnv.CATALOG_DB_DRIVER,
    url: parsedEnv.DATABASE_URL,
    sqlitePath: parsedEnv.SQLITE_DATABASE_PATH,
  },
  search: {
    driver: resolvedSearchDriver,
  },
  redisUrl: parsedEnv.REDIS_URL,
  typesense: {
    url: parsedEnv.TYPESENSE_URL,
    apiKey: parsedEnv.TYPESENSE_API_KEY,
    collectionName: "catalog_products",
  },
  storage: {
    bucket: parsedEnv.STORAGE_BUCKET,
    endpoint: parsedEnv.STORAGE_ENDPOINT,
    region: parsedEnv.STORAGE_REGION,
    accessKey: parsedEnv.STORAGE_ACCESS_KEY,
    secretKey: parsedEnv.STORAGE_SECRET_KEY,
    forcePathStyle: parsedEnv.STORAGE_FORCE_PATH_STYLE ?? false,
    driver: parsedEnv.SNAPSHOT_STORAGE_DRIVER,
    localStorageDir: parsedEnv.SNAPSHOT_LOCAL_STORAGE_DIR,
  },
  internalServiceTokens: parsedServiceTokens,
  tokenPepper: parsedEnv.TOKEN_PEPPER,
  requireSignedInternalRequests: parsedEnv.INTERNAL_REQUIRE_REQUEST_SIGNATURE ?? true,
  requestMaxSkewSeconds: parsedEnv.INTERNAL_REQUEST_MAX_SKEW_SECONDS,
  admin: {
    loginSecret: parsedEnv.ADMIN_LOGIN_SECRET,
    sessionSecret: parsedEnv.ADMIN_SESSION_SECRET,
    sessionTtlHours: parsedEnv.ADMIN_SESSION_TTL_HOURS,
  },
  probeUserAgent: parsedEnv.PROBE_USER_AGENT,
  queuePrefix: parsedEnv.QUEUE_PREFIX,
  snapshotEncryptionKey: Buffer.from(parsedEnv.SNAPSHOT_ENCRYPTION_KEY_BASE64, "base64"),
} as const;

if (catalogConfig.snapshotEncryptionKey.byteLength !== 32) {
  throw new Error("SNAPSHOT_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes.");
}

if (!allowInsecureDefaults) {
  const errors: string[] = [];
  if (resolvedSearchDriver === "typesense" && parsedEnv.TYPESENSE_API_KEY === DEFAULT_TYPESENSE_KEY) {
    errors.push("TYPESENSE_API_KEY must be replaced with a strong secret.");
  }
  if (parsedEnv.SNAPSHOT_ENCRYPTION_KEY_BASE64 === DEFAULT_SNAPSHOT_KEY) {
    errors.push("SNAPSHOT_ENCRYPTION_KEY_BASE64 must be replaced with a strong 32-byte base64 key.");
  }
  if (parsedEnv.TOKEN_PEPPER === DEFAULT_TOKEN_PEPPER) {
    errors.push("TOKEN_PEPPER must be replaced with a strong secret.");
  }
  if (parsedEnv.INTERNAL_SERVICE_TOKENS === DEFAULT_SERVICE_TOKENS) {
    errors.push("INTERNAL_SERVICE_TOKENS must be replaced with scoped runtime tokens.");
  }
  if (parsedEnv.ADMIN_LOGIN_SECRET === DEFAULT_ADMIN_LOGIN_SECRET) {
    errors.push("ADMIN_LOGIN_SECRET must be replaced with a strong admin login secret.");
  }
  if (parsedEnv.ADMIN_SESSION_SECRET === DEFAULT_ADMIN_SESSION_SECRET) {
    errors.push("ADMIN_SESSION_SECRET must be replaced with a strong admin session secret.");
  }
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}

export function assertProductionTrustProxy(options: { nodeEnv: string | undefined; trustProxy: boolean }) {
  if (options.nodeEnv === "production" && !options.trustProxy) {
    throw new Error(
      "CATALOG_TRUST_PROXY=true is required in production so Cloudflare/nginx client IPs are used for auth rate limits and audit logs.",
    );
  }
}

assertProductionTrustProxy({ nodeEnv: process.env.NODE_ENV, trustProxy: catalogConfig.trustProxy });
