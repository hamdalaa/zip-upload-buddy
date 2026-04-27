import {
  classifyWebsiteType,
  compactText,
  extractDomain,
  extractRootDomain,
  normalizeWebsiteUrl,
  nowIso,
  slugify,
  createId,
} from "../catalog/normalization.js";
import type { CatalogRefreshItemResult, CatalogRefreshService } from "./catalogRefreshService.js";
import type { CatalogRepository } from "../repositories/contracts.js";
import type {
  ConnectorProfileRecord,
  StoreDomainRecord,
  StoreRecord,
  StoreSizeSummaryRecord,
} from "../catalog/types.js";

export interface ManualStoreIntakeInput {
  website: string;
  name?: string;
  city?: string;
  cityAr?: string;
  area?: string;
  primaryCategory?: string;
  sourceFile?: string;
  note?: string;
  highPriority?: boolean;
  syncNow?: boolean;
}

export interface ManualStoreIntakeResult {
  existed: boolean;
  store: StoreRecord;
  domain: StoreDomainRecord;
  refresh?: CatalogRefreshItemResult;
  connectorProfile?: ConnectorProfileRecord;
  size?: StoreSizeSummaryRecord;
}

export class ManualStoreIntakeService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly refreshService: CatalogRefreshService,
  ) {}

  async intake(input: ManualStoreIntakeInput, actor: string): Promise<ManualStoreIntakeResult> {
    const website = normalizeSubmittedWebsite(input.website);
    const domain = extractDomain(website);
    if (!domain) {
      throw new Error("A valid website URL is required.");
    }

    const rootDomain = extractRootDomain(domain);
    const websiteType = classifyWebsiteType(website);
    const timestamp = nowIso();
    const stores = await this.repository.listStores();
    const existingStore = stores.find((store) => safeRootDomain(store.website) === rootDomain);
    const storeName = input.name?.trim() || deriveStoreName(domain);
    const storeId = existingStore?.id ?? `manual_${sanitizeId(rootDomain)}`;

    const store: StoreRecord = {
      id: storeId,
      name: storeName,
      normalizedName: compactText(storeName),
      slug: slugify(storeName),
      city: input.city?.trim() || existingStore?.city,
      cityAr: input.cityAr?.trim() || existingStore?.cityAr,
      area: input.area?.trim() || existingStore?.area,
      primaryCategory: input.primaryCategory?.trim() || existingStore?.primaryCategory || "Electronics",
      suggestedCategory: existingStore?.suggestedCategory,
      address: existingStore?.address,
      phone: existingStore?.phone,
      whatsapp: existingStore?.whatsapp,
      website,
      websiteType,
      googleMapsUrl: existingStore?.googleMapsUrl,
      lat: existingStore?.lat,
      lng: existingStore?.lng,
      discoverySource: existingStore?.discoverySource ?? "manual_seed",
      sourceFile: input.sourceFile?.trim() || existingStore?.sourceFile || rootDomain,
      highPriority: input.highPriority ?? existingStore?.highPriority ?? true,
      status: websiteType === "social" ? "social_only" : "probe_pending",
      blockedReason: undefined,
      metadata: {
        ...(existingStore?.metadata ?? {}),
        manualIntake: {
          sourceUrl: website,
          note: input.note?.trim(),
          actor,
          updatedAt: timestamp,
        },
      },
      createdAt: existingStore?.createdAt ?? timestamp,
      updatedAt: timestamp,
      lastProbeAt: existingStore?.lastProbeAt,
      lastSyncAt: existingStore?.lastSyncAt,
    };

    const storeDomain: StoreDomainRecord = {
      id: existingStore ? createId("dom") : createId("dom"),
      storeId,
      sourceUrl: website,
      domain,
      rootDomain,
      classification: websiteType,
      isPrimary: true,
      createdAt: timestamp,
    };

    await this.repository.upsertStore(store);
    await this.repository.upsertStoreDomain(storeDomain);
    await this.repository.createAuditLog({
      id: createId("audit"),
      actor,
      action: "store_manual_intake",
      storeId,
      details: {
        website,
        rootDomain,
        existed: Boolean(existingStore),
        syncNow: input.syncNow !== false,
      },
      createdAt: timestamp,
    });

    if (input.syncNow === false) {
      return {
        existed: Boolean(existingStore),
        store,
        domain: storeDomain,
      };
    }

    const refreshResult = await this.refreshService.refresh({
      actor,
      includeDiscovery: false,
      officialOnly: false,
      dedupeByDomain: false,
      storeIds: [storeId],
      concurrency: 1,
    });

    const [refreshedStore, connectorProfile, size] = await Promise.all([
      this.repository.getStoreById(storeId),
      this.repository.getConnectorProfile(storeId),
      this.repository.getStoreSizeSummary(storeId),
    ]);

    return {
      existed: Boolean(existingStore),
      store: refreshedStore ?? store,
      domain: storeDomain,
      refresh: refreshResult.results[0],
      connectorProfile,
      size,
    };
  }
}

function normalizeSubmittedWebsite(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) {
    return normalizeWebsiteUrl(trimmed);
  }
  return normalizeWebsiteUrl(`https://${trimmed}`);
}

function deriveStoreName(domain: string): string {
  return domain.replace(/^www\./, "");
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function safeRootDomain(url?: string): string | undefined {
  if (!url) return undefined;
  const domain = extractDomain(url);
  return domain ? extractRootDomain(domain) : undefined;
}
