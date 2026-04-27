import type { CatalogContext } from "../bootstrap.js";
import { CatalogRefreshService, type CatalogRefreshResult } from "./catalogRefreshService.js";
import { CurrentCatalogSyncService } from "./currentCatalogSyncService.js";
import { isScrapeExcludedStore } from "../catalog/scrapeExclusions.js";

export interface ProductPullCycleOptions {
  actor: string;
  concurrency?: number;
  currentLimit?: number;
  zeroLimit?: number;
  includeZeroProducts?: boolean;
  includeUnofficial?: boolean;
  currentProgress?: (result: CatalogRefreshResult["results"][number], completed: number, total: number) => void;
  zeroProgress?: (result: CatalogRefreshResult["results"][number], completed: number, total: number) => void;
}

export interface ProductPullCycleResult {
  generatedAt: string;
  args: ProductPullCycleOptions;
  before: ProductPullCounts;
  after: ProductPullCounts;
  delta: {
    storesWithProducts: number;
    totalProducts: number;
    totalVariants: number;
    totalOffers: number;
  };
  currentSync: Awaited<ReturnType<CurrentCatalogSyncService["syncCurrentSites"]>>;
  zeroProductRefresh?: {
    selectedStores: number;
    selectedStoreIds: string[];
    refresh: Awaited<ReturnType<CatalogRefreshService["refresh"]>>;
  };
}

interface ProductPullCounts {
  stores: number;
  storesWithWebsite: number;
  storesWithProducts: number;
  zeroProductStores: number;
  totalProducts: number;
  totalVariants: number;
  totalOffers: number;
}

export async function getProductPullCounts(context: CatalogContext): Promise<ProductPullCounts> {
  const stores = await context.repository.listStores();
  const sizes = await context.repository.listStoreSizeSummaries();
  const sizeByStoreId = new Map(sizes.map((summary) => [summary.storeId, summary]));

  let storesWithProducts = 0;
  let storesWithWebsite = 0;
  let zeroProductStores = 0;
  for (const store of stores) {
    if (store.website) storesWithWebsite += 1;
    const count = sizeByStoreId.get(store.id)?.indexedProductCount ?? 0;
    if (count > 0) storesWithProducts += 1;
    if (store.website && count <= 0) zeroProductStores += 1;
  }

  return {
    stores: stores.length,
    storesWithWebsite,
    storesWithProducts,
    zeroProductStores,
    totalProducts: sizes.reduce((sum, item) => sum + item.indexedProductCount, 0),
    totalVariants: sizes.reduce((sum, item) => sum + item.indexedVariantCount, 0),
    totalOffers: sizes.reduce((sum, item) => sum + item.activeOfferCount, 0),
  };
}

export async function runProductPullCycle(
  context: CatalogContext,
  refreshService: CatalogRefreshService,
  currentSyncService: CurrentCatalogSyncService,
  args: ProductPullCycleOptions,
): Promise<ProductPullCycleResult> {
  const before = await getProductPullCounts(context);

  const currentSync = await currentSyncService.syncCurrentSites({
    actor: args.actor,
    limit: args.currentLimit,
    concurrency: args.concurrency,
    dedupeByDomain: true,
    officialOnly: !args.includeUnofficial,
    progress: args.currentProgress,
  });

  let zeroProductRefresh:
    | {
        selectedStores: number;
        selectedStoreIds: string[];
        refresh: Awaited<ReturnType<CatalogRefreshService["refresh"]>>;
      }
    | undefined;

  if (args.includeZeroProducts) {
    const stores = await context.repository.listStores();
    const sizes = await context.repository.listStoreSizeSummaries();
    const sizeByStoreId = new Map(sizes.map((summary) => [summary.storeId, summary]));
    const candidates = stores.filter((store) => {
      if (!store.website) return false;
      if (!args.includeUnofficial && store.websiteType !== "official") return false;
      if (isScrapeExcludedStore(store)) return false;
      const count = sizeByStoreId.get(store.id)?.indexedProductCount ?? 0;
      return count <= 0;
    });
    const selected = args.zeroLimit ? candidates.slice(0, args.zeroLimit) : candidates;
    const refresh = await refreshService.refresh({
      actor: `${args.actor}:zero-products`,
      includeDiscovery: false,
      officialOnly: !args.includeUnofficial,
      dedupeByDomain: true,
      storeIds: selected.map((store) => store.id),
      concurrency: args.concurrency,
      progress: args.zeroProgress,
    });
    zeroProductRefresh = {
      selectedStores: selected.length,
      selectedStoreIds: selected.map((store) => store.id),
      refresh,
    };
  }

  const after = await getProductPullCounts(context);

  return {
    generatedAt: new Date().toISOString(),
    args,
    before,
    after,
    delta: {
      storesWithProducts: after.storesWithProducts - before.storesWithProducts,
      totalProducts: after.totalProducts - before.totalProducts,
      totalVariants: after.totalVariants - before.totalVariants,
      totalOffers: after.totalOffers - before.totalOffers,
    },
    currentSync,
    zeroProductRefresh,
  };
}
