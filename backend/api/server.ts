import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import type { CatalogContext } from "../shared/bootstrap.js";
import { createCatalogContext } from "../shared/bootstrap.js";
import { catalogConfig } from "../shared/config.js";
import { createRedisConnection, BullCatalogJobQueue, type CatalogJobQueue } from "../worker/queues.js";
import { TokenRateLimiter } from "../shared/security/rateLimiter.js";
import { createInternalAuth, requireCatalogScopes } from "./auth.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";
import { importScrapedSiteCatalogs } from "../shared/seeds/importScrapedSiteCatalogs.js";
import {
  buildPublicBootstrap,
  buildPublicCatalogProducts,
  buildPublicBrandDetail,
  buildPublicProductDetail,
  buildPublicProductOffers,
  buildPublicProductsByIds,
  buildPublicStoreDetail,
  buildPublicUnifiedSearch,
  getPublicCity,
  listPublicCities,
} from "./publicCatalog.js";

export async function createCatalogApiServer(
  providedContext?: CatalogContext,
  providedQueue?: CatalogJobQueue,
) {
  const context = providedContext ?? (await createCatalogContext());
  await context.discoveryService.rescan("bootstrap");
  await importScrapedSiteCatalogs({
    repository: context.repository,
    searchEngine: context.searchEngine,
    repoRoot: catalogConfig.repoRoot,
  });
  const queue =
    providedQueue ??
    new BullCatalogJobQueue(createRedisConnection());
  const auth = createInternalAuth(context.repository);
  const rateLimiter = new TokenRateLimiter();
  const refreshService = new CatalogRefreshService(
    context.repository,
    context.discoveryService,
    context.probeService,
    context.syncService,
    context.coverageService,
  );

  const app = Fastify({ logger: true });

  app.get("/healthz", async () => ({ ok: true }));
  app.get("/public/healthz", async () => ({ ok: true }));
  app.get("/public/bootstrap", async () => buildPublicBootstrap(context));
  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>("/public/catalog-products", async (request) =>
    buildPublicCatalogProducts(context, {
      limit: request.query.limit ? Number(request.query.limit) : undefined,
      offset: request.query.offset ? Number(request.query.offset) : undefined,
    }),
  );
  app.get("/public/cities", async () => listPublicCities());

  app.get<{ Params: { slug: string } }>("/public/cities/:slug", async (request, reply) => {
    const city = await getPublicCity(request.params.slug);
    if (!city) {
      reply.code(404).send({ error: "city_not_found" });
      return;
    }
    return city;
  });

  app.get<{ Params: { id: string } }>("/public/stores/:id", async (request, reply) => {
    const detail = await buildPublicStoreDetail(context, request.params.id);
    if (!detail) {
      reply.code(404).send({ error: "store_not_found" });
      return;
    }
    return detail;
  });

  app.get<{
    Querystring: {
      id?: string | string[];
    };
  }>("/public/products/by-ids", async (request) => {
    const ids = Array.isArray(request.query.id)
      ? request.query.id
      : request.query.id
        ? [request.query.id]
        : [];

    return {
      items: await buildPublicProductsByIds(context, ids),
    };
  });

  app.get<{ Params: { id: string } }>("/public/products/:id", async (request, reply) => {
    const product = await buildPublicProductDetail(context, request.params.id);
    if (!product) {
      reply.code(404).send({ error: "product_not_found" });
      return;
    }
    return product;
  });

  app.get<{ Params: { id: string } }>("/public/products/:id/offers", async (request, reply) => {
    const offers = await buildPublicProductOffers(context, request.params.id);
    if (offers.length === 0) {
      const product = await buildPublicProductDetail(context, request.params.id);
      if (!product) {
        reply.code(404).send({ error: "product_not_found" });
        return;
      }
    }
    return offers;
  });

  app.get<{ Params: { slug: string } }>("/public/brands/:slug", async (request, reply) => {
    const brand = await buildPublicBrandDetail(context, request.params.slug);
    if (!brand) {
      reply.code(404).send({ error: "brand_not_found" });
      return;
    }
    return brand;
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
  }>("/public/search", async (request) => {
    const asList = (value?: string | string[]) =>
      Array.isArray(value)
        ? value.flatMap((entry) => entry.split(",")).map((entry) => entry.trim()).filter(Boolean)
        : value
          ? value.split(",").map((entry) => entry.trim()).filter(Boolean)
          : undefined;

    return buildPublicUnifiedSearch(context, {
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
    });
  });

  app.addHook("preHandler", async (request, reply) => {
    if (!request.url.startsWith("/internal")) return;
    await auth(request, reply);
    if (reply.sent) return reply;
  });

  app.get<{
    Querystring: {
      limit?: string;
      offset?: string;
    };
  }>("/internal/stores", async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "stores:list", 20, 60_000)) return;
    const stores = await context.repository.listStores();
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
          size: await context.repository.getStoreSizeSummary(store.id),
        })),
      ),
    };
  });

  app.get<{ Params: { id: string } }>("/internal/stores/:id", async (request, reply) => {
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

  app.get<{ Params: { id: string } }>("/internal/stores/:id/size", async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.read"])) return;
    if (!consumeRate(request, "stores:size", 60, 60_000, reply)) return;
    const size = await context.repository.getStoreSizeSummary(request.params.id);
    if (!size) {
      reply.code(404).send({ error: "size_not_found" });
      return;
    }
    return size;
  });

  app.post<{ Params: { id: string } }>("/internal/stores/:id/probe", async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "queue:probe", 10, 60_000, reply)) return;
    await queue.enqueueProbe({ storeId: request.params.id, actor: "api" });
    reply.code(202).send({ enqueued: true, queue: "probe", storeId: request.params.id });
  });

  app.post<{ Params: { id: string } }>("/internal/stores/:id/sync", async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "queue:sync", 10, 60_000, reply)) return;
    await queue.enqueueSync({ storeId: request.params.id, actor: "api" });
    reply.code(202).send({ enqueued: true, queue: "sync", storeId: request.params.id });
  });

  app.post("/internal/discovery/rescan", async (request, reply) => {
    if (!requireCatalogScopes(request, reply, ["catalog.queue"])) return;
    if (!consumeRate(request, "queue:discovery", 2, 60_000, reply)) return;
    await queue.enqueueDiscoveryRescan({ actor: "api" });
    reply.code(202).send({ enqueued: true, queue: "discovery" });
  });

  app.post<{
    Body: {
      limit?: number;
      includeDiscovery?: boolean;
      officialOnly?: boolean;
      dedupeByDomain?: boolean;
      concurrency?: number;
    };
  }>("/internal/catalog/refresh", async (request, reply) => {
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
    reply.code(200).send(result);
  });

  app.post<{
    Body: {
      includeZeroProducts?: boolean;
      limit?: number;
      concurrency?: number;
    };
  }>("/internal/catalog/retry-failed", async (request, reply) => {
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

  app.get("/internal/coverage/summary", async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "coverage:summary", 60, 60_000)) return;
    return context.coverageService.summarizeCoverage();
  });

  app.get("/internal/domains/backlog", async (request, reply) => {
    if (!guard(request, reply, ["catalog.read"], "domains:backlog", 60, 60_000)) return;
    return context.coverageService.listBacklog();
  });

  app.get<{ Params: { id: string } }>("/internal/domains/:id/evidence", async (request, reply) => {
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
  }>("/internal/domains/:id/session", async (request, reply) => {
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
  }>("/internal/domains/:id/feed-sync", async (request, reply) => {
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
  }>("/internal/search", async (request, reply) => {
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
