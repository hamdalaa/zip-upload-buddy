import type { BrandDealer, ProductIndex, Shop } from "./types";
import { fetchJson } from "./api";

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

export interface BrandDetailResponse {
  brand: BrandDealer;
  stores: Shop[];
  products: ProductIndex[];
}

export async function getCatalogBootstrap() {
  return fetchJson<CatalogBootstrap>("/public/bootstrap");
}

export async function getCatalogProducts(limit = 2000, offset = 0) {
  const url = new URL("/public/catalog-products", window.location.origin);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  return fetchJson<CatalogProductsResponse>(`${url.pathname}${url.search}`);
}

export async function getStoreDetail(storeId: string) {
  return fetchJson<StoreDetailResponse>(`/public/stores/${encodeURIComponent(storeId)}`);
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const url = new URL("/public/products/by-ids", window.location.origin);
  ids.forEach((id) => url.searchParams.append("id", id));
  const response = await fetchJson<{ items: ProductIndex[] }>(`${url.pathname}${url.search}`);
  return response.items;
}

export async function getBrandDetail(slug: string) {
  return fetchJson<BrandDetailResponse>(`/public/brands/${encodeURIComponent(slug)}`);
}
