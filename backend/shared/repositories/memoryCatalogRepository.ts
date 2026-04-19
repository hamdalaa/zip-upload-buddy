import type {
  AuditLogRecord,
  CatalogProductDraft,
  DomainAcquisitionProfile,
  DomainBlockerEvidence,
  ConnectorProfileRecord,
  OfferDraft,
  PartnerFeedRecord,
  ProductVariantDraft,
  RawSnapshotRecord,
  SearchDocument,
  SessionWorkflowRecord,
  StoreDomainRecord,
  StoreRecord,
  StoreSizeSummaryRecord,
  SyncRunRecord,
} from "../catalog/types.js";
import type { CatalogRepository, ServiceTokenRecord } from "./contracts.js";
import { buildSearchDocument } from "../catalog/searchDocuments.js";

export class MemoryCatalogRepository implements CatalogRepository {
  private readonly stores = new Map<string, StoreRecord>();
  private readonly domains = new Map<string, StoreDomainRecord>();
  private readonly connectorProfiles = new Map<string, ConnectorProfileRecord>();
  private readonly syncRuns = new Map<string, SyncRunRecord>();
  private readonly catalog = new Map<string, { products: CatalogProductDraft[]; variants: ProductVariantDraft[]; offers: OfferDraft[] }>();
  private readonly sizeSummaries = new Map<string, StoreSizeSummaryRecord>();
  private readonly acquisitionProfiles = new Map<string, DomainAcquisitionProfile>();
  private readonly blockerEvidence = new Map<string, DomainBlockerEvidence[]>();
  private readonly sessionWorkflows = new Map<string, SessionWorkflowRecord>();
  private readonly partnerFeeds = new Map<string, PartnerFeedRecord>();
  private readonly snapshots = new Map<string, RawSnapshotRecord>();
  private readonly auditLogs = new Map<string, AuditLogRecord>();
  private readonly serviceTokens = new Map<string, ServiceTokenRecord>();
  private readonly requestNonces = new Map<string, number>();

  async upsertStore(store: StoreRecord): Promise<void> {
    const existing = this.stores.get(store.id);
    this.stores.set(store.id, { ...existing, ...store });
  }

  async upsertStoreDomain(domain: StoreDomainRecord): Promise<void> {
    this.domains.set(domain.id, domain);
  }

  async listStores(): Promise<StoreRecord[]> {
    return [...this.stores.values()].sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }

  async getStoreById(storeId: string): Promise<StoreRecord | undefined> {
    return this.stores.get(storeId);
  }

  async updateStore(storeId: string, patch: Partial<StoreRecord>): Promise<void> {
    const current = this.stores.get(storeId);
    if (!current) return;
    this.stores.set(storeId, { ...current, ...patch });
  }

  async upsertConnectorProfile(profile: ConnectorProfileRecord): Promise<void> {
    this.connectorProfiles.set(profile.storeId, profile);
  }

  async getConnectorProfile(storeId: string): Promise<ConnectorProfileRecord | undefined> {
    return this.connectorProfiles.get(storeId);
  }

  async startSyncRun(run: SyncRunRecord): Promise<void> {
    this.syncRuns.set(run.id, run);
  }

  async finishSyncRun(runId: string, patch: Partial<SyncRunRecord>): Promise<void> {
    const current = this.syncRuns.get(runId);
    if (!current) return;
    this.syncRuns.set(runId, { ...current, ...patch });
  }

  async getSyncRun(runId: string): Promise<SyncRunRecord | undefined> {
    return this.syncRuns.get(runId);
  }

  async replaceCatalogSnapshot(
    storeId: string,
    products: CatalogProductDraft[],
    variants: ProductVariantDraft[],
    offers: OfferDraft[],
  ): Promise<void> {
    this.catalog.set(storeId, { products, variants, offers });
  }

  async getStoreCatalog(storeId: string): Promise<{ products: CatalogProductDraft[]; variants: ProductVariantDraft[]; offers: OfferDraft[] }> {
    return this.catalog.get(storeId) ?? { products: [], variants: [], offers: [] };
  }

  async saveStoreSizeSummary(summary: StoreSizeSummaryRecord): Promise<void> {
    this.sizeSummaries.set(summary.storeId, summary);
  }

  async getStoreSizeSummary(storeId: string): Promise<StoreSizeSummaryRecord | undefined> {
    return this.sizeSummaries.get(storeId);
  }

  async saveAcquisitionProfile(profile: DomainAcquisitionProfile): Promise<void> {
    this.acquisitionProfiles.set(profile.storeId, profile);
  }

  async getAcquisitionProfile(storeId: string): Promise<DomainAcquisitionProfile | undefined> {
    return this.acquisitionProfiles.get(storeId);
  }

  async listAcquisitionProfiles(): Promise<DomainAcquisitionProfile[]> {
    return [...this.acquisitionProfiles.values()];
  }

  async addBlockerEvidence(evidence: DomainBlockerEvidence): Promise<void> {
    const current = this.blockerEvidence.get(evidence.storeId) ?? [];
    current.unshift(evidence);
    this.blockerEvidence.set(evidence.storeId, current.slice(0, 20));
  }

  async listBlockerEvidence(storeId: string): Promise<DomainBlockerEvidence[]> {
    return this.blockerEvidence.get(storeId) ?? [];
  }

  async upsertSessionWorkflow(session: SessionWorkflowRecord): Promise<void> {
    this.sessionWorkflows.set(session.storeId, session);
  }

  async getSessionWorkflow(storeId: string): Promise<SessionWorkflowRecord | undefined> {
    return this.sessionWorkflows.get(storeId);
  }

  async upsertPartnerFeed(feed: PartnerFeedRecord): Promise<void> {
    this.partnerFeeds.set(feed.storeId, feed);
  }

  async getPartnerFeed(storeId: string): Promise<PartnerFeedRecord | undefined> {
    return this.partnerFeeds.get(storeId);
  }

  async saveRawSnapshot(snapshot: RawSnapshotRecord): Promise<void> {
    this.snapshots.set(snapshot.id, snapshot);
  }

  async listSearchDocuments(): Promise<SearchDocument[]> {
    const documents: SearchDocument[] = [];
    for (const [storeId, catalog] of this.catalog.entries()) {
      const store = this.stores.get(storeId);
      if (!store) continue;
      for (const product of catalog.products) {
        documents.push(buildSearchDocument(store, product));
      }
    }
    return documents;
  }

  async createAuditLog(log: AuditLogRecord): Promise<void> {
    this.auditLogs.set(log.id, log);
  }

  async syncServiceTokens(tokens: ServiceTokenRecord[]): Promise<void> {
    for (const token of tokens) {
      this.serviceTokens.set(token.tokenHash, token);
    }
  }

  async getServiceTokenByHash(tokenHash: string): Promise<ServiceTokenRecord | undefined> {
    return this.serviceTokens.get(tokenHash);
  }

  async registerRequestNonce(nonceHash: string, expiresAt: string): Promise<boolean> {
    const now = Date.now();
    for (const [key, expiry] of this.requestNonces.entries()) {
      if (expiry <= now) this.requestNonces.delete(key);
    }
    if (this.requestNonces.has(nonceHash)) return false;
    this.requestNonces.set(nonceHash, new Date(expiresAt).getTime());
    return true;
  }
}
