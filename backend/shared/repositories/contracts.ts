import type {
  AuditLogRecord,
  CatalogProductDraft,
  CoverageSummaryRecord,
  ConnectorProfileRecord,
  DomainAcquisitionProfile,
  DomainBlockerEvidence,
  OfferDraft,
  PartnerFeedRecord,
  ProductVariantDraft,
  RawSnapshotRecord,
  SearchDocument,
  SessionWorkflowRecord,
  SiteSettingsRecord,
  StoreDomainRecord,
  StoreRecord,
  StoreSizeSummaryRecord,
  SyncRunRecord,
} from "../catalog/types.js";

export interface SearchQueryInput {
  q: string;
  storeId?: string;
  minPrice?: number;
  maxPrice?: number;
  onSale?: boolean;
  availability?: string;
  limit?: number;
}

export interface RepositorySearchResult {
  total: number;
  hits: SearchDocument[];
}

export interface ServiceTokenRecord {
  name: string;
  tokenHash: string;
  scopes: string[];
}

export interface CatalogRepository {
  upsertStore(store: StoreRecord): Promise<void>;
  upsertStoreDomain(domain: StoreDomainRecord): Promise<void>;
  listStores(): Promise<StoreRecord[]>;
  getStoresByIds(storeIds: string[]): Promise<StoreRecord[]>;
  getStoreById(storeId: string): Promise<StoreRecord | undefined>;
  updateStore(storeId: string, patch: Partial<StoreRecord>): Promise<void>;
  upsertConnectorProfile(profile: ConnectorProfileRecord): Promise<void>;
  getConnectorProfile(storeId: string): Promise<ConnectorProfileRecord | undefined>;
  startSyncRun(run: SyncRunRecord): Promise<void>;
  finishSyncRun(runId: string, patch: Partial<SyncRunRecord>): Promise<void>;
  getSyncRun(runId: string): Promise<SyncRunRecord | undefined>;
  replaceCatalogSnapshot(
    storeId: string,
    products: CatalogProductDraft[],
    variants: ProductVariantDraft[],
    offers: OfferDraft[],
  ): Promise<void>;
  getStoreCatalog(storeId: string): Promise<{
    products: CatalogProductDraft[];
    variants: ProductVariantDraft[];
    offers: OfferDraft[];
  }>;
  saveStoreSizeSummary(summary: StoreSizeSummaryRecord): Promise<void>;
  getStoreSizeSummary(storeId: string): Promise<StoreSizeSummaryRecord | undefined>;
  listStoreSizeSummaries(): Promise<StoreSizeSummaryRecord[]>;
  saveAcquisitionProfile(profile: DomainAcquisitionProfile): Promise<void>;
  getAcquisitionProfile(storeId: string): Promise<DomainAcquisitionProfile | undefined>;
  listAcquisitionProfiles(): Promise<DomainAcquisitionProfile[]>;
  addBlockerEvidence(evidence: DomainBlockerEvidence): Promise<void>;
  listBlockerEvidence(storeId: string): Promise<DomainBlockerEvidence[]>;
  upsertSessionWorkflow(session: SessionWorkflowRecord): Promise<void>;
  getSessionWorkflow(storeId: string): Promise<SessionWorkflowRecord | undefined>;
  upsertPartnerFeed(feed: PartnerFeedRecord): Promise<void>;
  getPartnerFeed(storeId: string): Promise<PartnerFeedRecord | undefined>;
  saveRawSnapshot(snapshot: RawSnapshotRecord): Promise<void>;
  listSearchDocuments(): Promise<SearchDocument[]>;
  createAuditLog(log: AuditLogRecord): Promise<void>;
  listAuditLogs(limit?: number, offset?: number): Promise<AuditLogRecord[]>;
  getSiteSettings(id?: string): Promise<SiteSettingsRecord | undefined>;
  saveSiteSettings(settings: SiteSettingsRecord): Promise<void>;
  syncServiceTokens(tokens: ServiceTokenRecord[]): Promise<void>;
  getServiceTokenByHash(tokenHash: string): Promise<ServiceTokenRecord | undefined>;
  registerRequestNonce(nonceHash: string, expiresAt: string): Promise<boolean>;
}
