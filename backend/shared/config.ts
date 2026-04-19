import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const inferredRepoRoot = process.cwd();

const DEFAULT_TYPESENSE_KEY = "change-me-search-key";
const DEFAULT_SNAPSHOT_KEY = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const DEFAULT_TOKEN_PEPPER = "local-dev-pepper";
const DEFAULT_SERVICE_TOKENS =
  "reader:dev-read-token:catalog.read,operator:dev-operator-token:catalog.queue|catalog.session|catalog.feed";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4400),
  CATALOG_BIND_HOST: z.string().min(1).default("127.0.0.1"),
  CATALOG_REPO_ROOT: z.string().min(1).default(inferredRepoRoot),
  DATABASE_URL: z.string().url().default("postgres://catalog:catalog@localhost:5432/catalog"),
  REDIS_URL: z.string().url().default("redis://localhost:6379"),
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
  CATALOG_ALLOW_INSECURE_DEFAULTS: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  PROBE_USER_AGENT: z.string().default("IraqCatalogBot/0.1 (+internal)"),
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

const allowInsecureDefaults =
  parsedEnv.CATALOG_ALLOW_INSECURE_DEFAULTS === true || process.env.NODE_ENV === "test";

const parsedServiceTokens = parseInternalServiceTokens(parsedEnv.INTERNAL_SERVICE_TOKENS);

export const catalogConfig = {
  port: parsedEnv.PORT,
  bindHost: parsedEnv.CATALOG_BIND_HOST,
  repoRoot: parsedEnv.CATALOG_REPO_ROOT,
  databaseUrl: parsedEnv.DATABASE_URL,
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
  probeUserAgent: parsedEnv.PROBE_USER_AGENT,
  queuePrefix: parsedEnv.QUEUE_PREFIX,
  snapshotEncryptionKey: Buffer.from(parsedEnv.SNAPSHOT_ENCRYPTION_KEY_BASE64, "base64"),
} as const;

if (catalogConfig.snapshotEncryptionKey.byteLength !== 32) {
  throw new Error("SNAPSHOT_ENCRYPTION_KEY_BASE64 must decode to exactly 32 bytes.");
}

if (!allowInsecureDefaults) {
  const errors: string[] = [];
  if (parsedEnv.TYPESENSE_API_KEY === DEFAULT_TYPESENSE_KEY) {
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
  if (errors.length > 0) {
    throw new Error(errors.join(" "));
  }
}
