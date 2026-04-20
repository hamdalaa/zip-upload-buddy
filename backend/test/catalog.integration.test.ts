import { describe, expect, it } from "vitest";
import { createCatalogContext } from "../shared/bootstrap.js";
import { DiscoveryService } from "../shared/services/discoveryService.js";
import { ProbeService } from "../shared/services/probeService.js";
import { SyncService } from "../shared/services/syncService.js";
import { MemoryCatalogRepository } from "../shared/repositories/memoryCatalogRepository.js";
import { MemorySearchEngine } from "../shared/search/memorySearchEngine.js";
import { createFixtureHttpClient, FakeObjectStorage } from "./helpers/fakes.js";
import type { StoreRecord } from "../shared/catalog/types.js";
import { compactText, nowIso } from "../shared/catalog/normalization.js";
import { createCatalogApiServer } from "../api/server.js";
import { RecordingQueue } from "./helpers/fakes.js";
import { buildSignedHeaders } from "../shared/security/requestSigning.js";

const fixtureRoutes = {
  "https://miswag.com/": "miswag-home.html",
  "https://www.elryan.com/": "elryan-home.html",
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

  it("imports discovery seeds into the in-memory registry", async () => {
    const repository = new MemoryCatalogRepository();
    const discovery = new DiscoveryService(repository);
    const result = await discovery.rescan("test");

    expect(result.storesImported).toBeGreaterThan(3000);
    const stores = await repository.listStores();
    expect(stores.some((store) => store.name === "Miswag")).toBe(true);
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
