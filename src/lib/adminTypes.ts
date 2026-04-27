export interface AdminCatalogStats {
  totalStores: number;
  storesWithWebsite: number;
  indexedStores: number;
  zeroProductStores: number;
  totalProducts: number;
  totalVariants: number;
  totalOffers: number;
  latestSyncAt?: string;
  latestProbeAt?: string;
}

export interface AdminHealth {
  ok: boolean;
  runtime: {
    apiMode?: string;
    scope?: "all" | "subset";
    scopedStoreCount?: number;
  };
  database: {
    driver: string;
    configured: boolean;
  };
  redis: {
    configured: boolean;
  };
  publicApi: {
    ok: boolean;
  };
  flags: {
    docsEnabled: boolean;
    trustProxy: boolean;
  };
  counts: {
    stores: number;
    storesWithWebsite: number;
    storesWithProducts: number;
    zeroProductStores: number;
    totalProducts: number;
    totalVariants: number;
    totalOffers: number;
  };
}

export interface AdminStore {
  id: string;
  name: string;
  website?: string;
  area?: string;
  primaryCategory?: string;
  status: string;
  lastProbeAt?: string;
  lastSyncAt?: string;
}

export interface AdminConnectorProfile {
  connectorType?: string;
  platformConfidence?: number;
  lastProbeStatus?: string;
  endpoints?: Record<string, string>;
}

export interface AdminStoreSize {
  indexedProductCount: number;
  indexedVariantCount: number;
  activeOfferCount: number;
  categoryCount: number;
  estimatedCatalogSize: number;
  coveragePct: number;
  computedAt: string;
  lastSuccessfulSyncAt?: string;
}

export interface AdminAcquisitionProfile {
  lifecycleState?: string;
  strategy?: string;
  notes?: string;
  requiresSession?: boolean;
  requiresFeed?: boolean;
  duplicateOfStoreId?: string;
}

export interface AdminStoreListItem {
  store: AdminStore;
  connectorProfile?: AdminConnectorProfile;
  size?: AdminStoreSize;
  acquisitionProfile?: AdminAcquisitionProfile;
}

export interface AdminStoreListResponse {
  total: number;
  limit: number;
  offset: number;
  items: AdminStoreListItem[];
}

export interface AdminCoverageSummary {
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

export interface AdminDomainEvidence {
  store: AdminStore;
  size?: AdminStoreSize;
  acquisitionProfile: AdminAcquisitionProfile;
  blockerEvidence: Array<{
    blockerType: string;
    reason: string;
    observedAt: string;
    observedUrl?: string;
    httpStatus?: number;
  }>;
  sessionWorkflow?: {
    status: string;
    expiresAt?: string;
    notes?: string;
    updatedAt: string;
  };
  partnerFeed?: {
    status: string;
    sourceUrl: string;
    updatedAt: string;
    lastSyncAt?: string;
    lastError?: string;
  };
}

export interface AdminPullProductsJobAccepted {
  jobId: string;
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
}

export interface AdminPullProductsJob {
  id: string;
  kind?: "product-pull" | "store-url-pull" | "store-by-store-update";
  status: "queued" | "running" | "completed" | "failed";
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  args: Record<string, unknown>;
  progress?: {
    completedStores: number;
    totalStores: number;
    lastStoreId?: string;
    lastStoreName?: string;
    lastStatus?: string;
  };
  result?: Record<string, unknown>;
  error?: string;
}

export interface AdminSessionState {
  authenticated: boolean;
  csrfToken?: string;
  expiresAt?: string;
}

export interface AdminSiteSettingsPayload {
  hero: {
    badgeText: string;
    title: string;
    subtitle: string;
    storeMetricLabel: string;
    productMetricLabel: string;
    coverageMetricValue: string;
    coverageMetricLabel: string;
  };
  seo: {
    title: string;
    description: string;
  };
  featured: {
    storeIds: string[];
    brandSlugs: string[];
    categoryKeys: string[];
  };
  theme: {
    primaryHue: number;
    accentHue: number;
    surfaceTone: "light" | "warm" | "cool";
  };
}

export interface AdminSiteSettings {
  id: string;
  payload: AdminSiteSettingsPayload;
  updatedBy: string;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: string;
  actor: string;
  action: string;
  storeId?: string;
  syncRunId?: string;
  details: Record<string, unknown>;
  createdAt: string;
}
