import { useEffect, useMemo } from "react";
import { useQuery, type QueryKey, type UseQueryOptions } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import {
  getBrandDetail,
  getBrandProducts,
  getBrandSummary,
  getCatalogBootstrap,
  getCatalogBootstrapLite,
  getCityDetail,
  getCities,
  getPublicSiteSettings,
  getStoreDetail,
  getStoreProducts,
  getStoreSummary,
  type BrandSummaryResponse,
  type BrandDetailResponse,
  type CatalogBootstrap,
  type CatalogBootstrapLite,
  type CatalogProductsResponse,
  type CityFile,
  type CityIndexEntry,
  type StoreDetailResponse,
  type StoreSummaryResponse,
} from "./catalogApi";
import type { AdminSiteSettings } from "./adminTypes";
import {
  getProduct,
  getProductFull,
  getProductOffers,
  searchUnified,
  type UnifiedOffer,
  type UnifiedProduct,
  type UnifiedProductFullResponse,
  type UnifiedSearchRequest,
  type UnifiedSearchResponse,
} from "./unifiedSearch";
import { readPersistedQuery, writePersistedQuery } from "./queryStorage";

const MINUTE = 60_000;
const SEARCH_CACHE_SCHEMA_VERSION = "relevance-v2";

export const PERSIST_TTL = {
  bootstrap: MINUTE,
  bootstrapLite: MINUTE,
  product: 5 * MINUTE,
  productFull: 5 * MINUTE,
  productOffers: 5 * MINUTE,
  search: MINUTE,
  brand: 15 * MINUTE,
  brandSummary: 15 * MINUTE,
  brandProducts: 5 * MINUTE,
  store: 15 * MINUTE,
  storeSummary: 15 * MINUTE,
  storeProducts: 5 * MINUTE,
  cityList: 30 * MINUTE,
  cityDetail: 30 * MINUTE,
  siteSettings: 5 * MINUTE,
} as const;

export const queryKeys = {
  bootstrap: ["catalog", "bootstrap"] as const,
  bootstrapLite: ["catalog", "bootstrap-lite"] as const,
  brand: (slug: string) => ["catalog", "brand", slug] as const,
  brandSummary: (slug: string) => ["catalog", "brand-summary", slug] as const,
  brandProducts: (slug: string, limit: number, offset: number) => ["catalog", "brand-products", slug, limit, offset] as const,
  store: (storeId: string) => ["catalog", "store", storeId] as const,
  storeSummary: (storeId: string) => ["catalog", "store-summary", storeId] as const,
  storeProducts: (storeId: string, limit: number, offset: number) => ["catalog", "store-products", storeId, limit, offset] as const,
  product: (productId: string) => ["catalog", "product", productId] as const,
  productFull: (productId: string) => ["catalog", "product-full", productId] as const,
  productOffers: (productId: string) => ["catalog", "product-offers", productId] as const,
  search: (request: NormalizedUnifiedSearchRequest) => ["catalog", "search", request] as const,
  cityList: ["catalog", "cities"] as const,
  cityDetail: (slug: string) => ["catalog", "city", slug] as const,
  siteSettings: ["catalog", "site-settings"] as const,
};

interface PersistentQueryConfig<TQueryFnData, TData = TQueryFnData> {
  queryKey: QueryKey;
  ttlMs: number;
  queryFn: NonNullable<UseQueryOptions<TQueryFnData, Error, TData>["queryFn"]>;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
  select?: UseQueryOptions<TQueryFnData, Error, TData>["select"];
  placeholderData?: UseQueryOptions<TQueryFnData, Error, TData>["placeholderData"];
}

function usePersistentQuery<TQueryFnData, TData = TQueryFnData>({
  queryKey,
  ttlMs,
  queryFn,
  enabled = true,
  staleTime = 0,
  gcTime,
  select,
  placeholderData,
}: PersistentQueryConfig<TQueryFnData, TData>) {
  const initialRecord = useMemo(() => readPersistedQuery<TQueryFnData>(queryKey, ttlMs), [queryKey, ttlMs]);

  const query = useQuery({
    queryKey,
    queryFn,
    enabled,
    staleTime,
    gcTime,
    select,
    placeholderData,
    initialData: initialRecord?.data,
    initialDataUpdatedAt: initialRecord?.updatedAt,
  });

  useEffect(() => {
    if (!query.isSuccess) return;
    writePersistedQuery<TQueryFnData>(queryKey, {
      updatedAt: query.dataUpdatedAt || Date.now(),
      data: queryClient.getQueryData(queryKey) as TQueryFnData,
    });
  }, [query.dataUpdatedAt, query.isSuccess, queryKey]);

  return query;
}

type NormalizedUnifiedSearchRequest = {
  schemaVersion: typeof SEARCH_CACHE_SCHEMA_VERSION;
  q?: string;
  brands?: string[];
  categories?: string[];
  stores?: string[];
  cities?: string[];
  priceMin?: number;
  priceMax?: number;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  verifiedOnly?: boolean;
  officialDealerOnly?: boolean;
  sort: NonNullable<UnifiedSearchRequest["sort"]>;
};

function stableList(value?: string[]) {
  return value?.map((entry) => entry.trim()).filter(Boolean).sort();
}

export function normalizeUnifiedSearchRequest(req: UnifiedSearchRequest): NormalizedUnifiedSearchRequest {
  return {
    schemaVersion: SEARCH_CACHE_SCHEMA_VERSION,
    q: req.q?.trim() || undefined,
    brands: stableList(req.brands),
    categories: stableList(req.categories),
    stores: stableList(req.stores),
    cities: stableList(req.cities),
    priceMin: req.priceMin,
    priceMax: req.priceMax,
    inStockOnly: req.inStockOnly || undefined,
    onSaleOnly: req.onSaleOnly || undefined,
    verifiedOnly: req.verifiedOnly || undefined,
    officialDealerOnly: req.officialDealerOnly || undefined,
    sort: req.sort ?? "relevance",
  };
}

async function prefetchPersistentQuery<T>({
  queryKey,
  ttlMs,
  queryFn,
  staleTime = 0,
  gcTime,
}: Omit<PersistentQueryConfig<T>, "enabled" | "select">) {
  const persisted = readPersistedQuery<T>(queryKey, ttlMs);
  if (persisted) {
    queryClient.setQueryData(queryKey, persisted.data, { updatedAt: persisted.updatedAt });
    if (Date.now() - persisted.updatedAt <= staleTime) return;
  }

  await queryClient.prefetchQuery({
    queryKey,
    queryFn,
    staleTime,
    gcTime,
  });
}

export function useCatalogBootstrapQuery() {
  return usePersistentQuery<CatalogBootstrap>({
    queryKey: queryKeys.bootstrap,
    ttlMs: PERSIST_TTL.bootstrap,
    staleTime: 30_000,
    queryFn: () => getCatalogBootstrap(),
  });
}

export function useCatalogBootstrapLiteQuery() {
  return usePersistentQuery<CatalogBootstrapLite>({
    queryKey: queryKeys.bootstrapLite,
    ttlMs: PERSIST_TTL.bootstrapLite,
    staleTime: 30_000,
    queryFn: () => getCatalogBootstrapLite(),
  });
}

export function useSiteSettingsQuery() {
  return usePersistentQuery<AdminSiteSettings>({
    queryKey: queryKeys.siteSettings,
    ttlMs: PERSIST_TTL.siteSettings,
    staleTime: 5 * MINUTE,
    queryFn: () => getPublicSiteSettings(),
  });
}

export function useBrandDetailQuery(slug?: string) {
  return usePersistentQuery<BrandDetailResponse | null>({
    queryKey: queryKeys.brand(slug ?? ""),
    ttlMs: PERSIST_TTL.brand,
    staleTime: 5 * MINUTE,
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) return null;
      return getBrandDetail(slug);
    },
  });
}

export function useBrandSummaryQuery(slug?: string) {
  return usePersistentQuery<BrandSummaryResponse | null>({
    queryKey: queryKeys.brandSummary(slug ?? ""),
    ttlMs: PERSIST_TTL.brandSummary,
    staleTime: 5 * MINUTE,
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) return null;
      return getBrandSummary(slug);
    },
  });
}

export function useBrandProductsQuery(slug?: string, limit = 24, offset = 0) {
  return usePersistentQuery<CatalogProductsResponse | null>({
    queryKey: queryKeys.brandProducts(slug ?? "", limit, offset),
    ttlMs: PERSIST_TTL.brandProducts,
    staleTime: MINUTE,
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) return null;
      return getBrandProducts(slug, limit, offset);
    },
  });
}

export function useStoreDetailQuery(storeId?: string) {
  return usePersistentQuery<StoreDetailResponse | null>({
    queryKey: queryKeys.store(storeId ?? ""),
    ttlMs: PERSIST_TTL.store,
    staleTime: 5 * MINUTE,
    enabled: Boolean(storeId),
    queryFn: async () => {
      if (!storeId) return null;
      return getStoreDetail(storeId);
    },
  });
}

export function useStoreSummaryQuery(storeId?: string) {
  return usePersistentQuery<StoreSummaryResponse | null>({
    queryKey: queryKeys.storeSummary(storeId ?? ""),
    ttlMs: PERSIST_TTL.storeSummary,
    staleTime: 5 * MINUTE,
    enabled: Boolean(storeId),
    queryFn: async () => {
      if (!storeId) return null;
      return getStoreSummary(storeId);
    },
  });
}

export function useStoreProductsQuery(storeId?: string, limit = 24, offset = 0) {
  return usePersistentQuery<CatalogProductsResponse | null>({
    queryKey: queryKeys.storeProducts(storeId ?? "", limit, offset),
    ttlMs: PERSIST_TTL.storeProducts,
    staleTime: MINUTE,
    enabled: Boolean(storeId),
    queryFn: async () => {
      if (!storeId) return null;
      return getStoreProducts(storeId, limit, offset);
    },
  });
}

export function useProductDetailQuery(productId?: string) {
  return usePersistentQuery<UnifiedProduct | null>({
    queryKey: queryKeys.product(productId ?? ""),
    ttlMs: PERSIST_TTL.product,
    staleTime: 30_000,
    enabled: Boolean(productId),
    queryFn: async () => {
      if (!productId) return null;
      return getProduct(productId);
    },
  });
}

export function useProductFullQuery(productId?: string) {
  const query = usePersistentQuery<UnifiedProductFullResponse | null>({
    queryKey: queryKeys.productFull(productId ?? ""),
    ttlMs: PERSIST_TTL.productFull,
    staleTime: 30_000,
    enabled: Boolean(productId),
    queryFn: async () => {
      if (!productId) return null;
      return getProductFull(productId);
    },
  });

  useEffect(() => {
    if (!productId || !query.data?.product) return;
    queryClient.setQueryData(queryKeys.product(productId), query.data.product, { updatedAt: query.dataUpdatedAt });
    queryClient.setQueryData(queryKeys.productOffers(productId), query.data.offers, { updatedAt: query.dataUpdatedAt });
  }, [productId, query.data, query.dataUpdatedAt]);

  return query;
}

export function useProductOffersQuery(productId?: string) {
  return usePersistentQuery<UnifiedOffer[]>({
    queryKey: queryKeys.productOffers(productId ?? ""),
    ttlMs: PERSIST_TTL.productOffers,
    staleTime: 30_000,
    enabled: Boolean(productId),
    queryFn: async () => {
      if (!productId) return [];
      return getProductOffers(productId);
    },
  });
}

export function useUnifiedSearchQuery(req: UnifiedSearchRequest) {
  const normalized = useMemo(() => normalizeUnifiedSearchRequest(req), [req]);
  const queryKey = useMemo(() => queryKeys.search(normalized), [normalized]);

  return usePersistentQuery<UnifiedSearchResponse>({
    queryKey,
    ttlMs: PERSIST_TTL.search,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    queryFn: () => searchUnified(normalized),
  });
}

export function useCityListQuery() {
  return usePersistentQuery<CityIndexEntry[]>({
    queryKey: queryKeys.cityList,
    ttlMs: PERSIST_TTL.cityList,
    staleTime: 30 * MINUTE,
    queryFn: () => getCities(),
  });
}

export function useCityDetailQuery(slug?: string) {
  return usePersistentQuery<CityFile | null>({
    queryKey: queryKeys.cityDetail(slug ?? ""),
    ttlMs: PERSIST_TTL.cityDetail,
    staleTime: 30 * MINUTE,
    enabled: Boolean(slug),
    queryFn: async () => {
      if (!slug) return null;
      return getCityDetail(slug);
    },
  });
}

export function prefetchCatalogBootstrap() {
  return prefetchPersistentQuery<CatalogBootstrap>({
    queryKey: queryKeys.bootstrap,
    ttlMs: PERSIST_TTL.bootstrap,
    staleTime: 30_000,
    queryFn: () => getCatalogBootstrap(),
  });
}

export function prefetchCatalogBootstrapLite() {
  return prefetchPersistentQuery<CatalogBootstrapLite>({
    queryKey: queryKeys.bootstrapLite,
    ttlMs: PERSIST_TTL.bootstrapLite,
    staleTime: 5 * MINUTE,
    queryFn: () => getCatalogBootstrapLite(),
  });
}

export function prefetchBrandDetail(slug: string) {
  return prefetchPersistentQuery<BrandDetailResponse | null>({
    queryKey: queryKeys.brand(slug),
    ttlMs: PERSIST_TTL.brand,
    staleTime: 5 * MINUTE,
    queryFn: () => getBrandDetail(slug),
  });
}

export function prefetchBrandSummary(slug: string) {
  return prefetchPersistentQuery<BrandSummaryResponse | null>({
    queryKey: queryKeys.brandSummary(slug),
    ttlMs: PERSIST_TTL.brandSummary,
    staleTime: 5 * MINUTE,
    queryFn: () => getBrandSummary(slug),
  });
}

export function prefetchStoreDetail(storeId: string) {
  return prefetchPersistentQuery<StoreDetailResponse | null>({
    queryKey: queryKeys.store(storeId),
    ttlMs: PERSIST_TTL.store,
    staleTime: 5 * MINUTE,
    queryFn: () => getStoreDetail(storeId),
  });
}

export function prefetchStoreSummary(storeId: string) {
  return prefetchPersistentQuery<StoreSummaryResponse | null>({
    queryKey: queryKeys.storeSummary(storeId),
    ttlMs: PERSIST_TTL.storeSummary,
    staleTime: 5 * MINUTE,
    queryFn: () => getStoreSummary(storeId),
  });
}

export function prefetchProductDetail(productId: string) {
  return prefetchPersistentQuery<UnifiedProduct | null>({
    queryKey: queryKeys.product(productId),
    ttlMs: PERSIST_TTL.product,
    staleTime: 30_000,
    queryFn: () => getProduct(productId),
  });
}

export async function prefetchProductFull(productId: string) {
  await prefetchPersistentQuery<UnifiedProductFullResponse | null>({
    queryKey: queryKeys.productFull(productId),
    ttlMs: PERSIST_TTL.productFull,
    staleTime: 30_000,
    queryFn: () => getProductFull(productId),
  });
  const payload = queryClient.getQueryData<UnifiedProductFullResponse | null>(queryKeys.productFull(productId));
  if (!payload?.product) return;
  const updatedAt = queryClient.getQueryState(queryKeys.productFull(productId))?.dataUpdatedAt;
  queryClient.setQueryData(queryKeys.product(productId), payload.product, { updatedAt });
  queryClient.setQueryData(queryKeys.productOffers(productId), payload.offers, { updatedAt });
}

export function prefetchProductOffers(productId: string) {
  return prefetchPersistentQuery<UnifiedOffer[]>({
    queryKey: queryKeys.productOffers(productId),
    ttlMs: PERSIST_TTL.productOffers,
    staleTime: 30_000,
    queryFn: () => getProductOffers(productId),
  });
}

export function prefetchCityList() {
  return prefetchPersistentQuery<CityIndexEntry[]>({
    queryKey: queryKeys.cityList,
    ttlMs: PERSIST_TTL.cityList,
    staleTime: 30 * MINUTE,
    queryFn: () => getCities(),
  });
}

export function prefetchCityDetail(slug: string) {
  return prefetchPersistentQuery<CityFile | null>({
    queryKey: queryKeys.cityDetail(slug),
    ttlMs: PERSIST_TTL.cityDetail,
    staleTime: 30 * MINUTE,
    queryFn: () => getCityDetail(slug),
  });
}
