export type StoreStatus =
  | "discovered"
  | "probe_pending"
  | "indexable"
  | "indexed"
  | "social_only"
  | "blocked"
  | "failed";

export type ConnectorType =
  | "masterstore_next"
  | "jibalzone_storefront"
  | "miswag_nuxt"
  | "magento_vsf"
  | "woocommerce"
  | "generic_json_catalog"
  | "generic_sitemap_html"
  | "social_only"
  | "unknown";

export type DiscoverySource = "city_seed" | "manual_seed" | "domain_seed" | "sync";

export type SyncPriorityTier = "hourly" | "six_hour" | "nightly" | "weekly";

export type CatalogCoverageState =
  | "seeded"
  | "probed"
  | "indexed"
  | "zero_products"
  | "non_catalog"
  | "duplicate_domain"
  | "dead_site"
  | "anti_bot_requires_session"
  | "partner_feed_required";

export type AcquisitionStrategy =
  | "structured_api"
  | "html_catalog"
  | "browser_session"
  | "partner_feed"
  | "manual_review";

export type BlockerType =
  | "challenge"
  | "password_wall"
  | "login_wall"
  | "rate_limited"
  | "dead_site"
  | "network_failure"
  | "non_catalog"
  | "duplicate_domain"
  | "feed_required";

export interface StoreSeed {
  id: string;
  placeId?: string;
  name: string;
  normalizedName: string;
  slug: string;
  city?: string;
  cityAr?: string;
  area?: string;
  primaryCategory?: string;
  suggestedCategory?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  websiteType?: "official" | "social" | "missing";
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
  discoverySource: DiscoverySource;
  sourceFile?: string;
  highPriority?: boolean;
  metadata?: Record<string, unknown>;
}

export interface StoreRecord extends StoreSeed {
  status: StoreStatus;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
  lastProbeAt?: string;
  lastSyncAt?: string;
}

export interface StoreDomainRecord {
  id: string;
  storeId: string;
  sourceUrl: string;
  domain: string;
  rootDomain: string;
  classification: "official" | "social" | "missing";
  isPrimary: boolean;
  createdAt: string;
}

export interface ConnectorCapabilities {
  supportsStructuredApi: boolean;
  supportsHtmlCatalog: boolean;
  supportsOffers: boolean;
  supportsVariants: boolean;
  supportsMarketplaceContext: boolean;
  fallbackToBrowser: boolean;
}

export interface ConnectorProfileRecord {
  id: string;
  storeId: string;
  connectorType: ConnectorType;
  platformConfidence: number;
  platformSignals: string[];
  capabilities: ConnectorCapabilities;
  syncStrategy: {
    priorityTier: SyncPriorityTier;
    probeFirst: boolean;
    deltaHours: number;
    fullSyncHours: number;
  };
  endpoints: Partial<Record<"products" | "search" | "categories" | "sitemap", string>>;
  lastProbeStatus: "ok" | "failed";
  lastProbeAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogProductDraft {
  storeId: string;
  sourceProductId: string;
  normalizedTitle: string;
  title: string;
  brand?: string;
  model?: string;
  sku?: string;
  sellerName?: string;
  sellerId?: string;
  categoryPath: string[];
  sourceUrl: string;
  imageUrl?: string;
  availability: "in_stock" | "out_of_stock" | "preorder" | "unknown";
  currency: string;
  livePrice?: number;
  originalPrice?: number;
  onSale: boolean;
  sourceConnector: ConnectorType;
  freshnessAt: string;
  lastSeenAt: string;
  offerLabel?: string;
  offerStartsAt?: string;
  offerEndsAt?: string;
  brandTokens: string[];
  modelTokens: string[];
  skuTokens: string[];
  rawPayload: Record<string, unknown>;
}

export interface ProductVariantDraft {
  productSourceId: string;
  sourceVariantId: string;
  title: string;
  sku?: string;
  availability: CatalogProductDraft["availability"];
  livePrice?: number;
  originalPrice?: number;
  attributes: Record<string, string>;
  lastSeenAt: string;
  rawPayload: Record<string, unknown>;
}

export interface OfferDraft {
  productSourceId: string;
  label?: string;
  discountAmount?: number;
  discountPercent?: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
  lastSeenAt: string;
  metadata: Record<string, unknown>;
}

export interface SyncRunRecord {
  id: string;
  storeId: string;
  scope: "probe" | "sync" | "discovery";
  triggerSource: "manual" | "queue" | "bootstrap" | "scheduler" | "api";
  status: "running" | "ok" | "failed";
  connectorType?: ConnectorType;
  productsDiscovered: number;
  productsUpserted: number;
  offersUpserted: number;
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  metadata: Record<string, unknown>;
}

export interface StoreSizeSummaryRecord {
  storeId: string;
  indexedProductCount: number;
  indexedVariantCount: number;
  activeOfferCount: number;
  categoryCount: number;
  lastSuccessfulSyncAt?: string;
  estimatedCatalogSize: number;
  coveragePct: number;
  syncPriorityTier: SyncPriorityTier;
  computedAt: string;
}

export interface DomainAcquisitionProfile {
  storeId: string;
  rootDomain: string;
  websiteType: "official" | "social" | "missing";
  connectorType?: ConnectorType;
  strategy: AcquisitionStrategy;
  lifecycleState: CatalogCoverageState;
  publicCatalogDetected: boolean;
  requiresSession: boolean;
  requiresFeed: boolean;
  duplicateOfStoreId?: string;
  notes?: string;
  lastClassifiedAt: string;
  details: Record<string, unknown>;
}

export interface DomainBlockerEvidence {
  id: string;
  storeId: string;
  blockerType: BlockerType;
  reason: string;
  httpStatus?: number;
  observedUrl?: string;
  observedAt: string;
  retryAfterHours?: number;
  details: Record<string, unknown>;
}

export interface SessionWorkflowRecord {
  storeId: string;
  status: "missing" | "ready" | "expired";
  cookiesJson?: string;
  headers?: Record<string, string>;
  notes?: string;
  expiresAt?: string;
  updatedAt: string;
}

export interface PartnerFeedRecord {
  storeId: string;
  status: "missing" | "ready" | "syncing" | "failed";
  feedType: "json";
  sourceUrl: string;
  authHeaders?: Record<string, string>;
  fieldMap?: Record<string, string>;
  updatedAt: string;
  lastSyncAt?: string;
  lastError?: string;
}

export interface CoverageSummaryRecord {
  generatedAt: string;
  totalStores: number;
  officialStores: number;
  indexedStores: number;
  zeroProductStores: number;
  blockedStores: number;
  nonCatalogStores: number;
  duplicateStores: number;
  deadStores: number;
  partnerFeedRequiredStores: number;
  topFailureReasons: Array<{ reason: string; count: number }>;
}

export interface SearchDocument {
  id: string;
  storeId: string;
  storeName: string;
  normalizedTitle: string;
  title: string;
  brand?: string;
  model?: string;
  sku?: string;
  livePrice?: number;
  originalPrice?: number;
  onSale: boolean;
  availability: CatalogProductDraft["availability"];
  freshnessAt: string;
  sourceUrl: string;
  categoryPath: string;
  sellerName?: string;
}

export interface AuditLogRecord {
  id: string;
  actor: string;
  action: string;
  storeId?: string;
  syncRunId?: string;
  details: Record<string, unknown>;
  createdAt: string;
}

export interface RawSnapshotRecord {
  id: string;
  storeId: string;
  syncRunId: string;
  connectorType: ConnectorType;
  objectKey: string;
  sha256: string;
  sizeBytes: number;
  encrypted: boolean;
  capturedAt: string;
}

export interface ProbeResult {
  connectorType: ConnectorType;
  confidence: number;
  signals: string[];
  capabilities: ConnectorCapabilities;
  endpoints: ConnectorProfileRecord["endpoints"];
}

export interface SyncResult {
  products: CatalogProductDraft[];
  variants: ProductVariantDraft[];
  offers: OfferDraft[];
  estimatedCatalogSize?: number;
  snapshots: Array<{
    label: string;
    payload: unknown;
  }>;
}
