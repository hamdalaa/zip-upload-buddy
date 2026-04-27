import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildSearchDocument } from "../shared/catalog/searchDocuments.js";
import { compactText, nowIso } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft, StoreRecord } from "../shared/catalog/types.js";
import { SqliteCatalogRepository } from "../shared/db/sqliteCatalogRepository.js";
import { SqliteSearchEngine } from "../shared/search/sqliteSearchEngine.js";

function makeStore(): StoreRecord {
  const timestamp = nowIso();
  return {
    id: "sqlite_store",
    name: "SQLite Store",
    normalizedName: compactText("SQLite Store"),
    slug: "sqlite-store",
    discoverySource: "manual_seed",
    status: "indexed",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSyncAt: timestamp,
    website: "https://sqlite-store.test/",
    websiteType: "official",
    primaryCategory: "Electronics",
    area: "Baghdad",
  };
}

function makeProduct(storeId: string): CatalogProductDraft {
  const timestamp = nowIso();
  return {
    storeId,
    sourceProductId: "iphone-15-pro-max",
    normalizedTitle: compactText("Apple iPhone 15 Pro Max 256GB"),
    title: "Apple iPhone 15 Pro Max 256GB",
    brand: "Apple",
    model: "iPhone 15 Pro Max",
    sku: "APL-IP15PM-256",
    categoryPath: ["Phones", "Smartphones"],
    sourceUrl: "https://sqlite-store.test/products/iphone-15-pro-max",
    imageUrl: "https://sqlite-store.test/images/iphone-15-pro-max.jpg",
    availability: "in_stock",
    currency: "IQD",
    livePrice: 1550000,
    originalPrice: 1620000,
    onSale: true,
    sourceConnector: "shopify",
    freshnessAt: timestamp,
    lastSeenAt: timestamp,
    offerLabel: "Sale",
    brandTokens: ["apple"],
    modelTokens: ["iphone", "15", "pro", "max"],
    skuTokens: ["apl", "ip15pm", "256"],
    rawPayload: {
      vendor: "Apple",
      product_type: "Phones",
    },
  };
}

describe("sqlite catalog storage", () => {
  it("persists snapshots and shares the search index across instances", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "catalog-sqlite-"));
    const dbPath = path.join(tempDir, "catalog.sqlite");

    try {
      const repository = new SqliteCatalogRepository(dbPath);
      await repository.bootstrap();

      const store = makeStore();
      const product = makeProduct(store.id);

      await repository.upsertStore(store);
      await repository.replaceCatalogSnapshot(store.id, [product], [], []);

      const writerSearch = new SqliteSearchEngine(dbPath);
      await writerSearch.ensureReady();
      await writerSearch.replaceStoreDocuments(store.id, [buildSearchDocument(store, product)]);

      const catalog = await repository.getStoreCatalog(store.id);
      expect(catalog.products).toHaveLength(1);

      const docs = await repository.listSearchDocuments();
      expect(docs).toHaveLength(1);
      expect(docs[0]?.title).toContain("iPhone 15 Pro Max");

      const readerSearch = new SqliteSearchEngine(dbPath);
      const result = await readerSearch.search({
        q: "iphnoe 15",
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.hits[0]?.storeId).toBe(store.id);
      expect(result.hits[0]?.title).toContain("iPhone 15 Pro Max");

      const firstNonce = await repository.registerRequestNonce("nonce:test", new Date(Date.now() + 60_000).toISOString());
      const replayNonce = await repository.registerRequestNonce("nonce:test", new Date(Date.now() + 60_000).toISOString());
      expect(firstNonce).toBe(true);
      expect(replayNonce).toBe(false);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
