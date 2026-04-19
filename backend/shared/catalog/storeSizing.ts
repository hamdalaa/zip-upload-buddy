import type { CatalogProductDraft, ProductVariantDraft, OfferDraft, StoreSizeSummaryRecord, SyncPriorityTier } from "./types.js";
import { nowIso } from "./normalization.js";
import { chooseSyncPriority } from "./syncPolicy.js";

export interface StoreCatalogStatsInput {
  storeId: string;
  products: CatalogProductDraft[];
  variants: ProductVariantDraft[];
  offers: OfferDraft[];
  estimatedCatalogSize?: number;
  lastSuccessfulSyncAt?: string;
}

export function computeCoveragePercentage(indexedCount: number, estimatedCatalogSize?: number): number {
  if (!estimatedCatalogSize || estimatedCatalogSize <= 0) return indexedCount > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((indexedCount / estimatedCatalogSize) * 10000) / 100));
}

export function summarizeStoreSize(input: StoreCatalogStatsInput): StoreSizeSummaryRecord {
  const categoryCount = new Set(input.products.flatMap((product) => product.categoryPath)).size;
  const estimatedCatalogSize = Math.max(input.estimatedCatalogSize ?? input.products.length, input.products.length);
  const coveragePct = computeCoveragePercentage(input.products.length, estimatedCatalogSize);
  const syncPriorityTier: SyncPriorityTier = chooseSyncPriority({
    indexedProductCount: input.products.length,
    activeOfferCount: input.offers.filter((offer) => offer.active).length,
    coveragePct,
  });

  return {
    storeId: input.storeId,
    indexedProductCount: input.products.length,
    indexedVariantCount: input.variants.length,
    activeOfferCount: input.offers.filter((offer) => offer.active).length,
    categoryCount,
    lastSuccessfulSyncAt: input.lastSuccessfulSyncAt,
    estimatedCatalogSize,
    coveragePct,
    syncPriorityTier,
    computedAt: nowIso(),
  };
}
