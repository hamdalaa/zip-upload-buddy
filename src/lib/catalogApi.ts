import type { BrandDealer, ProductIndex, Shop } from "./types";
import { ApiError, fetchJson, withQuery } from "./api";
import type { AdminSiteSettings } from "./adminTypes";

export interface CatalogBootstrap {
  summary: {
    totalStores: number;
    indexedStores: number;
    totalProducts: number;
    lastSyncAt?: string;
  };
  stores: Shop[];
  brands: BrandDealer[];
  home: {
    deals: ProductIndex[];
    trending: ProductIndex[];
    latest: ProductIndex[];
  };
}

export interface CatalogBootstrapLite {
  summary: CatalogBootstrap["summary"];
  featuredShops: Shop[];
  topRatedShops: Shop[];
  brands: BrandDealer[];
  home: CatalogBootstrap["home"];
}

export interface CatalogProductsResponse {
  total: number;
  limit: number;
  offset: number;
  items: ProductIndex[];
}

export interface StoreDetailResponse {
  store: Shop;
  products: ProductIndex[];
  sources: Array<{
    id: string;
    shopId: string;
    sourceType: "website" | "google_maps" | "manual";
    sourceUrl: string;
    status: "ok" | "failed" | "pending";
    lastCrawledAt?: string;
    pagesVisited: number;
  }>;
}

export interface StoreSummaryResponse {
  store: Shop;
  size?: {
    indexedProductCount: number;
    indexedVariantCount: number;
    activeOfferCount: number;
    categoryCount: number;
    lastSuccessfulSyncAt?: string;
    estimatedCatalogSize: number;
    coveragePct: number;
    syncPriorityTier: string;
    computedAt: string;
  };
  sourceCount: number;
  connectorProfile?: unknown;
}

export interface BrandDetailResponse {
  brand: BrandDealer;
  stores: Shop[];
  products: ProductIndex[];
}

export interface BrandSummaryResponse {
  brand: BrandDealer;
  topStores: Shop[];
  totalStores: number;
  totalProducts: number;
}

export interface CityIndexEntry {
  slug: string;
  city: string;
  cityAr: string;
  count: number;
}

export interface CityShop {
  id: string;
  place_id?: string;
  name: string;
  city: string;
  area?: string;
  category?: string;
  suggested_category?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  websiteType?: string;
  googleMapsUrl?: string;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number;
  imageUrl?: string;
  gallery?: string[];
  openNow?: boolean | null;
  businessStatus?: string;
  workingHours?: string[];
  trustBadges?: string[];
  primaryType?: string;
  editorialSummary?: string;
  reviewSummary?: string;
  reviewsSample?: Array<{
    rating?: number | null;
    relativePublishTime?: string;
    publishTime?: string;
    text?: string;
    authorName?: string;
    authorPhotoUrl?: string;
    reviewGoogleMapsUrl?: string;
  }>;
  quickSignals?: {
    has_website?: boolean;
    website_type?: string;
    has_google_maps?: boolean;
    has_rating?: boolean;
    has_reviews?: boolean;
    has_photos?: boolean;
    open_now?: boolean | null;
    business_status?: string;
  };
  lastUpdatedAt?: string;
}

export interface CityFile {
  city: string;
  cityAr: string;
  slug: string;
  count: number;
  stores: CityShop[];
}

function shouldFallbackToLegacy(error: unknown) {
  if (error instanceof ApiError) {
    return error.status === 404 || error.status >= 500;
  }
  if (error instanceof TypeError) {
    return /fetch|network|cors/i.test(error.message);
  }
  return false;
}

function toStoreSummary(detail: StoreDetailResponse): StoreSummaryResponse {
  return {
    store: detail.store,
    size: undefined,
    sourceCount: detail.sources.length,
    connectorProfile: undefined,
  };
}

function toBrandSummary(detail: BrandDetailResponse): BrandSummaryResponse {
  return {
    brand: detail.brand,
    topStores: detail.stores.slice(0, 8),
    totalStores: detail.stores.length,
    totalProducts: detail.products.length,
  };
}

export async function getCatalogBootstrap() {
  return fetchJson<CatalogBootstrap>("/public/bootstrap");
}

export async function getCatalogBootstrapLite() {
  try {
    return await fetchJson<CatalogBootstrapLite>("/public/bootstrap-lite");
  } catch (error) {
    if (!shouldFallbackToLegacy(error)) throw error;
    const legacy = await getCatalogBootstrap();
    return {
      summary: legacy.summary,
      featuredShops: legacy.stores.filter((shop) => Boolean(shop.featured)).slice(0, 8),
      topRatedShops: [...legacy.stores]
        .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
        .slice(0, 8),
      brands: legacy.brands,
      home: legacy.home,
    };
  }
}

export async function getPublicSiteSettings() {
  return fetchJson<AdminSiteSettings>("/public/settings/site");
}

export async function getCatalogProducts(limit = 100, offset = 0) {
  return fetchJson<CatalogProductsResponse>(
    withQuery("/public/catalog-products", { limit, offset }),
  );
}

export async function getStoreDetail(storeId: string) {
  return fetchJson<StoreDetailResponse>(`/public/stores/${encodeURIComponent(storeId)}`);
}

export async function getStoreSummary(storeId: string) {
  try {
    return await fetchJson<StoreSummaryResponse>(`/public/stores/${encodeURIComponent(storeId)}/summary`);
  } catch (error) {
    if (!shouldFallbackToLegacy(error)) throw error;
    const legacy = await getStoreDetail(storeId);
    return toStoreSummary(legacy);
  }
}

export async function getStoreProducts(storeId: string, limit = 24, offset = 0) {
  try {
    return await fetchJson<CatalogProductsResponse>(
      withQuery(`/public/stores/${encodeURIComponent(storeId)}/products`, { limit, offset }),
    );
  } catch (error) {
    if (!shouldFallbackToLegacy(error)) throw error;
    const legacy = await getStoreDetail(storeId);
    return {
      total: legacy.products.length,
      limit,
      offset,
      items: legacy.products.slice(offset, offset + limit),
    };
  }
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("id", id));
  const response = await fetchJson<{ items: ProductIndex[] }>(
    `/public/products/by-ids?${params.toString()}`,
  );
  return response.items;
}

export async function getBrandDetail(slug: string) {
  return fetchJson<BrandDetailResponse>(`/public/brands/${encodeURIComponent(slug)}`);
}

export async function getBrandSummary(slug: string) {
  try {
    return await fetchJson<BrandSummaryResponse>(`/public/brands/${encodeURIComponent(slug)}/summary`);
  } catch (error) {
    if (!shouldFallbackToLegacy(error)) throw error;
    const legacy = await getBrandDetail(slug);
    return toBrandSummary(legacy);
  }
}

export async function getBrandProducts(slug: string, limit = 24, offset = 0) {
  try {
    return await fetchJson<CatalogProductsResponse>(
      withQuery(`/public/brands/${encodeURIComponent(slug)}/products`, { limit, offset }),
    );
  } catch (error) {
    if (!shouldFallbackToLegacy(error)) throw error;
    const legacy = await getBrandDetail(slug);
    return {
      total: legacy.products.length,
      limit,
      offset,
      items: legacy.products.slice(offset, offset + limit),
    };
  }
}

export async function getCities() {
  return fetchJson<CityIndexEntry[]>("/public/cities");
}

export async function getCityDetail(slug: string) {
  return fetchJson<CityFile>(`/public/cities/${encodeURIComponent(slug)}`);
}
