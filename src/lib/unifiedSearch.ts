/**
 * Unified Search — frontend contract backed by the public-safe backend adapter.
 * The UI continues to consume `searchUnified()`, `getProduct()`, and
 * `getProductOffers()` while the actual data now comes from `/public/*`.
 */

import { ApiError, fetchJson, withQuery } from "@/lib/api";
import type { ProductIndex, Shop } from "@/lib/types";
import { getShopRatingValue, getShopReviewCount } from "@/lib/shopRanking";

export type StockState = "in_stock" | "out_of_stock" | "preorder" | "unknown";

export interface UnifiedOffer {
  id: string;
  productId: string;
  storeId: string;
  storeName: string;
  storeLogoUrl?: string;
  storeCity?: string;
  storeRating?: number;
  verified?: boolean;
  officialDealer?: boolean;
  price: number;            // IQD
  originalPrice?: number;   // IQD
  currency: "IQD" | "USD";
  stock: StockState;
  productUrl: string;
  shippingNote?: string;    // "يوصّل اليوم" / "توصيل لكل العراق"
  lastSeenAt: string;       // ISO
  freshnessLabel?: string;  // "محدّث قبل ساعتين"
}

export interface UnifiedProduct {
  id: string;                // canonical product id (e.g. brand+model hash)
  title: string;
  brand?: string;
  model?: string;
  category?: string;
  description?: string;
  images: string[];          // canonical merged gallery
  specs?: Record<string, string>;
  rating?: number;
  reviewCount?: number;
  lowestPrice?: number;
  highestPrice?: number;
  offerCount: number;
  inStockCount: number;
  bestOfferId?: string;
}

export interface UnifiedSearchFilters {
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
}

export type SortKey =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "rating_desc"
  | "freshness_desc"
  | "offers_desc";

export interface UnifiedSearchRequest extends UnifiedSearchFilters {
  sort?: SortKey;
  page?: number;
  pageSize?: number;
}

export interface UnifiedSearchFacet {
  key: string;
  label: string;
  count: number;
}

export interface UnifiedSearchResponse {
  query: string;
  totalProducts: number;
  totalOffers: number;
  storesCovered: number;
  storesScanned: number;
  durationMs: number;
  products: UnifiedProduct[];
  facets: {
    brands: UnifiedSearchFacet[];
    categories: UnifiedSearchFacet[];
    stores: UnifiedSearchFacet[];
    cities: UnifiedSearchFacet[];
    priceRange: { min: number; max: number };
  };
}

// Arabic ↔ English synonyms — expanded into the haystack so users searching
// in either language find the same products. Keep this small & focused on
// the most common Iraqi/Arabic spellings of brands & categories.
const SYNONYMS: Record<string, string[]> = {
  "ايفون": ["iphone", "apple"],
  "أيفون": ["iphone", "apple"],
  "آيفون": ["iphone", "apple"],
  "سامسونغ": ["samsung", "galaxy"],
  "سامسونج": ["samsung", "galaxy"],
  "ماك": ["mac", "macbook", "apple"],
  "ماكبوك": ["macbook", "apple"],
  "بلايستيشن": ["playstation", "ps5", "sony"],
  "بليستيشن": ["playstation", "ps5", "sony"],
  "بلاي": ["playstation", "sony"],
  "سوني": ["sony"],
  "انكر": ["anker"],
  "أنكر": ["anker"],
  "شاحن": ["charger", "chargers", "anker"],
  "هاتف": ["phone", "phones"],
  "موبايل": ["phone", "phones"],
  "لابتوب": ["laptop", "computing", "macbook"],
  "حاسبة": ["computing", "laptop"],
  "سماعة": ["headphones", "accessories", "sony"],
  "سماعات": ["headphones", "accessories"],
};

function expandQuery(q: string): string[] {
  const tokens = q.split(/\s+/).filter(Boolean);
  const out = new Set<string>([q]);
  for (const t of tokens) {
    out.add(t);
    if (SYNONYMS[t]) for (const s of SYNONYMS[t]) out.add(s);
  }
  return [...out];
}

export async function searchUnified(req: UnifiedSearchRequest): Promise<UnifiedSearchResponse> {
  return fetchJson<UnifiedSearchResponse>(
    withQuery("/public/search", {
      q: req.q,
      brands: req.brands?.join(","),
      categories: req.categories?.join(","),
      stores: req.stores?.join(","),
      cities: req.cities?.join(","),
      priceMin: req.priceMin,
      priceMax: req.priceMax,
      inStockOnly: req.inStockOnly,
      onSaleOnly: req.onSaleOnly,
      verifiedOnly: req.verifiedOnly,
      officialDealerOnly: req.officialDealerOnly,
      sort: req.sort,
    }),
  );
}

export async function getProduct(productId: string): Promise<UnifiedProduct | null> {
  try {
    return await fetchJson<UnifiedProduct>(`/public/products/${encodeURIComponent(productId)}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function getProductOffers(productId: string): Promise<UnifiedOffer[]> {
  try {
    return await fetchJson<UnifiedOffer[]>(`/public/products/${encodeURIComponent(productId)}/offers`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return [];
    throw error;
  }
}

export function formatIQD(value: number): string {
  return `${value.toLocaleString("ar-IQ")} د.ع`;
}

/* ====================================================================
 * SHOP SEARCH — searches across the real store list already loaded into the
 * app shell from `/public/bootstrap`.
 * ==================================================================== */

export interface ShopSearchFilters {
  q?: string;
  cities?: string[];          // matches shop.area for now (street-level)
  categories?: string[];
  verifiedOnly?: boolean;
  ratingMin?: number;         // 0..5
  hasWebsite?: boolean;
  hasPhone?: boolean;
}

export type ShopSortKey =
  | "relevance"
  | "rating_desc"
  | "name_asc"
  | "verified_first";

export interface ShopSearchResult {
  query: string;
  totalShops: number;
  shops: Shop[];
  facets: {
    areas: UnifiedSearchFacet[];
    categories: UnifiedSearchFacet[];
  };
  durationMs: number;
}

/**
 * Synchronous shop search — operates on an in-memory list passed by the caller.
 * The /search page passes shops from useDataStore(); the backend will eventually
 * expose a parallel /api/shops/search endpoint with the same shape.
 */
export function searchShops(
  allShops: Shop[],
  req: ShopSearchFilters & { sort?: ShopSortKey },
): ShopSearchResult {
  const start = performance.now();
  const q = (req.q ?? "").trim().toLowerCase();
  let shops = [...allShops];

  if (q) {
    const terms = expandQuery(q);
    shops = shops.filter((s) => {
      const hay = [s.name, s.area, s.category, s.address, ...(s.categories ?? [])]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return terms.some((t) => hay.includes(t));
    });
  }
  if (req.cities?.length) shops = shops.filter((s) => req.cities!.includes(s.area));
  if (req.categories?.length) {
    shops = shops.filter((s) => {
      const cats = s.categories?.length ? s.categories : [s.category];
      return cats.some((c) => req.categories!.includes(c));
    });
  }
  if (req.verifiedOnly) shops = shops.filter((s) => s.verified);
  if (req.hasWebsite) shops = shops.filter((s) => !!s.website);
  if (req.hasPhone) shops = shops.filter((s) => !!s.phone || !!s.whatsapp);

  // Default ranking: شارع الصناعة first (primary hub), then by rating × reviews.
  // Explicit sort options override this.
  const defaultSort = (a: Shop, b: Shop) => {
    const sinaaA = a.area === "شارع الصناعة" ? 1 : 0;
    const sinaaB = b.area === "شارع الصناعة" ? 1 : 0;
    if (sinaaA !== sinaaB) return sinaaB - sinaaA;
    const ra = getShopRatingValue(a) * Math.log10(getShopReviewCount(a) + 10);
    const rb = getShopRatingValue(b) * Math.log10(getShopReviewCount(b) + 10);
    if (rb !== ra) return rb - ra;
    return Number(b.verified) - Number(a.verified);
  };

  switch (req.sort) {
    case "name_asc": shops.sort((a, b) => a.name.localeCompare(b.name, "ar")); break;
    case "verified_first":
      shops.sort((a, b) => Number(b.verified) - Number(a.verified) || defaultSort(a, b));
      break;
    case "rating_desc":
      shops.sort((a, b) => getShopRatingValue(b) - getShopRatingValue(a) || getShopReviewCount(b) - getShopReviewCount(a));
      break;
    case "relevance":
    default:
      shops.sort(defaultSort);
      break;
  }

  // Build facets
  const areaMap = new Map<string, number>();
  const catMap = new Map<string, number>();
  for (const s of shops) {
    areaMap.set(s.area, (areaMap.get(s.area) ?? 0) + 1);
    const cats = s.categories?.length ? s.categories : [s.category];
    for (const c of cats) catMap.set(c, (catMap.get(c) ?? 0) + 1);
  }

  return {
    query: req.q ?? "",
    totalShops: shops.length,
    shops,
    facets: {
      areas: [...areaMap.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
      categories: [...catMap.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
    },
    durationMs: Math.round(performance.now() - start),
  };
}

/**
 * Lightweight autocomplete — returns up to N suggestions across products + shops.
 * Used by the live dropdown beneath the search bar. Cheap string matching only.
 */
export interface AutocompleteSuggestion {
  type: "product" | "shop" | "brand" | "query";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
}

export function buildAutocomplete(
  q: string,
  shops: Shop[],
  productsOrLimit: ProductIndex[] | number = [],
  limitArg = 8,
): AutocompleteSuggestion[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const products = Array.isArray(productsOrLimit) ? productsOrLimit : [];
  const limit = typeof productsOrLimit === "number" ? productsOrLimit : limitArg;
  const terms = expandQuery(query);
  const out: AutocompleteSuggestion[] = [];
  const matches = (hay: string) => terms.some((t) => hay.includes(t));

  for (const p of products) {
    if (out.length >= limit) break;
    const hay = [p.name, p.brand, p.category, p.shopName].filter(Boolean).join(" ").toLowerCase();
    if (matches(hay)) {
      out.push({
        type: "product",
        id: p.id,
        label: p.name,
        sublabel: [p.brand, p.shopName].filter(Boolean).join(" • "),
        href: `/shop-view/${p.shopId}`,
      });
    }
  }

  // Shops
  for (const s of shops) {
    if (out.length >= limit) break;
    const hay = [s.name, s.area, s.category].filter(Boolean).join(" ").toLowerCase();
    if (matches(hay)) {
      out.push({
        type: "shop",
        id: s.id,
        label: s.name,
        sublabel: s.area,
        href: `/shop-view/${s.id}`,
      });
    }
  }

  return out.slice(0, limit);
}
