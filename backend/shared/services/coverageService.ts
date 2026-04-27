import { createId, extractDomain, extractRootDomain, nowIso } from "../catalog/normalization.js";
import { buildAcquisitionProfile, classifyBlockerEvidence, resolveCoverageState } from "../catalog/lifecycle.js";
import type {
  CoverageSummaryRecord,
  DomainAcquisitionProfile,
  DomainBlockerEvidence,
  PartnerFeedRecord,
  SessionWorkflowRecord,
  StoreRecord,
  StoreSizeSummaryRecord,
} from "../catalog/types.js";
import type { CatalogRepository } from "../repositories/contracts.js";

export interface DomainEvidenceView {
  store: StoreRecord;
  size?: StoreSizeSummaryRecord;
  acquisitionProfile: DomainAcquisitionProfile;
  blockerEvidence: DomainBlockerEvidence[];
  sessionWorkflow?: SessionWorkflowRecord;
  partnerFeed?: PartnerFeedRecord;
}

export interface CatalogPresenceReconciliationResult {
  storesChecked: number;
  promotedToIndexed: number;
  demotedFromIndexed: number;
  acquisitionProfilesUpdated: number;
}

export class CoverageService {
  constructor(private readonly repository: CatalogRepository) {}

  async reconcileCatalogPresence(): Promise<CatalogPresenceReconciliationResult> {
    const stores = await this.repository.listStores();
    const sizes = await this.repository.listStoreSizeSummaries();
    const existingProfiles = await this.repository.listAcquisitionProfiles();
    const storesById = new Map(stores.map((store) => [store.id, store]));
    const sizeByStoreId = new Map(sizes.map((summary) => [summary.storeId, summary]));
    const profileByStoreId = new Map(existingProfiles.map((profile) => [profile.storeId, profile]));
    const candidateStoreIds = new Set<string>([
      ...sizes.map((summary) => summary.storeId),
      ...existingProfiles.map((profile) => profile.storeId),
      ...stores.filter((store) => store.status === "indexed").map((store) => store.id),
    ]);

    let promotedToIndexed = 0;
    let demotedFromIndexed = 0;
    let acquisitionProfilesUpdated = 0;

    for (const storeId of candidateStoreIds) {
      const store = storesById.get(storeId);
      if (!store) continue;

      const size = sizeByStoreId.get(storeId);
      const indexedProductCount = size?.indexedProductCount ?? 0;
      const previousStatus = store.status;
      const nextStatus = resolveCanonicalStoreStatus(store, indexedProductCount);

      if (nextStatus && nextStatus !== store.status) {
        await this.repository.updateStore(store.id, {
          status: nextStatus,
          blockedReason: nextStatus === "indexed" ? undefined : store.blockedReason,
          lastSyncAt: size?.lastSuccessfulSyncAt ?? store.lastSyncAt,
          updatedAt: nowIso(),
        });
        store.status = nextStatus;
        if (nextStatus === "indexed") promotedToIndexed += 1;
        else if (previousStatus === "indexed") demotedFromIndexed += 1;
      }

      const [connectorProfile, blockerEvidence, sessionWorkflow, partnerFeed] = await Promise.all([
        this.repository.getConnectorProfile(store.id),
        this.repository.listBlockerEvidence(store.id),
        this.repository.getSessionWorkflow(store.id),
        this.repository.getPartnerFeed(store.id),
      ]);

      const profile = buildAcquisitionProfile({
        store,
        connectorProfile,
        size,
        blockerEvidence,
        sessionWorkflow,
        partnerFeed,
        duplicateOfStoreId: profileByStoreId.get(store.id)?.duplicateOfStoreId,
      });
      await this.repository.saveAcquisitionProfile(profile);
      acquisitionProfilesUpdated += 1;
    }

    return {
      storesChecked: candidateStoreIds.size,
      promotedToIndexed,
      demotedFromIndexed,
      acquisitionProfilesUpdated,
    };
  }

  async summarizeCoverage(): Promise<CoverageSummaryRecord> {
    const stores = await this.repository.listStores();
    const evidenceByStore = await Promise.all(stores.map((store) => this.getDomainEvidence(store.id)));
    const states = evidenceByStore.map((item) => item.acquisitionProfile.lifecycleState);
    const topFailureReasons = buildTopFailureReasons(evidenceByStore.flatMap((item) => item.blockerEvidence));
    return {
      generatedAt: nowIso(),
      totalStores: stores.length,
      officialStores: stores.filter((store) => store.websiteType === "official").length,
      indexedStores: states.filter((state) => state === "indexed").length,
      zeroProductStores: states.filter((state) => state === "zero_products").length,
      blockedStores: states.filter((state) => state === "anti_bot_requires_session").length,
      nonCatalogStores: states.filter((state) => state === "non_catalog").length,
      duplicateStores: states.filter((state) => state === "duplicate_domain").length,
      deadStores: states.filter((state) => state === "dead_site").length,
      partnerFeedRequiredStores: states.filter((state) => state === "partner_feed_required").length,
      topFailureReasons,
    };
  }

  async listBacklog(): Promise<DomainEvidenceView[]> {
    const stores = await this.repository.listStores();
    const duplicates = buildDuplicateMap(stores);
    const evidence = await Promise.all(
      stores.map(async (store) => this.getDomainEvidence(store.id, duplicates.get(store.id))),
    );
    return evidence.filter((item) =>
      ["zero_products", "anti_bot_requires_session", "partner_feed_required", "probed"].includes(
        item.acquisitionProfile.lifecycleState,
      ),
    );
  }

  async getRetryCandidateStoreIds(includeZeroProducts = true): Promise<string[]> {
    const backlog = await this.listBacklog();
    return backlog
      .filter((item) =>
        item.acquisitionProfile.lifecycleState === "anti_bot_requires_session" ||
        item.acquisitionProfile.lifecycleState === "probed" ||
        (includeZeroProducts && item.acquisitionProfile.lifecycleState === "zero_products"),
      )
      .map((item) => item.store.id);
  }

  async getDomainEvidence(storeId: string, duplicateOfStoreId?: string): Promise<DomainEvidenceView> {
    const store = await this.repository.getStoreById(storeId);
    if (!store) {
      throw new Error(`Store ${storeId} not found.`);
    }
    const [size, profile, blockerEvidence, sessionWorkflow, partnerFeed] = await Promise.all([
      this.repository.getStoreSizeSummary(storeId),
      this.repository.getAcquisitionProfile(storeId),
      this.repository.listBlockerEvidence(storeId),
      this.repository.getSessionWorkflow(storeId),
      this.repository.getPartnerFeed(storeId),
    ]);

    const acquisitionProfile =
      profile ??
      buildAcquisitionProfile({
        store,
        size,
        blockerEvidence,
        sessionWorkflow,
        partnerFeed,
        duplicateOfStoreId,
      });

    return {
      store,
      size,
      acquisitionProfile,
      blockerEvidence,
      sessionWorkflow,
      partnerFeed,
    };
  }

  async saveSuccessfulCoverage(
    store: StoreRecord,
    args: { indexedProducts: number; duplicateOfStoreId?: string },
  ): Promise<void> {
    const [size, connectorProfile, blockerEvidence, sessionWorkflow, partnerFeed] = await Promise.all([
      this.repository.getStoreSizeSummary(store.id),
      this.repository.getConnectorProfile(store.id),
      this.repository.listBlockerEvidence(store.id),
      this.repository.getSessionWorkflow(store.id),
      this.repository.getPartnerFeed(store.id),
    ]);

    await this.repository.saveAcquisitionProfile(
      buildAcquisitionProfile({
        store,
        connectorProfile,
        size,
        blockerEvidence,
        sessionWorkflow,
        partnerFeed,
        duplicateOfStoreId: args.duplicateOfStoreId,
      }),
    );
  }

  async saveFailureCoverage(
    store: StoreRecord,
    reason: string,
    observedUrl?: string,
  ): Promise<void> {
    const evidence = classifyBlockerEvidence(store, reason, observedUrl ?? store.website);
    await this.repository.addBlockerEvidence(evidence);
    const [size, connectorProfile, blockerEvidence, sessionWorkflow, partnerFeed] = await Promise.all([
      this.repository.getStoreSizeSummary(store.id),
      this.repository.getConnectorProfile(store.id),
      this.repository.listBlockerEvidence(store.id),
      this.repository.getSessionWorkflow(store.id),
      this.repository.getPartnerFeed(store.id),
    ]);
    await this.repository.saveAcquisitionProfile(
      buildAcquisitionProfile({
        store,
        connectorProfile,
        size,
        blockerEvidence,
        sessionWorkflow,
        partnerFeed,
      }),
    );
  }

  async registerSession(
    storeId: string,
    input: {
      cookiesJson?: string;
      headers?: Record<string, string>;
      notes?: string;
      expiresAt?: string;
    },
  ): Promise<SessionWorkflowRecord> {
    const session: SessionWorkflowRecord = {
      storeId,
      status: input.expiresAt && new Date(input.expiresAt).getTime() <= Date.now() ? "expired" : "ready",
      cookiesJson: input.cookiesJson,
      headers: input.headers ?? {},
      notes: input.notes,
      expiresAt: input.expiresAt,
      updatedAt: nowIso(),
    };
    await this.repository.upsertSessionWorkflow(session);
    return session;
  }

  async savePartnerFeed(feed: PartnerFeedRecord): Promise<void> {
    await this.repository.upsertPartnerFeed(feed);
  }
}

function resolveCanonicalStoreStatus(
  store: StoreRecord,
  indexedProductCount: number,
): StoreRecord["status"] | null {
  if (indexedProductCount > 0) return store.status === "indexed" ? null : "indexed";
  if (store.status !== "indexed") return null;
  if (store.websiteType === "social") return "social_only";
  if (store.website) return "indexable";
  return "probe_pending";
}

function buildDuplicateMap(stores: StoreRecord[]): Map<string, string> {
  const primaryByDomain = new Map<string, string>();
  const duplicates = new Map<string, string>();
  for (const store of stores) {
    if (!store.website) continue;
    const rootDomain = safeRootDomain(store.website);
    if (!rootDomain) continue;
    const current = primaryByDomain.get(rootDomain);
    if (!current) {
      primaryByDomain.set(rootDomain, store.id);
      continue;
    }
    duplicates.set(store.id, current);
  }
  return duplicates;
}

function safeRootDomain(url: string): string | undefined {
  const domain = extractDomain(url);
  return domain ? extractRootDomain(domain) : undefined;
}

function buildTopFailureReasons(evidence: DomainBlockerEvidence[]): Array<{ reason: string; count: number }> {
  const counts = new Map<string, number>();
  for (const item of evidence) {
    counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([reason, count]) => ({ reason, count }));
}
