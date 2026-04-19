import { createId, extractDomain, extractRootDomain, nowIso } from "../catalog/normalization.js";
import type { CatalogRepository } from "../repositories/contracts.js";
import { ProbeService } from "./probeService.js";
import { SyncService } from "./syncService.js";
import { DiscoveryService } from "./discoveryService.js";
import { CoverageService } from "./coverageService.js";
import type { StoreRecord } from "../catalog/types.js";

export interface CatalogRefreshOptions {
  actor: string;
  includeDiscovery?: boolean;
  officialOnly?: boolean;
  dedupeByDomain?: boolean;
  limit?: number;
  concurrency?: number;
  storeIds?: string[];
}

export interface CatalogRefreshItemResult {
  storeId: string;
  storeName: string;
  website?: string;
  rootDomain?: string;
  probeConnector?: string;
  status: "synced" | "probed_only" | "skipped" | "failed";
  productsIndexed?: number;
  offersIndexed?: number;
  reason?: string;
}

export interface CatalogRefreshResult {
  startedAt: string;
  finishedAt: string;
  discovery?: {
    storesImported: number;
    domainsImported: number;
  };
  scannedStores: number;
  candidateStores: number;
  dedupedDomains: number;
  syncedStores: number;
  probedOnlyStores: number;
  failedStores: number;
  skippedStores: number;
  results: CatalogRefreshItemResult[];
}

export class CatalogRefreshService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly discoveryService: DiscoveryService,
    private readonly probeService: ProbeService,
    private readonly syncService: SyncService,
    private readonly coverageService: CoverageService,
  ) {}

  async refresh(options: CatalogRefreshOptions): Promise<CatalogRefreshResult> {
    const startedAt = nowIso();
    const includeDiscovery = options.includeDiscovery ?? true;
    const officialOnly = options.officialOnly ?? true;
    const dedupeByDomain = options.dedupeByDomain ?? true;
    const concurrency = Math.max(1, Math.min(options.concurrency ?? 5, 12));
    const results: CatalogRefreshItemResult[] = [];

    const discovery = includeDiscovery ? await this.discoveryService.rescan(options.actor) : undefined;
    const stores = await this.repository.listStores();
    const candidateStores = selectRefreshCandidates(stores, {
      officialOnly,
      dedupeByDomain,
      limit: options.limit,
      storeIds: options.storeIds,
    });

    let syncedStores = 0;
    let probedOnlyStores = 0;
    let failedStores = 0;
    let skippedStores = 0;

    await mapWithConcurrency(candidateStores, concurrency, async (store) => {
      const outcome = await this.refreshOneStore(store, options.actor);
      results.push(outcome);
    });

    for (const result of results) {
      if (result.status === "synced") syncedStores++;
      else if (result.status === "probed_only") probedOnlyStores++;
      else if (result.status === "failed") failedStores++;
      else skippedStores++;
    }

    skippedStores += stores.length - candidateStores.length;
    const finishedAt = nowIso();

    const summary: CatalogRefreshResult = {
      startedAt,
      finishedAt,
      discovery,
      scannedStores: stores.length,
      candidateStores: candidateStores.length,
      dedupedDomains: new Set(candidateStores.map((store) => safeRootDomain(store.website ?? "")).filter(Boolean)).size,
      syncedStores,
      probedOnlyStores,
      failedStores,
      skippedStores,
      results,
    };

    await this.repository.createAuditLog({
      id: createId("audit"),
      actor: options.actor,
      action: "catalog_refresh",
      details: {
        scannedStores: summary.scannedStores,
        candidateStores: summary.candidateStores,
        dedupedDomains: summary.dedupedDomains,
        syncedStores,
        probedOnlyStores,
        failedStores,
        skippedStores,
      },
      createdAt: finishedAt,
    });

    return summary;
  }

  private async refreshOneStore(store: StoreRecord, actor: string): Promise<CatalogRefreshItemResult> {
    const rootDomain = store.website ? safeRootDomain(store.website) : undefined;
    try {
      const profile = await this.probeService.probeStore(store.id, actor, "manual");
      if (profile.connectorType === "unknown" || profile.connectorType === "social_only") {
        await this.coverageService.saveFailureCoverage(
          store,
          profile.connectorType === "social_only" ? "social_only_source" : "no_supported_catalog_connector",
          store.website,
        );
        return {
          storeId: store.id,
          storeName: store.name,
          website: store.website,
          rootDomain,
          probeConnector: profile.connectorType,
          status: "probed_only",
          reason: profile.connectorType === "social_only" ? "social_only_source" : "no_supported_catalog_connector",
        };
      }

      const run = await this.syncService.syncStore(store.id, actor, "manual");
      const size = await this.repository.getStoreSizeSummary(store.id);
      await this.coverageService.saveSuccessfulCoverage(store, {
        indexedProducts: size?.indexedProductCount ?? run.productsUpserted,
      });
      return {
        storeId: store.id,
        storeName: store.name,
        website: store.website,
        rootDomain,
        probeConnector: profile.connectorType,
        status: "synced",
        productsIndexed: size?.indexedProductCount ?? run.productsUpserted,
        offersIndexed: size?.activeOfferCount ?? run.offersUpserted,
      };
    } catch (error) {
      await this.coverageService.saveFailureCoverage(
        store,
        error instanceof Error ? error.message : "unknown_refresh_error",
        store.website,
      );
      return {
        storeId: store.id,
        storeName: store.name,
        website: store.website,
        rootDomain,
        status: "failed",
        reason: error instanceof Error ? error.message : "unknown_refresh_error",
      };
    }
  }
}

async function mapWithConcurrency<T>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      const item = items[currentIndex];
      if (!item) return;
      await handler(item, currentIndex);
    }
  });
  await Promise.all(workers);
}

function selectRefreshCandidates(
  stores: StoreRecord[],
  options: { officialOnly: boolean; dedupeByDomain: boolean; limit?: number; storeIds?: string[] },
): StoreRecord[] {
  const allowedIds = options.storeIds ? new Set(options.storeIds) : undefined;
  const filtered = stores.filter((store) => {
    if (allowedIds && !allowedIds.has(store.id)) return false;
    if (!store.website) return false;
    if (options.officialOnly && store.websiteType !== "official") return false;
    return true;
  });

  const deduped = options.dedupeByDomain ? dedupeStoresByDomain(filtered) : filtered;
  const prioritized = [...deduped].sort((a, b) => {
    const aPriority = Number(Boolean(a.highPriority));
    const bPriority = Number(Boolean(b.highPriority));
    if (aPriority !== bPriority) return bPriority - aPriority;
    return a.name.localeCompare(b.name, "ar");
  });

  return options.limit ? prioritized.slice(0, options.limit) : prioritized;
}

function dedupeStoresByDomain(stores: StoreRecord[]): StoreRecord[] {
  const byDomain = new Map<string, StoreRecord>();
  for (const store of stores) {
    const rootDomain = safeRootDomain(store.website ?? "");
    if (!rootDomain) continue;
    const existing = byDomain.get(rootDomain);
    if (!existing || shouldReplace(existing, store)) {
      byDomain.set(rootDomain, store);
    }
  }
  return [...byDomain.values()];
}

function shouldReplace(current: StoreRecord, next: StoreRecord): boolean {
  const currentPriority = Number(Boolean(current.highPriority));
  const nextPriority = Number(Boolean(next.highPriority));
  if (currentPriority !== nextPriority) return nextPriority > currentPriority;
  const currentStatusScore = statusScore(current.status);
  const nextStatusScore = statusScore(next.status);
  if (currentStatusScore !== nextStatusScore) return nextStatusScore > currentStatusScore;
  return next.name.localeCompare(current.name, "ar") < 0;
}

function statusScore(status: StoreRecord["status"]): number {
  switch (status) {
    case "indexed":
      return 4;
    case "indexable":
      return 3;
    case "probe_pending":
      return 2;
    case "discovered":
      return 1;
    default:
      return 0;
  }
}

function safeRootDomain(url: string): string | undefined {
  const domain = extractDomain(url);
  return domain ? extractRootDomain(domain) : undefined;
}
