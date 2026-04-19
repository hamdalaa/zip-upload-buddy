import { buildSearchDocument } from "../catalog/searchDocuments.js";
import { summarizeStoreSize } from "../catalog/storeSizing.js";
import { createId, nowIso } from "../catalog/normalization.js";
import type { CatalogProductDraft, PartnerFeedRecord } from "../catalog/types.js";
import type { CatalogRepository } from "../repositories/contracts.js";
import type { SearchEngine } from "../search/contracts.js";
import { CoverageService } from "./coverageService.js";

export interface FeedSyncInput {
  sourceUrl: string;
  authHeaders?: Record<string, string>;
  fieldMap?: Record<string, string>;
}

export class FeedSyncService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly searchEngine: SearchEngine,
    private readonly coverageService: CoverageService,
  ) {}

  async saveAndSync(storeId: string, input: FeedSyncInput, actor: string): Promise<PartnerFeedRecord> {
    const now = nowIso();
    const pendingFeed: PartnerFeedRecord = {
      storeId,
      status: "syncing",
      feedType: "json",
      sourceUrl: input.sourceUrl,
      authHeaders: input.authHeaders,
      fieldMap: input.fieldMap,
      updatedAt: now,
      lastSyncAt: undefined,
      lastError: undefined,
    };
    await this.repository.upsertPartnerFeed(pendingFeed);

    const store = await this.repository.getStoreById(storeId);
    if (!store) throw new Error(`Store ${storeId} not found.`);

    try {
      const payload = await fetchJsonFeed(input.sourceUrl, input.authHeaders);
      const products = mapFeedProducts(storeId, payload, input.fieldMap);
      await this.repository.replaceCatalogSnapshot(storeId, products, [], []);
      const summary = summarizeStoreSize({
        storeId,
        products,
        variants: [],
        offers: [],
        estimatedCatalogSize: products.length,
        lastSuccessfulSyncAt: now,
      });
      await this.repository.saveStoreSizeSummary(summary);
      await this.searchEngine.replaceStoreDocuments(
        storeId,
        products.map((product) => buildSearchDocument(store, product)),
      );

      const completedFeed: PartnerFeedRecord = {
        ...pendingFeed,
        status: "ready",
        updatedAt: nowIso(),
        lastSyncAt: nowIso(),
      };
      await this.repository.upsertPartnerFeed(completedFeed);
      await this.coverageService.saveSuccessfulCoverage(store, {
        indexedProducts: products.length,
      });
      await this.repository.createAuditLog({
        id: createId("audit"),
        actor,
        action: "partner_feed_sync",
        storeId,
        details: {
          sourceUrl: input.sourceUrl,
          products: products.length,
        },
        createdAt: nowIso(),
      });
      return completedFeed;
    } catch (error) {
      const failedFeed: PartnerFeedRecord = {
        ...pendingFeed,
        status: "failed",
        updatedAt: nowIso(),
        lastError: error instanceof Error ? error.message : "unknown_feed_error",
      };
      await this.repository.upsertPartnerFeed(failedFeed);
      await this.coverageService.saveFailureCoverage(
        store,
        error instanceof Error ? error.message : "unknown_feed_error",
        input.sourceUrl,
      );
      throw error;
    }
  }
}

async function fetchJsonFeed(sourceUrl: string, authHeaders?: Record<string, string>): Promise<unknown[]> {
  const response = await fetch(sourceUrl, {
    headers: {
      accept: "application/json,text/plain,*/*",
      ...(authHeaders ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch partner feed ${sourceUrl}: ${response.status}`);
  }
  const payload = await response.json();
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const items = (payload as Record<string, unknown>).items;
    if (Array.isArray(items)) return items;
  }
  throw new Error("Partner feed did not return a JSON array or { items: [] }.");
}

function mapFeedProducts(
  storeId: string,
  items: unknown[],
  fieldMap?: Record<string, string>,
): CatalogProductDraft[] {
  const mapField = (source: Record<string, unknown>, logical: string) => {
    const sourceKey = fieldMap?.[logical] ?? logical;
    return source[sourceKey];
  };

  const products: CatalogProductDraft[] = [];
  for (const item of items) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) continue;
    const source = item as Record<string, unknown>;
    const title = String(mapField(source, "title") ?? mapField(source, "name") ?? "").trim();
    const sourceUrl = String(mapField(source, "url") ?? "").trim();
    if (!title || !sourceUrl) continue;
    const availabilityRaw = String(mapField(source, "availability") ?? "").toLowerCase();
    const livePrice = numberOrUndefined(mapField(source, "price"));
    const originalPrice = numberOrUndefined(mapField(source, "originalPrice"));
    products.push({
      storeId,
      sourceProductId: String(mapField(source, "id") ?? sourceUrl),
      normalizedTitle: title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ""),
      title,
      brand: stringOrUndefined(mapField(source, "brand")),
      model: stringOrUndefined(mapField(source, "model")),
      sku: stringOrUndefined(mapField(source, "sku")),
      categoryPath: stringToPath(stringOrUndefined(mapField(source, "category"))),
      sourceUrl,
      imageUrl: stringOrUndefined(mapField(source, "imageUrl") ?? mapField(source, "image")),
      availability: availabilityRaw.includes("out")
        ? "out_of_stock"
        : availabilityRaw.includes("pre")
          ? "preorder"
          : "in_stock",
      currency: String(mapField(source, "currency") ?? "IQD"),
      livePrice,
      originalPrice,
      onSale:
        originalPrice != null &&
        livePrice != null &&
        originalPrice > livePrice,
      sourceConnector: "generic_json_catalog",
      freshnessAt: nowIso(),
      lastSeenAt: nowIso(),
      brandTokens: stringOrUndefined(mapField(source, "brand")) ? [String(mapField(source, "brand")).toLowerCase()] : [],
      modelTokens: [],
      skuTokens: stringOrUndefined(mapField(source, "sku")) ? [String(mapField(source, "sku")).toLowerCase()] : [],
      rawPayload: source,
    });
  }
  return products;
}

function stringOrUndefined(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[,،]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function stringToPath(value?: string): string[] {
  if (!value) return [];
  return value.split(/[>/|]+/).map((item) => item.trim()).filter(Boolean);
}
