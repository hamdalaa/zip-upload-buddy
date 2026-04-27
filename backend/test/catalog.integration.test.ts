import { describe, expect, it } from "vitest";
import { createCatalogContext } from "../shared/bootstrap.js";
import { DiscoveryService } from "../shared/services/discoveryService.js";
import { ProbeService } from "../shared/services/probeService.js";
import { SyncService } from "../shared/services/syncService.js";
import { CoverageService } from "../shared/services/coverageService.js";
import { FeedSyncService } from "../shared/services/feedSyncService.js";
import { MemoryCatalogRepository } from "../shared/repositories/memoryCatalogRepository.js";
import { MemorySearchEngine } from "../shared/search/memorySearchEngine.js";
import { catalogConfig } from "../shared/config.js";
import { createFixtureHttpClient, FakeObjectStorage } from "./helpers/fakes.js";
import type { StoreRecord } from "../shared/catalog/types.js";
import { compactText, nowIso } from "../shared/catalog/normalization.js";
import { createCatalogApiServer } from "../api/server.js";
import { RecordingQueue } from "./helpers/fakes.js";
import { buildSignedHeaders } from "../shared/security/requestSigning.js";
import { hashServiceToken } from "../shared/security/tokenHash.js";

const fixtureRoutes = {
  "https://miswag.com/": "miswag-home.html",
  "https://www.elryan.com/": "elryan-home.html",
  "https://www.elryan.com/api/catalog/vue_storefront_magento_ar/category/_search?_source_include=id,name,parent_id,product_count,is_active&from=0&size=4000&sort=position:asc": "elryan-api-categories.json",
  "https://www.elryan.com/api/catalog/vue_storefront_magento_ar/product/_search?_source_include=id%2Csku%2Cslug%2Curl_key%2Curl_path%2Cname%2Cdescription%2Cimage%2Csmall_image%2Cthumbnail%2Cswatch_image%2Cmedia_gallery.image%2Ccategory.category_id%2Ccategory.name%2Ccategory_ids%2Cstock.qty%2Cstock.is_in_stock%2Cstock.stock_status%2Cregular_price%2Coriginal_price%2Cfinal_price%2Cspecial_price%2Cupdated_at&from=0&size=200&sort=id:asc&preference=hayr_v2_after_0": "elryan-api-products-category-42.json",
  "https://www.icenter-iraq.com/": "icenter-home.html",
  "https://www.icenter-iraq.com/wp-json/wc/store/v1/products?per_page=100&page=1": "icenter-products.json",
  "https://www.icenter-iraq.com/wp-json/wc/store/v1/products?per_page=100&page=2": "icenter-products-page2.json",
  "https://korektel.com/": "korektel-home.html",
  "https://korektel.com/sitemap.xml": "sitemap.xml",
  "https://korektel.com/product/macbook-air-m3": "korektel-home.html",
};

function makeStore(id: string, name: string, website: string): StoreRecord {
  const timestamp = nowIso();
  return {
    id,
    name,
    normalizedName: compactText(name),
    slug: compactText(name),
    discoverySource: "manual_seed",
    status: "probe_pending",
    createdAt: timestamp,
    updatedAt: timestamp,
    website,
    websiteType: "official",
  };
}

async function createFixtureContext() {
  const repository = new MemoryCatalogRepository();
  const searchEngine = new MemorySearchEngine();
  const client = createFixtureHttpClient(fixtureRoutes);
  const discoveryService = new DiscoveryService(repository);
  const coverageService = new CoverageService(repository);
  const probeService = new ProbeService(repository, client);
  const syncService = new SyncService(
    repository,
    client,
    probeService,
    searchEngine,
    new FakeObjectStorage(),
    Buffer.alloc(32, 1),
  );
  const feedSyncService = new FeedSyncService(repository, searchEngine, coverageService);

  await repository.syncServiceTokens(
    catalogConfig.internalServiceTokens.map((token) => ({
      name: token.name,
      tokenHash: hashServiceToken(token.token, catalogConfig.tokenPepper),
      scopes: token.scopes,
    })),
  );

  return {
    repository,
    searchEngine,
    discoveryService,
    probeService,
    syncService,
    coverageService,
    feedSyncService,
  };
}

async function waitForCatalogJob(app: Awaited<ReturnType<typeof createCatalogApiServer>>, jobId: string) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const job = await app.inject({
      method: "GET",
      url: `/internal/catalog/jobs/${jobId}`,
      headers: buildSignedHeaders("dev-read-token", "GET", `/internal/catalog/jobs/${jobId}`),
    });
    expect(job.statusCode).toBe(200);
    const body = job.json();
    if (body.status === "completed" || body.status === "failed") {
      return body;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for catalog job ${jobId}`);
}

describe("catalog integration", () => {
  it("probes, syncs, sizes, and searches canary stores", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();
    const client = createFixtureHttpClient(fixtureRoutes);
    const probeService = new ProbeService(repository, client);
    const syncService = new SyncService(
      repository,
      client,
      probeService,
      searchEngine,
      new FakeObjectStorage(),
      Buffer.alloc(32, 1),
    );
    const stores = [
      makeStore("miswag", "Miswag", "https://miswag.com/"),
      makeStore("elryan", "ElRyan", "https://www.elryan.com/"),
      makeStore("icenter", "iCenter Iraq", "https://www.icenter-iraq.com/"),
      makeStore("korektel", "KorekTel", "https://korektel.com/"),
    ];

    for (const store of stores) {
      await repository.upsertStore(store);
      await probeService.probeStore(store.id, "test", "manual");
      await syncService.syncStore(store.id, "test", "manual");
    }

    const miswagSize = await repository.getStoreSizeSummary("miswag");
    expect(miswagSize?.indexedProductCount).toBe(2);
    expect(miswagSize?.activeOfferCount).toBeGreaterThan(0);

    const rtxSearch = await searchEngine.search({ q: "RTX 5090", limit: 10 });
    expect(rtxSearch.hits[0]?.storeName).toBe("Miswag");

    const macMiniSearch = await searchEngine.search({ q: "Mac mini", limit: 10 });
    expect(macMiniSearch.hits.some((hit) => hit.title.includes("Mac mini"))).toBe(true);

    const arabicSearch = await searchEngine.search({ q: "ماك بوك", limit: 10 });
    expect(arabicSearch.hits.some((hit) => hit.storeName === "KorekTel")).toBe(true);

    const typoSearch = await searchEngine.search({ q: "iphnoe 16", limit: 10 });
    expect(typoSearch.hits.some((hit) => hit.title.includes("iPhone 16"))).toBe(true);

    const saleSearch = await searchEngine.search({ q: "Apple", onSale: true, limit: 10 });
    expect(saleSearch.hits.every((hit) => hit.onSale)).toBe(true);
  });

  it("protects internal endpoints with bearer auth and enqueues jobs", async () => {
    const context = await createCatalogContext({ useMemory: true });
    const queue = new RecordingQueue();
    const app = await createCatalogApiServer(context, queue);

    const docs = await app.inject({
      method: "GET",
      url: "/docs/json",
    });
    expect(docs.statusCode).toBe(200);
    const spec = docs.json();
    expect(spec.openapi).toBe("3.0.3");
    expect(spec.paths["/public/bootstrap"]).toBeDefined();
    expect(spec.paths["/internal/stores"]).toBeDefined();

    const withoutAuth = await app.inject({
      method: "GET",
      url: "/internal/stores",
    });
    expect(withoutAuth.statusCode).toBe(401);

    const withAuth = await app.inject({
      method: "POST",
      url: "/internal/discovery/rescan",
      headers: buildSignedHeaders("dev-operator-token", "POST", "/internal/discovery/rescan"),
    });
    expect(withAuth.statusCode).toBe(202);
    expect(queue.discoveryJobs).toHaveLength(1);

    const replayHeaders = buildSignedHeaders("dev-read-token", "GET", "/internal/stores");
    const firstReplayAttempt = await app.inject({
      method: "GET",
      url: "/internal/stores",
      headers: replayHeaders,
    });
    expect(firstReplayAttempt.statusCode).toBe(200);

    const secondReplayAttempt = await app.inject({
      method: "GET",
      url: "/internal/stores",
      headers: replayHeaders,
    });
    expect(secondReplayAttempt.statusCode).toBe(409);

    const wrongScope = await app.inject({
      method: "POST",
      url: "/internal/stores/miswag/sync",
      headers: buildSignedHeaders("dev-read-token", "POST", "/internal/stores/miswag/sync"),
    });
    expect(wrongScope.statusCode).toBe(403);

    await app.close();
  });

  it("requires authentication on every documented internal route except login and session", async () => {
    const context = await createCatalogContext({ useMemory: true });
    const app = await createCatalogApiServer(context, new RecordingQueue());

    try {
      const docs = await app.inject({
        method: "GET",
        url: "/docs/json",
      });
      expect(docs.statusCode).toBe(200);

      const spec = docs.json() as {
        paths: Record<string, Record<string, unknown>>;
      };
      const unauthenticatedAllowed = new Set(["/internal/auth/login", "/internal/auth/session"]);
      type InjectMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      const protectedOperations: Array<{ method: InjectMethod; url: string }> = Object.entries(spec.paths).flatMap(([path, methods]) => {
        if (!path.startsWith("/internal/") || unauthenticatedAllowed.has(path)) return [];
        return Object.keys(methods)
          .filter((method) => ["get", "post", "put", "patch", "delete"].includes(method))
          .map((method) => ({
            method: method.toUpperCase() as InjectMethod,
            url: path.replace(/\{[^}]+\}/g, "sample"),
          }));
      });

      expect(protectedOperations.length).toBeGreaterThan(10);
      for (const operation of protectedOperations) {
        const response = await app.inject({
          method: operation.method,
          url: operation.url,
          payload: operation.method === "GET" ? undefined : {},
        });
        expect(response.statusCode, `${operation.method} ${operation.url}`).toBe(401);
      }
    } finally {
      await app.close();
    }
  });

  it("supports browser admin sessions with csrf-protected writes and site settings", async () => {
    const context = await createCatalogContext({ useMemory: true });
    const queue = new RecordingQueue();
    const app = await createCatalogApiServer(context, queue);

    const badLogin = await app.inject({
      method: "POST",
      url: "/internal/auth/login",
      payload: { secret: "wrong-secret" },
    });
    expect(badLogin.statusCode).toBe(401);

    const login = await app.inject({
      method: "POST",
      url: "/internal/auth/login",
      payload: { secret: catalogConfig.admin.loginSecret },
    });
    expect(login.statusCode).toBe(200);
    expect(login.headers["set-cookie"]).toContain("hayr_admin_session=");
    expect(login.headers["set-cookie"]).toContain("HttpOnly");
    const cookie = String(login.headers["set-cookie"]).split(";")[0];

    const session = await app.inject({
      method: "GET",
      url: "/internal/auth/session",
      headers: { cookie },
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().authenticated).toBe(true);
    const csrfToken = session.json().csrfToken as string;
    expect(csrfToken).toBeTruthy();

    const readWithSession = await app.inject({
      method: "GET",
      url: "/internal/stores",
      headers: { cookie },
    });
    expect(readWithSession.statusCode).toBe(200);

    const writeWithoutCsrf = await app.inject({
      method: "POST",
      url: "/internal/discovery/rescan",
      headers: { cookie },
    });
    expect(writeWithoutCsrf.statusCode).toBe(403);

    const writeWithCsrf = await app.inject({
      method: "POST",
      url: "/internal/discovery/rescan",
      headers: { cookie, "x-admin-csrf": csrfToken },
    });
    expect(writeWithCsrf.statusCode).toBe(202);
    expect(queue.discoveryJobs).toHaveLength(1);

    const settings = await app.inject({
      method: "PUT",
      url: "/internal/settings/site",
      headers: { cookie, "x-admin-csrf": csrfToken },
      payload: {
        hero: {
          badgeText: "اختبار أدمن",
          title: "عنوان اختبار",
          subtitle: "وصف اختبار",
          storeMetricLabel: "متاجر",
          productMetricLabel: "منتجات",
          coverageMetricValue: "IQ",
          coverageMetricLabel: "تغطية",
        },
        seo: { title: "SEO", description: "Desc" },
        featured: { storeIds: [], brandSlugs: [], categoryKeys: [] },
        theme: { primaryHue: 200, accentHue: 40, surfaceTone: "cool" },
      },
    });
    expect(settings.statusCode).toBe(200);
    expect(settings.json().payload.hero.badgeText).toBe("اختبار أدمن");

    const publicSettings = await app.inject({
      method: "GET",
      url: "/public/settings/site",
    });
    expect(publicSettings.statusCode).toBe(200);
    expect(publicSettings.json().payload.hero.badgeText).toBe("اختبار أدمن");

    const logout = await app.inject({
      method: "POST",
      url: "/internal/auth/logout",
      headers: { cookie, "x-admin-csrf": csrfToken },
    });
    expect(logout.statusCode).toBe(200);
    expect(logout.headers["set-cookie"]).toContain("Max-Age=0");

    await app.close();
  });

  it("permits CORS requests only from configured origins", async () => {
    const context = await createCatalogContext({ useMemory: true });
    const app = await createCatalogApiServer(context, new RecordingQueue());

    try {
      const origin = "https://h-db.site";
      const preflight = await app.inject({
        method: "OPTIONS",
        url: "/public/healthz",
        headers: {
          origin,
          "access-control-request-method": "GET",
          "access-control-request-headers": "authorization,content-type,x-catalog-timestamp,x-catalog-nonce,x-catalog-signature,x-admin-csrf",
        },
      });
      expect(preflight.statusCode).toBe(204);
      expect(preflight.headers["access-control-allow-origin"]).toBe(origin);
      expect(preflight.headers["access-control-allow-credentials"]).toBe("true");
      expect(preflight.headers["access-control-allow-methods"]).toContain("PATCH");
      expect(preflight.headers["access-control-allow-headers"]).toContain("x-catalog-signature");
      expect(preflight.headers["access-control-allow-headers"]).toContain("x-admin-csrf");

      const localhostOrigin = await app.inject({
        method: "GET",
        url: "/public/healthz",
        headers: {
          origin: "http://localhost:8080",
        },
      });
      expect(localhostOrigin.statusCode).toBe(200);
      expect(localhostOrigin.headers["access-control-allow-origin"]).toBeUndefined();

      const unknownOrigin = await app.inject({
        method: "GET",
        url: "/public/healthz",
        headers: {
          origin: "https://unlisted-client.example",
        },
      });
      expect(unknownOrigin.statusCode).toBe(200);
      expect(unknownOrigin.headers["access-control-allow-origin"]).toBeUndefined();

      const bareOptions = await app.inject({
        method: "OPTIONS",
        url: "/public/healthz",
      });
      expect(bareOptions.statusCode).toBe(404);
    } finally {
      await app.close();
    }
  });

  it("redacts sensitive infrastructure details from internal health responses", async () => {
    const context = await createCatalogContext({ useMemory: true });
    const app = await createCatalogApiServer(context, new RecordingQueue());

    try {
      const response = await app.inject({
        method: "GET",
        url: "/internal/health",
        headers: buildSignedHeaders("dev-read-token", "GET", "/internal/health"),
      });
      expect(response.statusCode).toBe(200);
      const body = response.json();
      const serialized = JSON.stringify(body);

      expect(body.ok).toBe(true);
      expect(body.runtime.pid).toBeUndefined();
      expect(body.runtime.nodeEnv).toBeUndefined();
      expect(body.runtime.uptimeSeconds).toBeUndefined();
      expect(body.database.sqlitePath).toBeUndefined();
      expect(body.database.configured).toBe(true);
      expect(body.redis.url).toBeUndefined();
      expect(body.redis.configured).toBe(true);
      expect(body.publicApi.healthzUrl).toBeUndefined();
      expect(body.flags.skipScrapedImport).toBeUndefined();
      expect(body.flags.skipStartupReindex).toBeUndefined();
      expect(serialized).not.toContain(catalogConfig.database.sqlitePath);
      expect(serialized).not.toContain(catalogConfig.redisUrl);
    } finally {
      await app.close();
    }
  });

  it("redacts sensitive infrastructure details from catalog quality summary", async () => {
    const context = await createCatalogContext({ useMemory: true });
    const app = await createCatalogApiServer(context, new RecordingQueue());

    try {
      const response = await app.inject({
        method: "GET",
        url: "/internal/catalog/data-quality/summary",
        headers: buildSignedHeaders("dev-read-token", "GET", "/internal/catalog/data-quality/summary"),
      });
      expect(response.statusCode).toBe(200);
      const serialized = JSON.stringify(response.json());
      expect(serialized).not.toContain(catalogConfig.database.sqlitePath);
      expect(serialized).not.toContain(catalogConfig.redisUrl);
    } finally {
      await app.close();
    }
  });

  it("caps public catalog product page size to reduce bulk scraping", async () => {
    const context = await createCatalogContext({ useMemory: true });
    const app = await createCatalogApiServer(context, new RecordingQueue());

    try {
      const response = await app.inject({
        method: "GET",
        url: "/public/catalog-products?limit=10000",
      });
      expect(response.statusCode).toBe(200);
      expect(response.json().limit).toBe(250);
    } finally {
      await app.close();
    }
  });

  it("imports discovery seeds into the in-memory registry", async () => {
    const repository = new MemoryCatalogRepository();
    const discovery = new DiscoveryService(repository);
    const result = await discovery.rescan("test");

    expect(result.storesImported).toBeGreaterThan(3000);
    const stores = await repository.listStores();
    expect(stores.some((store) => store.name === "Miswag")).toBe(true);
  });

  it("creates a store from a submitted website and syncs it immediately", async () => {
    const context = await createFixtureContext();
    const app = await createCatalogApiServer(context, new RecordingQueue());

    const intake = await app.inject({
      method: "POST",
      url: "/internal/stores/intake",
      headers: buildSignedHeaders("dev-operator-token", "POST", "/internal/stores/intake"),
      payload: {
        website: "www.icenter-iraq.com",
        name: "iCenter Iraq",
        city: "Baghdad",
      },
    });

    expect(intake.statusCode).toBe(200);
    const body = intake.json();
    expect(body.existed).toBe(true);
    expect(body.store.name).toBe("iCenter Iraq");
    expect(body.store.website).toBe("https://www.icenter-iraq.com/");
    expect(body.refresh.status).toBe("synced");
    expect(body.connectorProfile.connectorType).toBe("woocommerce");
    expect(body.size.indexedProductCount).toBeGreaterThan(0);

    await app.close();
  });

  it("runs background catalog jobs for one store URL and store-by-store updates", async () => {
    const context = await createFixtureContext();
    const queue = new RecordingQueue();
    const app = await createCatalogApiServer(context, queue);

    const pullFromUrl = await app.inject({
      method: "POST",
      url: "/internal/catalog/pull-store-url",
      headers: buildSignedHeaders("dev-operator-token", "POST", "/internal/catalog/pull-store-url"),
      payload: {
        website: "www.icenter-iraq.com",
        name: "iCenter Iraq",
        cityAr: "بغداد",
      },
    });
    expect(pullFromUrl.statusCode).toBe(202);
    const pullJob = await waitForCatalogJob(app, pullFromUrl.json().jobId);
    expect(pullJob.kind).toBe("store-url-pull");
    expect(pullJob.status).toBe("completed");
    expect(pullJob.result.enqueuedSync).toBe(true);
    expect(queue.syncJobs.some((job) => job.storeId === pullJob.result.store.id)).toBe(true);

    await context.probeService.probeStore(pullJob.result.store.id, "test", "manual");
    await context.syncService.syncStore(pullJob.result.store.id, "test", "manual");

    const updateStores = await app.inject({
      method: "POST",
      url: "/internal/catalog/update-stores",
      headers: buildSignedHeaders("dev-operator-token", "POST", "/internal/catalog/update-stores"),
      payload: {
        limit: 1,
        concurrency: 1,
        officialOnly: true,
      },
    });
    expect(updateStores.statusCode).toBe(202);
    const updateJob = await waitForCatalogJob(app, updateStores.json().jobId);
    expect(updateJob.kind).toBe("store-by-store-update");
    expect(updateJob.status).toBe("completed");
    expect(updateJob.result.selectedStores).toBe(1);
    expect(updateJob.result.enqueuedStores).toBe(1);
    expect(queue.syncJobs.length).toBeGreaterThanOrEqual(2);

    await app.close();
  }, 15000);

  it("syncs current indexed sites with a single internal action", async () => {
    const context = await createFixtureContext();
    const stores = [
      makeStore("miswag", "Miswag", "https://miswag.com/"),
      makeStore("elryan", "ElRyan", "https://www.elryan.com/"),
      makeStore("icenter", "iCenter Iraq", "https://www.icenter-iraq.com/"),
    ];

    for (const store of stores) {
      await context.repository.upsertStore(store);
      await context.probeService.probeStore(store.id, "test", "manual");
      await context.syncService.syncStore(store.id, "test", "manual");
    }

    const pendingStore = makeStore("unsynced", "Unsynced Store", "https://korektel.com/");
    await context.repository.upsertStore(pendingStore);

    const app = await createCatalogApiServer(context, new RecordingQueue());

    const response = await app.inject({
      method: "POST",
      url: "/internal/catalog/sync-current",
      headers: buildSignedHeaders("dev-operator-token", "POST", "/internal/catalog/sync-current"),
      payload: {
        concurrency: 2,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.selectedStores).toBe(3);
    expect(body.selectedStoreIds).toEqual(expect.arrayContaining(["miswag", "elryan", "icenter"]));
    expect(body.selectedStoreIds).not.toContain("unsynced");
    expect(body.refresh.syncedStores).toBe(3);

    await app.close();
  });

  it("serves coverage/backlog data and protects session/feed workflows by scope", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "https://partner-feed.test/feed.json") {
        return new Response(
          JSON.stringify([
            {
              id: "feed-1",
              title: "Feed Product One",
              url: "https://partner-feed.test/p/feed-1",
              price: 123000,
              availability: "out_of_stock",
              sku: "FP-1",
            },
          ]),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return originalFetch(input);
    }) as typeof fetch;

    try {
      const context = await createCatalogContext({ useMemory: true });
      await context.discoveryService.rescan("coverage-test");
      const app = await createCatalogApiServer(context, new RecordingQueue());
      const targetStoreId = "manual_miswag";

      const coverage = await app.inject({
        method: "GET",
        url: "/internal/coverage/summary",
        headers: buildSignedHeaders("dev-read-token", "GET", "/internal/coverage/summary"),
      });
      expect(coverage.statusCode).toBe(200);
      expect(coverage.json().totalStores).toBeGreaterThan(3000);

      const backlog = await app.inject({
        method: "GET",
        url: "/internal/domains/backlog",
        headers: buildSignedHeaders("dev-read-token", "GET", "/internal/domains/backlog"),
      });
      expect(backlog.statusCode).toBe(200);

      const badSession = await app.inject({
        method: "POST",
        url: `/internal/domains/${targetStoreId}/session`,
        headers: buildSignedHeaders("dev-read-token", "POST", `/internal/domains/${targetStoreId}/session`),
        payload: { cookiesJson: "sid=test" },
      });
      expect(badSession.statusCode).toBe(403);

      const goodSession = await app.inject({
        method: "POST",
        url: `/internal/domains/${targetStoreId}/session`,
        headers: buildSignedHeaders("dev-operator-token", "POST", `/internal/domains/${targetStoreId}/session`),
        payload: { cookiesJson: "sid=test", notes: "manual session" },
      });
      expect(goodSession.statusCode).toBe(200);

      const feedSync = await app.inject({
        method: "POST",
        url: `/internal/domains/${targetStoreId}/feed-sync`,
        headers: buildSignedHeaders("dev-operator-token", "POST", `/internal/domains/${targetStoreId}/feed-sync`),
        payload: { sourceUrl: "https://partner-feed.test/feed.json" },
      });
      expect(feedSync.statusCode).toBe(200);

      const evidence = await app.inject({
        method: "GET",
        url: `/internal/domains/${targetStoreId}/evidence`,
        headers: buildSignedHeaders("dev-read-token", "GET", `/internal/domains/${targetStoreId}/evidence`),
      });
      expect(evidence.statusCode).toBe(200);
      expect(evidence.json().partnerFeed.status).toBe("ready");

      await app.close();
    } finally {
      global.fetch = originalFetch;
    }
  }, 15000);
});
