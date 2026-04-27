import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";
import type { CatalogContext } from "../shared/bootstrap.js";
import { createCatalogContext } from "../shared/bootstrap.js";
import { catalogConfig } from "../shared/config.js";
import { createApiCatalogJobQueue, type CatalogJobQueue } from "../worker/queues.js";
import { TokenRateLimiter } from "../shared/security/rateLimiter.js";
import {
  ADMIN_CSRF_HEADER,
  clearAdminSessionCookie,
  createAdminSessionCookie,
  createInternalAuth,
  readAdminSessionState,
  requireCatalogScopes,
} from "./auth.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";
import { CurrentCatalogSyncService } from "../shared/services/currentCatalogSyncService.js";
import { ManualStoreIntakeService } from "../shared/services/manualStoreIntakeService.js";
import { getProductPullCounts } from "../shared/services/productPullService.js";
import { createId, nowIso } from "../shared/catalog/normalization.js";
import { openCatalogSqlite } from "../shared/db/sqliteSupport.js";
import type { StoreRecord } from "../shared/catalog/types.js";
import { DEFAULT_SITE_SETTINGS, normalizeSiteSettingsPayload } from "../shared/siteSettings.js";
import { catalogRouteSchemas, registerSwaggerInternal } from "./swagger.js";
import {
  buildPublicBootstrap,
  buildPublicBootstrapLite,
  buildPublicCatalogProducts,
  buildPublicBrandDetail,
  buildPublicBrandProducts,
  buildPublicBrandSummary,
  buildPublicProductDetail,
  buildPublicProductFull,
  buildPublicProductOffers,
  buildPublicProductsByIds,
  buildPublicStoreDetail,
  buildPublicStoreProducts,
  buildPublicStoreSummary,
  buildPublicUnifiedSearch,
  getPublicCity,
  listPublicCities,
} from "./publicCatalog.js";

export type CatalogApiRuntimeMode =
  | "full_sqlite_api"
  | "full_postgres_api"
  | "memory_api"
  | "memory_subset_api";

export interface CatalogApiRuntimeMetadata {
  mode: CatalogApiRuntimeMode;
  scopedStoreIds?: string[];
}

type ProductPullJobStatus = "queued" | "running" | "completed" | "failed";

type CatalogJobKind =
  | "product-pull"
  | "store-url-pull"
  | "store-by-store-update"
  | "identity-reindex"
  | "quality-audit";

interface CatalogJobRecord {
  id: string;
  kind: CatalogJobKind;
  status: ProductPullJobStatus;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  args: Record<string, unknown>;
  progress?: {
    completedStores: number;
    totalStores: number;
    lastStoreId?: string;
    lastStoreName?: string;
    lastStatus?: string;
  };
  result?: unknown;
  error?: string;
}

const catalogJobs = new Map<string, CatalogJobRecord>();
const MAX_CATALOG_JOBS = 80;

const CORS_ALLOWED_HEADERS = [
  "authorization",
  "content-type",
  "x-catalog-timestamp",
  "x-catalog-nonce",
  "x-catalog-signature",
  ADMIN_CSRF_HEADER,
  "x-requested-with",
];

function isAllowedCorsOrigin(origin: string | undefined) {
  if (!origin) return false;
  return catalogConfig.cors.allowedOrigins.includes(origin.replace(/\/+$/, ""));
}

function safeEqualSecret(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.byteLength === right.byteLength && timingSafeEqual(left, right);
}

function createCatalogJob(kind: CatalogJobKind, args: Record<string, unknown>): CatalogJobRecord {
  pruneCatalogJobs();
  const id = `job_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  const job: CatalogJobRecord = {
    id,
    kind,
    status: "queued",
    createdAt: new Date().toISOString(),
    args,
  };
  catalogJobs.set(id, job);
  return job;
}

function pruneCatalogJobs() {
  if (catalogJobs.size < MAX_CATALOG_JOBS) return;
  const removable = [...catalogJobs.values()]
    .filter((job) => job.status === "completed" || job.status === "failed")
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const job of removable.slice(0, Math.max(1, catalogJobs.size - MAX_CATALOG_JOBS + 1))) {
    catalogJobs.delete(job.id);
  }
}

function startCatalogJob(job: CatalogJobRecord, runner: () => Promise<unknown>) {
  void (async () => {
    job.status = "running";
    job.startedAt = new Date().toISOString();
    try {
      job.result = await runner();
      job.status = "completed";
      job.finishedAt = new Date().toISOString();
    } catch (error) {
      job.status = "failed";
      job.finishedAt = new Date().toISOString();
      job.error = error instanceof Error ? error.message : "unknown_catalog_job_error";
    }
  })();
}

function readSqliteCatalogQualitySummary() {
  if (catalogConfig.database.driver !== "sqlite") return null;
  const db = openCatalogSqlite(catalogConfig.database.sqlitePath);
  const count = (sql: string) => Number((db.prepare(sql).get() as { c?: number | bigint } | undefined)?.c ?? 0);
  return {
    generatedAt: new Date().toISOString(),
    database: {
      driver: catalogConfig.database.driver,
      configured: true,
    },
    counts: {
      stores: count("SELECT COUNT(*) AS c FROM stores"),
      catalogProducts: count("SELECT COUNT(*) AS c FROM catalog_products"),
      searchDocuments: count("SELECT COUNT(*) AS c FROM search_documents"),
      indexedStores: count("SELECT COUNT(*) AS c FROM store_size_summaries WHERE indexed_product_count > 0"),
    },
    quality: {
      productsMissingImage: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products
        WHERE (image_url IS NULL OR image_url = '')
          AND (primary_image_url IS NULL OR primary_image_url = '')
          AND (images_json IS NULL OR images_json = '' OR images_json = '[]')
      `),
      productsMissingPrice: count("SELECT COUNT(*) AS c FROM catalog_products WHERE live_price IS NULL OR live_price <= 0"),
      productsMissingBrand: count("SELECT COUNT(*) AS c FROM catalog_products WHERE brand IS NULL OR brand = ''"),
      productsMissingSearchDocument: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products p
        LEFT JOIN search_documents sd ON sd.id = p.store_id || ':' || p.source_product_id
        WHERE sd.id IS NULL
      `),
      searchDocumentsMissingCatalogProduct: count(`
        SELECT COUNT(*) AS c
        FROM search_documents sd
        LEFT JOIN catalog_products p ON sd.id = p.store_id || ':' || p.source_product_id
        WHERE p.source_product_id IS NULL
      `),
      productsUnsupportedCurrency: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products
        WHERE currency IS NOT NULL
          AND currency != ''
          AND upper(currency) NOT IN ('IQD', 'USD')
      `),
      productsTinyIqdPrice: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products
        WHERE upper(COALESCE(currency, 'IQD')) = 'IQD'
          AND live_price IS NOT NULL
          AND live_price > 0
          AND live_price < 1000
      `),
      productsBlockedOfferDomain: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products
        WHERE source_url LIKE '%almatajiralthalath.com%'
           OR source_url LIKE '%apple.com/%'
           OR source_url LIKE '%samsung.com/%'
           OR source_url LIKE '%lg.com/%'
           OR source_url LIKE '%hikvision.com/%'
      `),
    },
  };
}

const STORE_STATUSES = new Set<StoreRecord["status"]>([
  "discovered",
  "probe_pending",
  "indexable",
  "indexed",
  "social_only",
  "blocked",
  "failed",
]);

export async function createCatalogApiServer(
  providedContext?: CatalogContext,
  providedQueue?: CatalogJobQueue,
  runtimeMetadata?: CatalogApiRuntimeMetadata,
) {
  const usesInjectedContext = Boolean(providedContext);
  const context = providedContext ?? (await createCatalogContext());
  const resolvedRuntimeMetadata = runtimeMetadata ?? {
    mode: catalogConfig.database.driver === "sqlite" ? "full_sqlite_api" : "full_postgres_api",
    scopedStoreIds: undefined,
  };
  await context.discoveryService.rescan("bootstrap");
  const queue =
    providedQueue ??
    await createApiCatalogJobQueue();
  const auth = createInternalAuth(context.repository);
  const rateLimiter = new TokenRateLimiter();
  const refreshService = new CatalogRefreshService(
    context.repository,
    context.discoveryService,
    context.probeService,
    context.syncService,
    context.coverageService,
  );
  const manualStoreIntakeService = new ManualStoreIntakeService(
    context.repository,
    refreshService,
  );
  const currentCatalogSyncService = new CurrentCatalogSyncService(
    context.repository,
    refreshService,
  );

  const app = Fastify({
    logger: true,
    bodyLimit: catalogConfig.api.bodyLimitBytes,
    trustProxy: catalogConfig.trustProxy,
    routerOptions: {
      maxParamLength: 256,
    },
  });
  await app.register(cors, {
    origin: (origin, callback) => {
      callback(null, origin && isAllowedCorsOrigin(origin) ? origin : false);
    },
    credentials: true,
    allowedHeaders: CORS_ALLOWED_HEADERS,
    methods: ["GET", "HEAD", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    maxAge: 86_400,
    strictPreflight: false,
  });

  await app.register(rateLimit, {
    global: false,
    keyGenerator: (request) => request.ip,
  });
  const docsRateLimit = app.rateLimit({
    max: catalogConfig.docs.rateLimitMax,
    timeWindow: catalogConfig.publicRateLimit.windowMs,
  });
  if (catalogConfig.docs.enabled) {
    await registerSwaggerInternal(app, {
      docsPreHandler: docsRateLimit,
    });
  }
  const helmetStatics = helmet as unknown as {
    contentSecurityPolicy: {
      getDefaultDirectives(): Record<string, string[]>;
    };
  };
  await app.register(helmet, (instance) => ({
    contentSecurityPolicy: catalogConfig.docs.enabled
      ? {
          directives: {
            ...helmetStatics.contentSecurityPolicy.getDefaultDirectives(),
            "form-action": ["'self'"],
            "img-src": ["'self'", "data:", "validator.swagger.io"],
            "script-src": ["'self'"],
            "style-src": ["'self'", "https:"],
          },
        }
      : undefined,
  }));
  const publicReadRateLimit = app.rateLimit({
    max: catalogConfig.publicRateLimit.max,
    timeWindow: catalogConfig.publicRateLimit.windowMs,
  });
  const publicSearchRateLimit = app.rateLimit({
    max: catalogConfig.publicRateLimit.searchMax,
    timeWindow: catalogConfig.publicRateLimit.windowMs,
  });
  const adminLoginRateLimit = app.rateLimit({
    max: 6,
    timeWindow: 10 * 60_000,
  });
  const publicResponseCache = new Map<
    string,
    { expiresAt: number; resolved: boolean; value: unknown; pending?: Promise<unknown> }
  >();

  const getPublicCacheControl = (url: string) => {
    if (/^\/public\/healthz(?:\?|$)/.test(url)) return "no-store";
    if (
      /^\/public\/home(?:\?|$)/.test(url) ||
      /^\/public\/bootstrap-lite(?:\?|$)/.test(url) ||
      /^\/public\/bootstrap(?:\?|$)/.test(url) ||
      /^\/public\/settings\/site(?:\?|$)/.test(url) ||
      /^\/public\/search(?:\?|$)/.test(url) ||
      /^\/public\/catalog-products(?:\?|$)/.test(url) ||
      /^\/public\/stores\/[^/]+\/products(?:\?|$)/.test(url) ||
      /^\/public\/brands\/[^/]+\/products(?:\?|$)/.test(url) ||
      /^\/public\/products\/by-ids(?:\?|$)/.test(url) ||
      /^\/public\/products\/[^/]+\/full(?:\?|$)/.test(url) ||
      /^\/public\/products\/[^/]+\/offers(?:\?|$)/.test(url)
    ) {
      return /^\/public\/home(?:\?|$)|^\/public\/bootstrap-lite(?:\?|$)/.test(url)
        ? "public, max-age=300, stale-while-revalidate=900"
        : "public, max-age=30, stale-while-revalidate=300";
    }
    if (
      /^\/public\/stores\/[^/]+\/summary(?:\?|$)/.test(url) ||
      /^\/public\/brands\/[^/]+\/summary(?:\?|$)/.test(url) ||
      /^\/public\/products\/[^/]+(?:\?|$)/.test(url) ||
      /^\/public\/stores\/[^/]+(?:\?|$)/.test(url) ||
      /^\/public\/brands\/[^/]+(?:\?|$)/.test(url)
    ) {
      return "public, max-age=300, stale-while-revalidate=900";
    }
    if (/^\/public\/cities(?:\/[^/]+)?(?:\?|$)/.test(url)) {
      return "public, max-age=3600, stale-while-revalidate=86400";
    }
    return "public, max-age=30, stale-while-revalidate=300";
  };

  app.addHook("onRequest", async (request, reply) => {
    const requestUrl = request.raw.url ?? request.url;
    if (requestUrl.length > catalogConfig.api.maxUrlLength) {
      reply.code(414).send({ error: "request_uri_too_large" });
      return reply;
    }
    const requestPath = request.url.split("?")[0] ?? request.url;
    if (
      requestPath.startsWith("/internal") &&
      requestPath !== "/internal/auth/login" &&
      requestPath !== "/internal/auth/session"
    ) {
      await auth(request, reply);
      if (reply.sent) return reply;
    }
    return undefined;
  });

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-catalog-runtime-mode", resolvedRuntimeMetadata.mode);
    if (request.url === "/" || request.url === "/healthz") {
      reply.header("cache-control", "no-store");
    } else if (request.url.startsWith("/internal")) {
      reply.header("cache-control", "no-store");
    } else if (request.url.startsWith("/public")) {
      reply.header("cache-control", getPublicCacheControl(request.url));
    } else if (request.url.startsWith("/docs")) {
      reply.header("cache-control", "no-store");
      reply.header("x-robots-tag", "noindex");
    }
    return payload;
  });

  const buildRuntimeHealthPayload = () => ({
    ok: true,
    runtime: {
      mode: resolvedRuntimeMetadata.mode,
      scope: resolvedRuntimeMetadata.scopedStoreIds?.length ? "subset" : "all",
      scopedStoreCount: resolvedRuntimeMetadata.scopedStoreIds?.length ?? 0,
    },
  });

  app.get("/", { schema: catalogRouteSchemas.rootInfo }, async () => ({
    ok: true,
    service: "iraq-catalog-backend",
    publicApiBase: "/public",
    health: "/public/healthz",
    runtime: buildRuntimeHealthPayload().runtime,
    docs: catalogConfig.docs.enabled ? "/docs" : undefined,
  }));
  app.get("/healthz", { schema: catalogRouteSchemas.healthz }, async () => buildRuntimeHealthPayload());
  app.get("/public/healthz", { schema: catalogRouteSchemas.publicHealthz, preHandler: publicReadRateLimit }, async () => buildRuntimeHealthPayload());
  const readSiteSettings = async () => {
    const stored = await context.repository.getSiteSettings("default");
    return {
      id: "default",
      payload: normalizeSiteSettingsPayload(stored?.payload ?? DEFAULT_SITE_SETTINGS),
      updatedBy: stored?.updatedBy ?? "system",
      updatedAt: stored?.updatedAt ?? new Date(0).toISOString(),
    };
  };
  const createAudit = async (
    action: string,
    details: Record<string, unknown>,
    storeId?: string,
    syncRunId?: string,
  ) => {
    await context.repository.createAuditLog({
      id: createId("audit"),
      actor: "admin",
      action,
      storeId,
      syncRunId,
      details,
      createdAt: nowIso(),
    });
  };
  app.get("/public/settings/site", { preHandler: publicReadRateLimit }, async (request) =>
    getCachedPublicResponse(request.url, 5 * 60_000, () => readSiteSettings()),
  );
  app.get("/public/home", { schema: catalogRouteSchemas.publicBootstrapLite, preHandler: publicReadRateLimit }, async (request) =>
    getCachedPublicResponse(request.url, 5 * 60_000, () => buildPublicBootstrapLite(context)),
  );
  app.get("/public/bootstrap-lite", { schema: catalogRouteSchemas.publicBootstrapLite, preHandler: publicReadRateLimit }, async (request) =>
    getCachedPublicResponse(request.url, 5 * 60_000, () => buildPublicBootstrapLite(context)),
  );
  app.get("/public/bootstrap", { schema: catalogRouteSchemas.publicBootstrap, preHandler: publicReadRateLimit }, async (request) =>
    getCachedPublicResponse(request.url, 30_000, () => buildPublicBootstrap(context)),
  );
  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>("/public/catalog-products", { schema: catalogRouteSchemas.publicCatalogProducts, preHandler: publicReadRateLimit }, async (request) =>
    getCachedPublicResponse(request.url, 30_000, () =>
      buildPublicCatalogProducts(context, {
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        offset: request.query.offset ? Number(request.query.offset) : undefined,
      }),
    ),
  );
  app.get("/public/cities", { schema: catalogRouteSchemas.publicCities, preHandler: publicReadRateLimit }, async (request) =>
    getCachedPublicResponse(request.url, 60 * 60_000, () => listPublicCities()),
  );

  app.get<{ Params: { slug: string } }>("/public/cities/:slug", { schema: catalogRouteSchemas.publicCityDetail, preHandler: publicReadRateLimit }, async (request, reply) => {
    const city = await getCachedPublicResponse(request.url, 60 * 60_000, () => getPublicCity(request.params.slug));
    if (!city) {
      reply.code(404).send({ error: "city_not_found" });
      return;
    }
    return city;
  });

  app.get<{ Params: { id: string } }>("/public/stores/:id", { schema: catalogRouteSchemas.publicStoreDetail, preHandler: publicReadRateLimit }, async (request, reply) => {
    const detail = await getCachedPublicResponse(request.url, 5 * 60_000, () => buildPublicStoreDetail(context, request.params.id));
    if (!detail) {
      reply.code(404).send({ error: "store_not_found" });
      return;
    }
    return detail;
  });
  app.get<{ Params: { id: string } }>("/public/stores/:id/summary", { schema: catalogRouteSchemas.publicStoreSummary, preHandler: publicReadRateLimit }, async (request, reply) => {
    const detail = await getCachedPublicResponse(request.url, 5 * 60_000, () => buildPublicStoreSummary(context, request.params.id));
    if (!detail) {
      reply.code(404).send({ error: "store_not_found" });
      return;
    }
    return detail;
  });
  app.get<{
    Params: { id: string };
    Querystring: { limit?: string; offset?: string };
  }>("/public/stores/:id/products", { schema: catalogRouteSchemas.publicStoreProducts, preHandler: publicReadRateLimit }, async (request, reply) => {
    const payload = await getCachedPublicResponse(request.url, 30_000, () =>
      buildPublicStoreProducts(context, request.params.id, {
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        offset: request.query.offset ? Number(request.query.offset) : undefined,
      }),
    );
    if (!payload) {
      reply.code(404).send({ error: "store_not_found" });
      return;
    }
    return payload;
  });

  app.get<{
    Querystring: {
      id?: string | string[];
    };
  }>("/public/products/by-ids", { schema: catalogRouteSchemas.publicProductsByIds, preHandler: publicReadRateLimit }, async (request) => {
    const ids = Array.isArray(request.query.id)
      ? request.query.id
      : request.query.id
        ? [request.query.id]
        : [];

    return getCachedPublicResponse(request.url, 30_000, async () => ({
      items: await buildPublicProductsByIds(context, ids),
    }));
  });

  app.get<{ Params: { id: string } }>("/public/products/:id", { schema: catalogRouteSchemas.publicProductDetail, preHandler: publicReadRateLimit }, async (request, reply) => {
    const product = await getCachedPublicResponse(request.url, 5 * 60_000, () => buildPublicProductDetail(context, request.params.id));
    if (!product) {
      reply.code(404).send({ error: "product_not_found" });
      return;
    }
    return product;
  });

  app.get<{ Params: { id: string } }>("/public/products/:id/full", { schema: catalogRouteSchemas.publicProductFull, preHandler: publicReadRateLimit }, async (request, reply) => {
    const payload = await getCachedPublicResponse(request.url, 30_000, () => buildPublicProductFull(context, request.params.id));
    if (!payload) {
      reply.code(404).send({ error: "product_not_found" });
      return;
    }
    return payload;
  });

  app.get<{ Params: { id: string } }>("/public/products/:id/offers", { schema: catalogRouteSchemas.publicProductOffers, preHandler: publicReadRateLimit }, async (request, reply) => {
    const offers = await getCachedPublicResponse(request.url, 30_000, () => buildPublicProductOffers(context, request.params.id));
    if (offers.length === 0) {
      const product = await buildPublicProductDetail(context, request.params.id);
      if (!product) {
        reply.code(404).send({ error: "product_not_found" });
        return;
      }
    }
    return offers;
  });

  app.get<{ Params: { slug: string } }>("/public/brands/:slug", { schema: catalogRouteSchemas.publicBrandDetail, preHandler: publicReadRateLimit }, async (request, reply) => {
    const brand = await getCachedPublicResponse(request.url, 5 * 60_000, () => buildPublicBrandDetail(context, request.params.slug));
    if (!brand) {
      reply.code(404).send({ error: "brand_not_found" });
      return;
    }
    return brand;
  });
  app.get<{ Params: { slug: string } }>("/public/brands/:slug/summary", { schema: catalogRouteSchemas.publicBrandSummary, preHandler: publicReadRateLimit }, async (request, reply) => {
    const payload = await getCachedPublicResponse(request.url, 5 * 60_000, () => buildPublicBrandSummary(context, request.params.slug));
    if (!payload) {
      reply.code(404).send({ error: "brand_not_found" });
      return;
    }
    return payload;
  });
  app.get<{
    Params: { slug: string };
    Querystring: { limit?: string; offset?: string };
  }>("/public/brands/:slug/products", { schema: catalogRouteSchemas.publicBrandProducts, preHandler: publicReadRateLimit }, async (request, reply) => {
    const payload = await getCachedPublicResponse(request.url, 30_000, () =>
      buildPublicBrandProducts(context, request.params.slug, {
        limit: request.query.limit ? Number(request.query.limit) : undefined,
        offset: request.query.offset ? Number(request.query.offset) : undefined,
      }),
    );
    if (!payload) {
      reply.code(404).send({ error: "brand_not_found" });
      return;
    }
    return payload;
  });

  app.get<{
    Querystring: {
      q?: string;
      brands?: string | string[];
      categories?: string | string[];
      stores?: string | string[];
      cities?: string | string[];
      priceMin?: string;
      priceMax?: string;
      inStockOnly?: string;
      onSaleOnly?: string;
      verifiedOnly?: string;
      officialDealerOnly?: string;
      sort?: "relevance" | "price_asc" | "price_desc" | "rating_desc" | "freshness_desc" | "offers_desc";
    };
  }>("/public/search", { schema: catalogRouteSchemas.publicSearch, preHandler: publicSearchRateLimit }, async (request) => {
    const asList = (value?: string | string[]) =>
      Array.isArray(value)
        ? value.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean)
        : value
          ? value.split(",").map((entry) => entry.trim()).filter(Boolean)
          : undefined;

    return getCachedPublicResponse(request.url, 30_000, () =>
      buildPublicUnifiedSearch(context, {
        q: request.query.q,
        brands: asList(request.query.brands),
        categories: asList(request.query.categories),
        stores: asList(request.query.stores),
        cities: asList(request.query.cities),
        priceMin: request.query.priceMin ? Number(request.query.priceMin) : undefined,
        priceMax: request.query.priceMax ? Number(request.query.priceMax) : undefined,
        inStockOnly: request.query.inStockOnly === "true",
        onSaleOnly: request.query.onSaleOnly === "true",
        verifiedOnly: request.query.verifiedOnly === "true",
        officialDealerOnly: request.query.officialDealerOnly === "true",
        sort: request.query.sort,
      }),
    );
  });

  app.post<{ Body: { secret?: string } }>(
    "/internal/auth/login",
    { preHandler: adminLoginRateLimit },
    async (request, reply) => {
      const providedSecret = request.body?.secret?.trim() ?? "";
      if (!providedSecret || !safeEqualSecret(providedSecret, catalogConfig.admin.loginSecret)) {
        reply.code(401).send({ error: "invalid_admin_secret" });
        return;
      }

      const session = createAdminSessionCookie();
      reply.header("set-cookie", session.cookie);
      await createAudit("admin.login", { ip: request.ip, userAgent: request.headers["user-agent"] ?? null });
      reply.code(200).send({
        ok: true,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt,
      });
    },
  );

  app.get("/internal/auth/session", async (request) => readAdminSessionState(request));

  app.post("/internal/auth/logout", async (request, reply) => {
    const sessionState = readAdminSessionState(request);
    if (!sessionState.authenticated) {
      reply.code(401).send({ error: "admin_session_required" });
      return;
    }
    const csrfHeader = request.headers[ADMIN_CSRF_HEADER];
    if (
      (typeof csrfHeader !== "string" || !safeEqualSecret(csrfHeader, sessionState.csrfToken))
    ) {
      reply.code(403).send({ error: "invalid_admin_csrf" });
      return;
    }
    reply.header("set-cookie", clearAdminSessionCookie());
    reply.code(200).send({ ok: true });
  });

  app.get("/internal/health", { schema: catalogRouteSchemas.internalHealth }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "health", 120, 60_000)) return;
    const counts = await getProductPullCounts(context);
    const healthzUrl = `http://${catalogConfig.bindHost}:${catalogConfig.port}/public/healthz`;
    let publicApiHealthy = false;
    try {
      const response = await fetch(healthzUrl);
      publicApiHealthy = response.ok;
    } catch {
      publicApiHealthy = false;
    }
    return {
      ok: true,
      runtime: {
        apiMode: resolvedRuntimeMetadata.mode,
        scope: resolvedRuntimeMetadata.scopedStoreIds?.length ? "subset" : "all",
        scopedStoreCount: resolvedRuntimeMetadata.scopedStoreIds?.length ?? 0,
      },
      database: {
        driver: catalogConfig.database.driver,
        configured: true,
      },
      redis: {
        configured: Boolean(catalogConfig.redisUrl),
      },
      publicApi: {
        ok: publicApiHealthy,
      },
      flags: {
        docsEnabled: catalogConfig.docs.enabled,
        trustProxy: catalogConfig.trustProxy,
      },
      counts,
    };
  });

  app.get("/internal/catalog/stats", { schema: catalogRouteSchemas.internalCatalogStats }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "catalog:stats", 120, 60_000)) return;
    const stores = await context.repository.listStores();
    const sizes = await context.repository.listStoreSizeSummaries();
    const sizeByStoreId = new Map(sizes.map((summary) => [summary.storeId, summary]));
    const latestSyncAt = stores
      .map((store) => store.lastSyncAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
    const latestProbeAt = stores
      .map((store) => store.lastProbeAt)
      .filter(Boolean)
      .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];
    const storesWithWebsite = stores.filter((store) => Boolean(store.website)).length;
    const indexedStores = sizes.filter((summary) => summary.indexedProductCount > 0).length;
    const zeroProductStores = stores.filter((store) => {
      if (!store.website) return false;
      return (sizeByStoreId.get(store.id)?.indexedProductCount ?? 0) <= 0;
    }).length;
    return {
      totalStores: stores.length,
      storesWithWebsite,
      indexedStores,
      zeroProductStores,
      totalProducts: sizes.reduce((sum, item) => sum + item.indexedProductCount, 0),
      totalVariants: sizes.reduce((sum, item) => sum + item.indexedVariantCount, 0),
      totalOffers: sizes.reduce((sum, item) => sum + item.activeOfferCount, 0),
      latestSyncAt,
      latestProbeAt,
    };
  });

  app.get("/internal/catalog/data-quality/summary", async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "catalog:data-quality", 60, 60_000)) return;
    const sqliteSummary = usesInjectedContext ? null : readSqliteCatalogQualitySummary();
    if (sqliteSummary) return sqliteSummary;

    const stores = await context.repository.listStores();
    const documents = await context.repository.listSearchDocuments();
    return {
      generatedAt: new Date().toISOString(),
      counts: {
        stores: stores.length,
        catalogProducts: documents.length,
        searchDocuments: documents.length,
        indexedStores: new Set(documents.map((document) => document.storeId)).size,
      },
      quality: {
        productsMissingImage: documents.filter((document) => !document.imageUrl).length,
        productsMissingPrice: documents.filter((document) => !document.livePrice || document.livePrice <= 0).length,
        productsMissingBrand: documents.filter((document) => !document.brand).length,
        productsMissingSearchDocument: 0,
        searchDocumentsMissingCatalogProduct: 0,
        productsUnsupportedCurrency: documents.filter((document) => document.currency && !["IQD", "USD"].includes(document.currency.toUpperCase())).length,
        productsTinyIqdPrice: documents.filter((document) => (document.currency ?? "IQD").toUpperCase() === "IQD" && document.livePrice && document.livePrice > 0 && document.livePrice < 1000).length,
        productsBlockedOfferDomain: documents.filter((document) =>
          /almatajiralthalath\.com|apple\.com\/|samsung\.com\/|lg\.com\/|hikvision\.com\//i.test(document.sourceUrl),
        ).length,
      },
    };
  });

  app.post("/internal/catalog/reindex-identities", async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "catalog:reindex-identities", 1, 10 * 60_000, reply)) return;

    const job = createCatalogJob("identity-reindex", {
      queue: "maintenance",
      task: "reindex-identities",
    });
    startCatalogJob(job, async () => {
      await queue.enqueueMaintenance({
        actor: `api-identity-reindex:${job.id}`,
        task: "reindex-identities",
      });
      await context.repository.createAuditLog({
        id: createId("audit"),
        actor: `api-identity-reindex:${job.id}`,
        action: "catalog_identity_reindex_enqueued",
        details: { queue: "maintenance", task: "reindex-identities" },
        createdAt: new Date().toISOString(),
      });
      clearPublicResponseCache();
      return {
        enqueued: true,
        queue: "maintenance",
        task: "reindex-identities",
      };
    });

    reply.code(202).send({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  });

  app.post("/internal/catalog/audit-quality", async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "catalog:audit-quality", 2, 10 * 60_000, reply)) return;

    const job = createCatalogJob("quality-audit", {
      queue: "maintenance",
      task: "audit-quality",
    });
    startCatalogJob(job, async () => {
      await queue.enqueueMaintenance({
        actor: `api-quality-audit:${job.id}`,
        task: "audit-quality",
      });
      await context.repository.createAuditLog({
        id: createId("audit"),
        actor: `api-quality-audit:${job.id}`,
        action: "catalog_quality_audit_enqueued",
        details: { queue: "maintenance", task: "audit-quality" },
        createdAt: new Date().toISOString(),
      });
      return {
        enqueued: true,
        queue: "maintenance",
        task: "audit-quality",
      };
    });

    reply.code(202).send({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  });

  app.setNotFoundHandler(
    {
      preHandler: app.rateLimit({
        max: 20,
        timeWindow: catalogConfig.publicRateLimit.windowMs,
      }),
    },
    async (_request, reply) => {
      reply.code(404).send({ error: "not_found" });
    },
  );

  app.get("/internal/settings/site", async (request, reply) => {
    if (!guard(request, reply, ["catalog.read", "catalog.settings"], "settings:site:get", 120, 60_000)) return;
    return readSiteSettings();
  });

  app.put<{ Body: unknown }>("/internal/settings/site", async (request, reply) => {
    if (!guard(request, reply, ["catalog.settings"], "settings:site:put", 20, 60_000)) return;
    const before = await readSiteSettings();
    const nextPayload = normalizeSiteSettingsPayload(request.body);
    const next = {
      id: "default",
      payload: nextPayload,
      updatedBy: request.catalogToken?.name ?? "admin",
      updatedAt: nowIso(),
    };
    await context.repository.saveSiteSettings(next);
    await createAudit("settings.site.update", { before: before.payload, after: nextPayload });
    clearPublicResponseCache();
    reply.code(200).send(next);
  });

  app.get<{ Querystring: { limit?: string; offset?: string } }>("/internal/audit-logs", async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "audit-logs:list", 60, 60_000)) return;
    const limit = clampLimit(request.query.limit, 50, 200);
    const offset = Math.max(0, Number(request.query.offset ?? "0") || 0);
    return {
      items: await context.repository.listAuditLogs(limit, offset),
      limit,
      offset,
    };
  });

  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>("/internal/stores", { schema: catalogRouteSchemas.internalStores }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "stores:list", 20, 60_000)) return;
    const stores = await context.repository.listStores();
    const sizeSummaries = await context.repository.listStoreSizeSummaries();
    const sizeByStoreId = new Map(sizeSummaries.map((summary) => [summary.storeId, summary]));
    const limit = clampLimit(request.query.limit, 100, 200);
    const offset = Math.max(0, Number(request.query.offset ?? "0") || 0);
    const pagedStores = stores.slice(offset, offset + limit);
    return {
      total: stores.length,
      limit,
      offset,
      items: await Promise.all(
        pagedStores.map(async (store) => ({
          store,
          connectorProfile: await context.repository.getConnectorProfile(store.id),
          size: sizeByStoreId.get(store.id),
        })),
      ),
    };
  });

  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
      q?: string;
      status?: string;
    };
  }>("/internal/stores/missing-products", { schema: catalogRouteSchemas.internalStoresMissingProducts }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "stores:missing-products", 60, 60_000)) return;
    const stores = await context.repository.listStores();
    const sizeSummaries = await context.repository.listStoreSizeSummaries();
    const sizeByStoreId = new Map(sizeSummaries.map((summary) => [summary.storeId, summary]));
    const q = request.query.q?.trim().toLowerCase();
    const status = request.query.status?.trim();
    const filtered = stores.filter((store) => {
      if (!store.website) return false;
      const size = sizeByStoreId.get(store.id);
      if ((size?.indexedProductCount ?? 0) > 0) return false;
      if (status && store.status !== status) return false;
      if (!q) return true;
      return [store.name, store.website, store.area, store.primaryCategory]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
    const limit = clampLimit(request.query.limit, 100, 250);
    const offset = Math.max(0, Number(request.query.offset ?? "0") || 0);
    const pagedStores = filtered.slice(offset, offset + limit);
    return {
      total: filtered.length,
      limit,
      offset,
      items: await Promise.all(
        pagedStores.map(async (store) => ({
          store,
          connectorProfile: await context.repository.getConnectorProfile(store.id),
          size: sizeByStoreId.get(store.id),
          acquisitionProfile: await context.repository.getAcquisitionProfile(store.id),
        })),
      ),
    };
  });

  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
      q?: string;
    };
  }>("/internal/stores/with-products", { schema: catalogRouteSchemas.internalStoresWithProducts }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "stores:with-products", 60, 60_000)) return;
    const stores = await context.repository.listStores();
    const sizeSummaries = await context.repository.listStoreSizeSummaries();
    const sizeByStoreId = new Map(sizeSummaries.map((summary) => [summary.storeId, summary]));
    const q = request.query.q?.trim().toLowerCase();
    const filtered = stores
      .filter((store) => (sizeByStoreId.get(store.id)?.indexedProductCount ?? 0) > 0)
      .filter((store) => {
        if (!q) return true;
        return [store.name, store.website, store.area, store.primaryCategory]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      })
      .sort((a, b) => (sizeByStoreId.get(b.id)?.indexedProductCount ?? 0) - (sizeByStoreId.get(a.id)?.indexedProductCount ?? 0));
    const limit = clampLimit(request.query.limit, 100, 250);
    const offset = Math.max(0, Number(request.query.offset ?? "0") || 0);
    const pagedStores = filtered.slice(offset, offset + limit);
    return {
      total: filtered.length,
      limit,
      offset,
      items: await Promise.all(
        pagedStores.map(async (store) => ({
          store,
          connectorProfile: await context.repository.getConnectorProfile(store.id),
          size: sizeByStoreId.get(store.id),
        })),
      ),
    };
  });

  app.get<{ Params: { id: string } }>("/internal/stores/:id", { schema: catalogRouteSchemas.internalStoreDetail }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.read"])) return;
    if (!consumeRate(request, "stores:get", 60, 60_000, reply)) return;
    const store = await context.repository.getStoreById(request.params.id);
    if (!store) {
      reply.code(404).send({ error: "store_not_found" });
      return;
    }
    return {
      store,
      connectorProfile: await context.repository.getConnectorProfile(store.id),
      size: await context.repository.getStoreSizeSummary(store.id),
    };
  });

  app.patch<{
    Params: { id: string };
    Body: Partial<Pick<
      StoreRecord,
      | "name"
      | "city"
      | "cityAr"
      | "area"
      | "primaryCategory"
      | "suggestedCategory"
      | "address"
      | "phone"
      | "whatsapp"
      | "website"
      | "googleMapsUrl"
      | "websiteType"
      | "highPriority"
      | "status"
      | "blockedReason"
    >>;
  }>("/internal/stores/:id", async (request, reply) => {
    if (!guard(request, reply, ["catalog.settings"], "stores:patch", 30, 60_000)) return;
    const current = await context.repository.getStoreById(request.params.id);
    if (!current) {
      reply.code(404).send({ error: "store_not_found" });
      return;
    }

    const body = request.body ?? {};
    const patch: Partial<StoreRecord> = { updatedAt: nowIso() };
    const stringFields: Array<keyof StoreRecord> = [
      "name",
      "city",
      "cityAr",
      "area",
      "primaryCategory",
      "suggestedCategory",
      "address",
      "phone",
      "whatsapp",
      "website",
      "googleMapsUrl",
      "websiteType",
      "blockedReason",
    ];
    for (const field of stringFields) {
      const value = body[field as keyof typeof body];
      if (value === null) {
        (patch as Record<string, unknown>)[field] = undefined;
      } else if (typeof value === "string") {
        (patch as Record<string, unknown>)[field] = value.trim() || undefined;
      }
    }
    if (typeof body.highPriority === "boolean") patch.highPriority = body.highPriority;
    if (typeof body.status === "string") {
      if (!STORE_STATUSES.has(body.status as StoreRecord["status"])) {
        reply.code(400).send({ error: "invalid_store_status" });
        return;
      }
      patch.status = body.status as StoreRecord["status"];
    }

    await context.repository.updateStore(current.id, patch);
    await createAudit("stores.update", { before: current, patch }, current.id);
    clearPublicResponseCache();
    reply.code(200).send({
      store: await context.repository.getStoreById(current.id),
      connectorProfile: await context.repository.getConnectorProfile(current.id),
      size: await context.repository.getStoreSizeSummary(current.id),
    });
  });

  app.get<{ Params: { id: string } }>("/internal/stores/:id/size", { schema: catalogRouteSchemas.internalStoreSize }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.read"])) return;
    if (!consumeRate(request, "stores:size", 60, 60_000, reply)) return;
    const size = await context.repository.getStoreSizeSummary(request.params.id);
    if (!size) {
      reply.code(404).send({ error: "size_not_found" });
      return;
    }
    return size;
  });

  app.post<{ Params: { id: string } }>("/internal/stores/:id/probe", { schema: catalogRouteSchemas.internalProbe }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "queue:probe", 10, 60_000, reply)) return;
    await queue.enqueueProbe({ storeId: request.params.id, actor: "api" });
    reply.code(202).send({ enqueued: true, queue: "probe", storeId: request.params.id });
  });

  app.post<{ Params: { id: string } }>("/internal/stores/:id/sync", { schema: catalogRouteSchemas.internalSync }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "queue:sync", 10, 60_000, reply)) return;
    await queue.enqueueSync({ storeId: request.params.id, actor: "api" });
    reply.code(202).send({ enqueued: true, queue: "sync", storeId: request.params.id });
  });

  app.post<{
    Body: {
      website: string;
      name?: string;
      city?: string;
      cityAr?: string;
      area?: string;
      primaryCategory?: string;
      sourceFile?: string;
      note?: string;
      highPriority?: boolean;
      syncNow?: boolean;
    };
  }>("/internal/stores/intake", { schema: catalogRouteSchemas.internalStoreIntake }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "stores:intake", 10, 60_000, reply)) return;
    const result = await manualStoreIntakeService.intake(request.body, "api");
    reply.code(200).send(result);
  });

  app.post("/internal/discovery/rescan", { schema: catalogRouteSchemas.internalDiscoveryRescan }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "queue:discovery", 2, 60_000, reply)) return;
    await queue.enqueueDiscoveryRescan({ actor: "api" });
    reply.code(202).send({ enqueued: true, queue: "discovery" });
  });

  app.post<{
    Body: {
      limit?: number;
      concurrency?: number;
      dedupeByDomain?: boolean;
      officialOnly?: boolean;
    };
  }>("/internal/catalog/sync-current", { schema: catalogRouteSchemas.internalCatalogSyncCurrent }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "catalog:sync-current", 1, 10 * 60_000, reply)) return;
    const result = await currentCatalogSyncService.syncCurrentSites({
      actor: "api",
      limit: request.body?.limit,
      concurrency: request.body?.concurrency,
      dedupeByDomain: request.body?.dedupeByDomain,
      officialOnly: request.body?.officialOnly,
    });
    reply.code(200).send(result);
  });

  app.post<{
    Body: {
      limit?: number;
      includeDiscovery?: boolean;
      officialOnly?: boolean;
      dedupeByDomain?: boolean;
      concurrency?: number;
    };
  }>("/internal/catalog/refresh", { schema: catalogRouteSchemas.internalCatalogRefresh }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "catalog:refresh", 1, 10 * 60_000, reply)) return;
    const result = await refreshService.refresh({
      actor: "api",
      includeDiscovery: request.body?.includeDiscovery ?? true,
      officialOnly: request.body?.officialOnly ?? true,
      dedupeByDomain: request.body?.dedupeByDomain ?? true,
      limit: request.body?.limit,
      concurrency: request.body?.concurrency,
    });
    clearPublicResponseCache();
    reply.code(200).send(result);
  });

  app.post<{
    Body: {
      includeZeroProducts?: boolean;
      limit?: number;
      concurrency?: number;
    };
  }>("/internal/catalog/retry-failed", { schema: catalogRouteSchemas.internalCatalogRetryFailed }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "catalog:retry-failed", 1, 10 * 60_000, reply)) return;
    const candidateIds = await context.coverageService.getRetryCandidateStoreIds(
      request.body?.includeZeroProducts ?? true,
    );
    const selectedIds = request.body?.limit ? candidateIds.slice(0, request.body.limit) : candidateIds;
    const result = await refreshService.refresh({
      actor: "api",
      includeDiscovery: false,
      officialOnly: true,
      dedupeByDomain: false,
      concurrency: request.body?.concurrency ?? 4,
      storeIds: selectedIds,
    });
    reply.code(200).send(result);
  });

  app.post<{
    Body: {
      concurrency?: number;
      currentLimit?: number;
      zeroLimit?: number;
      includeZeroProducts?: boolean;
      includeUnofficial?: boolean;
    };
  }>("/internal/catalog/pull-products", { schema: catalogRouteSchemas.internalCatalogPullProducts }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "catalog:pull-products", 1, 10 * 60_000, reply)) return;

    const job = createCatalogJob("product-pull", {
      concurrency: request.body?.concurrency,
      currentLimit: request.body?.currentLimit,
      zeroLimit: request.body?.zeroLimit,
      includeZeroProducts: request.body?.includeZeroProducts,
      includeUnofficial: request.body?.includeUnofficial,
    });

    startCatalogJob(job, async () => {
      const before = await getProductPullCounts(context);
      const currentStores = await currentCatalogSyncService.planCurrentStores({
        limit: request.body?.currentLimit,
        dedupeByDomain: true,
        officialOnly: !request.body?.includeUnofficial,
      });
      const currentStoreIds = currentStores.map((store) => store.id);
      job.progress = {
        completedStores: 0,
        totalStores: currentStoreIds.length,
      };
      let enqueuedStores = 0;
      for (const store of currentStores) {
        await queue.enqueueSync({
          storeId: store.id,
          actor: `api-product-pull:${job.id}`,
        });
        enqueuedStores += 1;
        job.progress = {
          completedStores: enqueuedStores,
          totalStores: currentStoreIds.length,
          lastStoreId: store.id,
          lastStoreName: store.name,
          lastStatus: "enqueued",
        };
      }

      let zeroProductEnqueue:
        | {
            selectedStores: number;
            selectedStoreIds: string[];
          }
        | undefined;
      if (request.body?.includeZeroProducts) {
        const stores = await context.repository.listStores();
        const sizes = await context.repository.listStoreSizeSummaries();
        const sizeByStoreId = new Map(sizes.map((summary) => [summary.storeId, summary]));
        const candidates = stores.filter((store) => {
          if (!store.website) return false;
          if (!(request.body?.includeUnofficial) && store.websiteType !== "official") return false;
          const count = sizeByStoreId.get(store.id)?.indexedProductCount ?? 0;
          return count <= 0;
        });
        const selected = request.body?.zeroLimit ? candidates.slice(0, request.body.zeroLimit) : candidates;
        for (const store of selected) {
          await queue.enqueueSync({
            storeId: store.id,
            actor: `api-product-pull-zero:${job.id}`,
          });
        }
        zeroProductEnqueue = {
          selectedStores: selected.length,
          selectedStoreIds: selected.map((store) => store.id),
        };
      }

      const finishedAt = new Date().toISOString();
      await context.repository.createAuditLog({
        id: createId("audit"),
        actor: `api-product-pull:${job.id}`,
        action: "catalog_product_pull_enqueued",
        details: {
          currentStores: currentStoreIds.length,
          zeroProductStores: zeroProductEnqueue?.selectedStores ?? 0,
          enqueuedStores,
        },
        createdAt: finishedAt,
      });
      clearPublicResponseCache();
      return {
        generatedAt: finishedAt,
        before,
        selectedStores: currentStoreIds.length,
        selectedStoreIds: currentStoreIds,
        enqueuedStores,
        queue: "sync",
        zeroProductEnqueue,
      };
    });

    reply.code(202).send({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  });

  app.post<{
    Body: {
      website: string;
      name?: string;
      city?: string;
      cityAr?: string;
      area?: string;
      primaryCategory?: string;
      note?: string;
      highPriority?: boolean;
    };
  }>("/internal/catalog/pull-store-url", { schema: catalogRouteSchemas.internalCatalogPullStoreUrl }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "catalog:pull-store-url", 5, 60_000, reply)) return;

    const job = createCatalogJob("store-url-pull", {
      website: request.body?.website,
      name: request.body?.name,
      city: request.body?.city,
      cityAr: request.body?.cityAr,
      area: request.body?.area,
      primaryCategory: request.body?.primaryCategory,
      highPriority: request.body?.highPriority,
    });

    startCatalogJob(job, async () => {
      const result = await manualStoreIntakeService.intake(
        {
          ...request.body,
          syncNow: false,
          sourceFile: request.body?.website,
          note: request.body?.note ?? "admin pull-store-url queued",
        },
        `api-store-url-pull:${job.id}`,
      );
      await queue.enqueueSync({
        storeId: result.store.id,
        actor: `api-store-url-pull:${job.id}`,
      });
      await context.repository.createAuditLog({
        id: createId("audit"),
        actor: `api-store-url-pull:${job.id}`,
        action: "catalog_store_url_pull_enqueued",
        storeId: result.store.id,
        details: {
          website: result.store.website,
          existed: result.existed,
        },
        createdAt: new Date().toISOString(),
      });
      clearPublicResponseCache();
      return {
        ...result,
        enqueuedSync: true,
      };
    });

    reply.code(202).send({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  });

  app.post<{
    Body: {
      limit?: number;
      concurrency?: number;
      dedupeByDomain?: boolean;
      officialOnly?: boolean;
      includeZeroProducts?: boolean;
      zeroLimit?: number;
      includeUnofficial?: boolean;
    };
  }>("/internal/catalog/update-stores", { schema: catalogRouteSchemas.internalCatalogUpdateStores }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "catalog:update-stores", 1, 10 * 60_000, reply)) return;

    const concurrency = Math.max(1, Math.min(request.body?.concurrency ?? 1, 4));
    const job = createCatalogJob("store-by-store-update", {
      limit: request.body?.limit,
      concurrency,
      dedupeByDomain: request.body?.dedupeByDomain ?? true,
      officialOnly: request.body?.officialOnly ?? true,
      includeZeroProducts: request.body?.includeZeroProducts ?? false,
      zeroLimit: request.body?.zeroLimit,
      includeUnofficial: request.body?.includeUnofficial,
    });

    startCatalogJob(job, async () => {
      const selectedStores = await currentCatalogSyncService.planCurrentStores({
        limit: request.body?.limit,
        dedupeByDomain: request.body?.dedupeByDomain ?? true,
        officialOnly: request.body?.officialOnly ?? true,
      });
      const selectedStoreIds = selectedStores.map((store) => store.id);
      job.progress = {
        completedStores: 0,
        totalStores: selectedStoreIds.length,
      };
      let enqueuedStores = 0;
      for (const store of selectedStores) {
        await queue.enqueueSync({
          storeId: store.id,
          actor: `api-store-by-store-update:${job.id}`,
        });
        enqueuedStores += 1;
        job.progress = {
          completedStores: enqueuedStores,
          totalStores: selectedStoreIds.length,
          lastStoreId: store.id,
          lastStoreName: store.name,
          lastStatus: "enqueued",
        };
      }

      let zeroProductEnqueue:
        | {
            selectedStores: number;
            selectedStoreIds: string[];
          }
        | undefined;
      if (request.body?.includeZeroProducts) {
        const stores = await context.repository.listStores();
        const sizes = await context.repository.listStoreSizeSummaries();
        const sizeByStoreId = new Map(sizes.map((summary) => [summary.storeId, summary]));
        const candidates = stores.filter((store) => {
          if (!store.website) return false;
          if (!(request.body?.includeUnofficial) && store.websiteType !== "official") return false;
          const count = sizeByStoreId.get(store.id)?.indexedProductCount ?? 0;
          return count <= 0;
        });
        const selected = request.body?.zeroLimit ? candidates.slice(0, request.body.zeroLimit) : candidates;
        for (const store of selected) {
          await queue.enqueueSync({
            storeId: store.id,
            actor: `api-store-by-store-update-zero:${job.id}`,
          });
        }
        zeroProductEnqueue = {
          selectedStores: selected.length,
          selectedStoreIds: selected.map((store) => store.id),
        };
      }

      const finishedAt = new Date().toISOString();
      await context.repository.createAuditLog({
        id: createId("audit"),
        actor: `api-store-by-store-update:${job.id}`,
        action: "catalog_store_by_store_update_enqueued",
        details: {
          selectedStores: selectedStores.length,
          enqueuedStores,
          zeroProductStores: zeroProductEnqueue?.selectedStores ?? 0,
          concurrency,
        },
        createdAt: finishedAt,
      });
      clearPublicResponseCache();
      return {
        generatedAt: finishedAt,
        selectedStores: selectedStores.length,
        selectedStoreIds,
        enqueuedStores,
        queue: "sync",
        zeroProductEnqueue,
      };
    });

    reply.code(202).send({
      jobId: job.id,
      status: job.status,
      createdAt: job.createdAt,
    });
  });

  app.get<{ Params: { jobId: string } }>("/internal/catalog/pull-products/:jobId", { schema: catalogRouteSchemas.internalCatalogPullProductsJob }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "catalog:pull-products:job", 120, 60_000)) return;
    const job = catalogJobs.get(request.params.jobId);
    if (!job) {
      reply.code(404).send({ error: "job_not_found" });
      return;
    }
    reply.code(200).send(job);
  });

  app.get<{ Params: { jobId: string } }>("/internal/catalog/jobs/:jobId", { schema: catalogRouteSchemas.internalCatalogJob }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "catalog:job", 120, 60_000)) return;
    const job = catalogJobs.get(request.params.jobId);
    if (!job) {
      reply.code(404).send({ error: "job_not_found" });
      return;
    }
    reply.code(200).send(job);
  });

  app.get("/internal/coverage/summary", { schema: catalogRouteSchemas.internalCoverageSummary }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "coverage:summary", 60, 60_000)) return;
    return context.coverageService.summarizeCoverage();
  });

  app.get("/internal/domains/backlog", { schema: catalogRouteSchemas.internalDomainsBacklog }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "domains:backlog", 60, 60_000)) return;
    return context.coverageService.listBacklog();
  });

  app.get<{ Params: { id: string } }>("/internal/domains/:id/evidence", { schema: catalogRouteSchemas.internalDomainEvidence }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "domains:evidence", 60, 60_000)) return;
    try {
      return await context.coverageService.getDomainEvidence(request.params.id);
    } catch {
      reply.code(404).send({ error: "store_not_found" });
    }
  });

  app.post<{
    Params: { id: string };
    Body: {
      cookiesJson?: string;
      headers?: Record<string, string>;
      notes?: string;
      expiresAt?: string;
    };
  }>("/internal/domains/:id/session", { schema: catalogRouteSchemas.internalDomainSession }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.session"])) return;
    if (!consumeRate(request, "domains:session", 20, 60_000, reply)) return;
    const session = await context.coverageService.registerSession(request.params.id, {
      cookiesJson: request.body?.cookiesJson,
      headers: request.body?.headers,
      notes: request.body?.notes,
      expiresAt: request.body?.expiresAt,
    });
    reply.code(200).send(session);
  });

  app.post<{
    Params: { id: string };
    Body: {
      sourceUrl: string;
      authHeaders?: Record<string, string>;
      fieldMap?: Record<string, string>;
    };
  }>("/internal/domains/:id/feed-sync", { schema: catalogRouteSchemas.internalDomainFeedSync }, async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.feed"])) return;
    if (!consumeRate(request, "domains:feed-sync", 10, 60_000, reply)) return;
    const feed = await context.feedSyncService.saveAndSync(
      request.params.id,
      {
        sourceUrl: request.body.sourceUrl,
        authHeaders: request.body.authHeaders,
        fieldMap: request.body.fieldMap,
      },
      "api",
    );
    clearPublicResponseCache();
    reply.code(200).send(feed);
  });

  app.get<{
    Querystring: {
      q?: string;
      storeId?: string;
      minPrice?: string;
      maxPrice?: string;
      onSale?: string;
      availability?: string;
      limit?: string;
    };
  }>("/internal/search", { schema: catalogRouteSchemas.internalSearch }, async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "search", 120, 60_000)) return;
    return context.searchEngine.search({
      q: request.query.q ?? "",
      ...(request.query.storeId ? { storeId: request.query.storeId } : {}),
      ...(request.query.minPrice ? { minPrice: Number(request.query.minPrice) } : {}),
      ...(request.query.maxPrice ? { maxPrice: Number(request.query.maxPrice) } : {}),
      ...(request.query.onSale ? { onSale: request.query.onSale === "true" } : {}),
      ...(request.query.availability ? { availability: request.query.availability } : {}),
      limit: clampLimit(request.query.limit, 20, 100),
    });
  });

  function consumeRate(
    request: FastifyRequest,
    bucket: string,
    max: number,
    windowMs: number,
    reply: FastifyReply,
  ): boolean {
    const tokenName = request.catalogToken?.name;
    if (!tokenName) {
      reply.code(401).send({ error: "missing_authenticated_token_context" });
      return false;
    }
    const accepted = rateLimiter.consume(`${tokenName}:${bucket}`, max, windowMs);
    if (!accepted) {
      reply.code(429).send({ error: "rate_limit_exceeded", bucket });
      return false;
    }
    return true;
  }

  function guard(
    request: FastifyRequest,
    reply: FastifyReply,
    requiredScopes: string[],
    bucket: string,
    max: number,
    windowMs: number,
  ): boolean {
    if (!requireCatalogScopes(request, reply, requiredScopes)) return false;
    return consumeRate(request, bucket, max, windowMs, reply);
  }

  function clampLimit(raw: string | undefined, defaultValue: number, maxValue: number): number {
    const parsed = Number(raw ?? defaultValue);
    if (!Number.isFinite(parsed) || parsed <= 0) return defaultValue;
    return Math.min(Math.floor(parsed), maxValue);
  }

  async function getCachedPublicResponse<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const cached = publicResponseCache.get(key);
    if (cached && cached.expiresAt > now && cached.resolved) {
      return cached.value as T;
    }
    if (cached?.pending) {
      return cached.pending as Promise<T>;
    }

    const pending = loader()
      .then((value) => {
        publicResponseCache.set(key, {
          expiresAt: Date.now() + ttlMs,
          resolved: true,
          value,
        });
        return value;
      })
      .catch((error) => {
        publicResponseCache.delete(key);
        throw error;
      });

    publicResponseCache.set(key, {
      expiresAt: now + ttlMs,
      resolved: false,
      value: undefined,
      pending,
    });
    return pending;
  }

  function clearPublicResponseCache() {
    publicResponseCache.clear();
  }

  return app;
}

if (
  process.argv[1] &&
  (process.argv[1].endsWith(`${process.platform === "win32" ? "\\" : "/"}api${process.platform === "win32" ? "\\" : "/"}server.ts`) ||
    process.argv[1].endsWith(`${process.platform === "win32" ? "\\" : "/"}api${process.platform === "win32" ? "\\" : "/"}server.js`))
) {
  const app = await createCatalogApiServer();
  await app.listen({
    port: catalogConfig.port,
    host: catalogConfig.bindHost,
  });
}
