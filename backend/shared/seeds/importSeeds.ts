import { classifyWebsiteType, compactText, createId, extractDomain, extractRootDomain, nowIso } from "../catalog/normalization.js";
import type { DiscoverySource, StoreDomainRecord, StoreRecord, StoreSeed, StoreStatus } from "../catalog/types.js";
import { loadCitySeedStores } from "./citySeedLoader.js";
import { manualSeeds } from "./manualSeeds.js";

export interface CatalogRepositoryLike {
  upsertStore(store: StoreRecord): Promise<void>;
  upsertStoreDomain(domain: StoreDomainRecord): Promise<void>;
}

export interface DiscoveryImportResult {
  storesImported: number;
  domainsImported: number;
}

function initialStatus(seed: StoreSeed): StoreStatus {
  if (seed.websiteType === "social") return "social_only";
  if (seed.websiteType === "official") return "probe_pending";
  return "discovered";
}

function mergeSeeds(seeds: StoreSeed[]): StoreSeed[] {
  const byKey = new Map<string, StoreSeed>();
  for (const seed of seeds) {
    const domain = seed.website ? extractRootDomain(extractDomain(seed.website) ?? "") : "";
    const dedupeKey = [seed.placeId ?? "", domain, compactText(seed.name)].filter(Boolean).join("|");
    const existing = byKey.get(dedupeKey);
    if (!existing || seed.highPriority) {
      byKey.set(dedupeKey, seed);
    }
  }
  return [...byKey.values()];
}

export async function importDiscoverySeeds(repository: CatalogRepositoryLike): Promise<DiscoveryImportResult> {
  const seeds = mergeSeeds([...(await loadCitySeedStores()), ...manualSeeds]);
  let domainsImported = 0;

  for (const seed of seeds) {
    const timestamp = nowIso();
    const store: StoreRecord = {
      ...seed,
      websiteType: seed.websiteType ?? classifyWebsiteType(seed.website),
      status: initialStatus(seed),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await repository.upsertStore(store);

    if (seed.website) {
      const domain = extractDomain(seed.website);
      if (domain) {
        await repository.upsertStoreDomain({
          id: createId("dom"),
          storeId: seed.id,
          sourceUrl: seed.website,
          domain,
          rootDomain: extractRootDomain(domain),
          classification: seed.websiteType ?? classifyWebsiteType(seed.website),
          isPrimary: true,
          createdAt: timestamp,
        });
        domainsImported++;
      }
    }
  }

  return {
    storesImported: seeds.length,
    domainsImported,
  };
}

export function discoverySourceSummary(source: DiscoverySource): string {
  switch (source) {
    case "city_seed":
      return "City seed import";
    case "manual_seed":
      return "Manual high-priority seed";
    case "domain_seed":
      return "Domain registry seed";
    case "sync":
      return "Discovered during sync";
  }
}
