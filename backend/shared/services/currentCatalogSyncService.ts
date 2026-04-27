import { extractDomain, extractRootDomain } from "../catalog/normalization.js";
import { getStoreScrapeExclusionMatch } from "../catalog/scrapeExclusions.js";
import type { StoreRecord } from "../catalog/types.js";
import type { CatalogRepository } from "../repositories/contracts.js";
import type { CatalogRefreshResult, CatalogRefreshService } from "./catalogRefreshService.js";

export interface CurrentCatalogSyncOptions {
  actor: string;
  limit?: number;
  concurrency?: number;
  dedupeByDomain?: boolean;
  officialOnly?: boolean;
  progress?: (result: CatalogRefreshResult["results"][number], completed: number, total: number) => void;
}

export interface CurrentCatalogSyncResult {
  selectedStores: number;
  selectedStoreIds: string[];
  refresh: CatalogRefreshResult;
}

export class CurrentCatalogSyncService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly refreshService: CatalogRefreshService,
  ) {}

  async planCurrentStores(options: {
    limit?: number;
    dedupeByDomain?: boolean;
    officialOnly?: boolean;
  }): Promise<StoreRecord[]> {
    return this.selectCurrentStores({
      limit: options.limit,
      dedupeByDomain: options.dedupeByDomain ?? true,
      officialOnly: options.officialOnly ?? true,
    });
  }

  async syncCurrentSites(options: CurrentCatalogSyncOptions): Promise<CurrentCatalogSyncResult> {
    const selectedStores = await this.planCurrentStores({
      limit: options.limit,
      dedupeByDomain: options.dedupeByDomain ?? true,
      officialOnly: options.officialOnly ?? true,
    });
    const selectedStoreIds = selectedStores.map((store) => store.id);

    const refresh = await this.refreshService.refresh({
      actor: options.actor,
      includeDiscovery: false,
      officialOnly: false,
      dedupeByDomain: false,
      storeIds: selectedStoreIds,
      concurrency: options.concurrency,
      progress: options.progress,
    });

    return {
      selectedStores: selectedStores.length,
      selectedStoreIds,
      refresh,
    };
  }

  private async selectCurrentStores(options: {
    limit?: number;
    dedupeByDomain: boolean;
    officialOnly: boolean;
  }): Promise<StoreRecord[]> {
    const stores = await this.repository.listStores();
    const sizes = await this.repository.listStoreSizeSummaries();
    const acquisitionProfiles = await this.repository.listAcquisitionProfiles();
    const sizeByStoreId = new Map(sizes.map((summary) => [summary.storeId, summary]));
    const acquisitionByStoreId = new Map(acquisitionProfiles.map((profile) => [profile.storeId, profile]));

    const filtered = stores.filter((store) => {
      if (!store.website) return false;
      if (options.officialOnly && store.websiteType !== "official") return false;
      if (getStoreScrapeExclusionMatch(store)) return false;

      const size = sizeByStoreId.get(store.id);
      if (!size || size.indexedProductCount <= 0) return false;

      const acquisition = acquisitionByStoreId.get(store.id);
      if (acquisition?.lifecycleState === "duplicate_domain" || acquisition?.lifecycleState === "non_catalog") {
        return false;
      }

      return true;
    });

    const deduped = options.dedupeByDomain ? dedupeStoresByRootDomain(filtered, sizeByStoreId) : filtered;
    const prioritized = [...deduped].sort((a, b) => {
      const aPriority = Number(Boolean(a.highPriority));
      const bPriority = Number(Boolean(b.highPriority));
      if (aPriority !== bPriority) return bPriority - aPriority;

      const aCount = sizeByStoreId.get(a.id)?.indexedProductCount ?? 0;
      const bCount = sizeByStoreId.get(b.id)?.indexedProductCount ?? 0;
      if (aCount !== bCount) return bCount - aCount;

      const aLastSync = a.lastSyncAt ? new Date(a.lastSyncAt).getTime() : 0;
      const bLastSync = b.lastSyncAt ? new Date(b.lastSyncAt).getTime() : 0;
      if (aLastSync !== bLastSync) return aLastSync - bLastSync;

      return a.name.localeCompare(b.name, "ar");
    });

    return options.limit ? prioritized.slice(0, options.limit) : prioritized;
  }
}

function dedupeStoresByRootDomain(
  stores: StoreRecord[],
  sizeByStoreId: Map<string, { indexedProductCount: number }>,
): StoreRecord[] {
  const byDomain = new Map<string, StoreRecord>();
  for (const store of stores) {
    const rootDomain = safeRootDomain(store.website ?? "");
    if (!rootDomain) continue;
    const existing = byDomain.get(rootDomain);
    if (!existing || shouldReplaceCurrentSyncStore(existing, store, sizeByStoreId)) {
      byDomain.set(rootDomain, store);
    }
  }
  return [...byDomain.values()];
}

function shouldReplaceCurrentSyncStore(
  current: StoreRecord,
  next: StoreRecord,
  sizeByStoreId: Map<string, { indexedProductCount: number }>,
): boolean {
  const currentPriority = Number(Boolean(current.highPriority));
  const nextPriority = Number(Boolean(next.highPriority));
  if (currentPriority !== nextPriority) return nextPriority > currentPriority;

  const currentCount = sizeByStoreId.get(current.id)?.indexedProductCount ?? 0;
  const nextCount = sizeByStoreId.get(next.id)?.indexedProductCount ?? 0;
  if (currentCount !== nextCount) return nextCount > currentCount;

  const currentSync = current.lastSyncAt ? new Date(current.lastSyncAt).getTime() : 0;
  const nextSync = next.lastSyncAt ? new Date(next.lastSyncAt).getTime() : 0;
  if (currentSync !== nextSync) return nextSync < currentSync;

  return next.name.localeCompare(current.name, "ar") < 0;
}

function safeRootDomain(url: string): string | undefined {
  const domain = extractDomain(url);
  return domain ? extractRootDomain(domain) : undefined;
}
