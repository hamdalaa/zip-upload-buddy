/**
 * Unified Search — frontend contract backed by the public-safe backend adapter.
 * The UI continues to consume `searchUnified()`, `getProduct()`, and
 * `getProductOffers()` while the actual data now comes from `/public/*`.
 */

import { ApiError, fetchJson, withQuery } from "@/lib/api";
import type { ProductIndex, Shop } from "@/lib/types";
import { getShopRatingValue, getShopReviewCount } from "@/lib/shopRanking";
import { formatIQDPrice } from "@/lib/prices";

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
  priceCurrency?: "IQD" | "USD";
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

export interface UnifiedProductFullResponse {
  product: UnifiedProduct;
  offers: UnifiedOffer[];
}

// Arabic ↔ English synonyms — expanded into the haystack so users searching
// in either language find the same products. Keep this small & focused on
// the most common Iraqi/Arabic spellings of brands & categories.
const SYNONYMS: Record<string, string[]> = {
  iphone: ["apple", "ايفون", "آيفون"],
  samsung: ["سامسونغ", "سامسونج", "galaxy"],
  mac: ["macbook", "mac mini", "macmini", "imac", "apple", "ماك", "ماكبوك"],
  macbook: ["mac", "apple", "ماك", "ماكبوك"],
  imac: ["mac", "apple", "ماك"],
  apple: ["iphone", "ipad", "macbook", "mac", "ابل", "آبل"],
  "ايفون": ["iphone", "apple"],
  "أيفون": ["iphone", "apple"],
  "آيفون": ["iphone", "apple"],
  "سامسونغ": ["samsung", "galaxy"],
  "سامسونج": ["samsung", "galaxy"],
  "ماك": ["mac", "macbook", "mac mini", "macmini", "imac", "apple"],
  "ماكبوك": ["macbook", "mac", "apple"],
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

const PUBLIC_SEARCH_RESPONSE_VERSION = "relevance-v2";

const TOKEN_SPLIT_RE = /[\s\-_/,.()]+/;

interface PreparedSearchQuery {
  raw: string;
  normalized: string;
  compact: string;
  baseTokens: string[];
  aliasTokens: string[];
}

function normalizeArabic(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىئ]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ـ/g, "");
}

function normalizeSearchText(input: string): string {
  return normalizeArabic(input.toLowerCase()).replace(/\s+/g, " ").trim();
}

function compactSearchText(input: string): string {
  return normalizeSearchText(input).replace(/[^\p{L}\p{N}]+/gu, "");
}

function tokenizeSearchText(input: string): string[] {
  return normalizeSearchText(input)
    .split(TOKEN_SPLIT_RE)
    .map((token) => token.trim())
    .filter(Boolean);
}

function isMeaningfulQueryToken(token: string): boolean {
  if (token.length >= 3) return true;
  return /\d/.test(token);
}

function collectAliasTokens(baseTokens: string[]): string[] {
  const out = new Set<string>();
  for (const token of baseTokens) {
    const aliases = SYNONYMS[token];
    if (!aliases) continue;
    for (const alias of aliases) {
      for (const aliasToken of tokenizeSearchText(alias)) {
        if (isMeaningfulQueryToken(aliasToken)) out.add(aliasToken);
      }
    }
  }
  return [...out].filter((token) => !baseTokens.includes(token));
}

function prepareSearchQuery(query: string): PreparedSearchQuery {
  const normalized = normalizeSearchText(query);
  const baseTokens = tokenizeSearchText(query).filter(isMeaningfulQueryToken);

  return {
    raw: query,
    normalized,
    compact: compactSearchText(query),
    baseTokens,
    aliasTokens: collectAliasTokens(baseTokens),
  };
}

function scoreTokenSet(
  queryTokens: string[],
  fieldTokens: string[],
  weights: { exact: number; prefix: number; contains: number },
): { score: number; matches: number } {
  let score = 0;
  let matches = 0;

  for (const queryToken of queryTokens) {
    let best = 0;
    for (const fieldToken of fieldTokens) {
      if (fieldToken === queryToken) {
        best = Math.max(best, weights.exact);
        continue;
      }
      if (fieldToken.startsWith(queryToken) || queryToken.startsWith(fieldToken)) {
        best = Math.max(best, weights.prefix);
        continue;
      }
      if (queryToken.length >= 4 && (fieldToken.includes(queryToken) || queryToken.includes(fieldToken))) {
        best = Math.max(best, weights.contains);
      }
    }

    if (best > 0) {
      score += best;
      matches += 1;
    }
  }

  return { score, matches };
}

function scoreFieldMatch(
  query: PreparedSearchQuery,
  value: string | undefined,
  weight = 1,
): number {
  if (!query.raw.trim() || !value) return 0;

  const normalizedValue = normalizeSearchText(value);
  const compactValue = compactSearchText(value);
  const valueTokens = tokenizeSearchText(value).filter(isMeaningfulQueryToken);

  let score = 0;

  if (query.compact && compactValue === query.compact) score += 40;
  if (query.normalized && normalizedValue === query.normalized) score += 32;
  if (query.normalized && normalizedValue.startsWith(query.normalized)) score += 24;
  if (query.compact && compactValue.startsWith(query.compact)) score += 18;
  if (query.compact && compactValue.includes(query.compact)) score += query.compact.length <= 3 ? 3 : 7;

  const base = scoreTokenSet(query.baseTokens, valueTokens, {
    exact: 14,
    prefix: 8,
    contains: 4,
  });
  const alias = scoreTokenSet(query.aliasTokens, valueTokens, {
    exact: 4,
    prefix: 2.5,
    contains: 1,
  });

  score += base.score + alias.score;
  if (query.baseTokens.length > 0) {
    const coverage = base.matches / query.baseTokens.length;
    if (coverage === 1) score += 10;
    else if (coverage >= 0.6) score += 5;
  }

  return score * weight;
}

function scoreProductAutocomplete(product: ProductIndex, query: PreparedSearchQuery): number {
  let score = 0;
  score += scoreFieldMatch(query, product.name, 5);
  score += scoreFieldMatch(query, product.brand, 3.5);
  score += scoreFieldMatch(query, product.sku, 4);
  score += scoreFieldMatch(query, product.category, 1.2);
  score += scoreFieldMatch(query, product.shopName, 1);
  if (product.inStock) score += 0.3;
  return score;
}

function scoreShopRelevance(shop: Shop, query: PreparedSearchQuery): number {
  let score = 0;
  score += scoreFieldMatch(query, shop.name, 5);
  score += scoreFieldMatch(query, shop.category, 2);
  score += scoreFieldMatch(query, shop.categories?.join(" "), 1.8);
  score += scoreFieldMatch(query, shop.area, 1.2);
  score += scoreFieldMatch(query, shop.address, 0.7);
  if (shop.verified) score += 0.2;
  return score;
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
      sv: PUBLIC_SEARCH_RESPONSE_VERSION,
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

export async function getProductFull(productId: string): Promise<UnifiedProductFullResponse | null> {
  try {
    return await fetchJson<UnifiedProductFullResponse>(`/public/products/${encodeURIComponent(productId)}/full`);
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

export function formatIQD(value?: number | null): string {
  return formatIQDPrice(value);
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
  const q = (req.q ?? "").trim();
  const preparedQuery = prepareSearchQuery(q);
  let shops = [...allShops];
  const relevanceByShopId = new Map<string, number>();

  if (q) {
    shops = shops
      .map((shop) => {
        const score = scoreShopRelevance(shop, preparedQuery);
        relevanceByShopId.set(shop.id, score);
        return { shop, score };
      })
      .filter((entry) => entry.score > 0)
      .map((entry) => entry.shop);
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
      shops.sort(
        (a, b) =>
          (relevanceByShopId.get(b.id) ?? 0) - (relevanceByShopId.get(a.id) ?? 0) ||
          defaultSort(a, b),
      );
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
 * Used by the live dropdown beneath the search bar with relevance-first ranking.
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
  const query = q.trim();
  if (!query) return [];
  const preparedQuery = prepareSearchQuery(query);
  const products = Array.isArray(productsOrLimit) ? productsOrLimit : [];
  const limit = typeof productsOrLimit === "number" ? productsOrLimit : limitArg;

  const scoredProducts = products
    .map((product) => ({
      score: scoreProductAutocomplete(product, preparedQuery),
      suggestion: {
        type: "product",
        id: product.id,
        label: product.name,
        sublabel: [product.brand, product.shopName].filter(Boolean).join(" • "),
        href: product.canonicalProductId ? `/product/${product.canonicalProductId}` : `/shop-view/${product.shopId}`,
      } satisfies AutocompleteSuggestion,
    }))
    .filter((entry) => entry.score > 0);

  const scoredShops = shops
    .map((shop) => ({
      score: scoreShopRelevance(shop, preparedQuery),
      suggestion: {
        type: "shop",
        id: shop.id,
        label: shop.name,
        sublabel: shop.area,
        href: `/shop-view/${shop.id}`,
      } satisfies AutocompleteSuggestion,
    }))
    .filter((entry) => entry.score > 0);

  return [...scoredProducts, ...scoredShops]
    .sort(
      (a, b) =>
        b.score - a.score ||
        Number(b.suggestion.type === "product") - Number(a.suggestion.type === "product") ||
        a.suggestion.label.localeCompare(b.suggestion.label, "ar"),
    )
    .slice(0, limit)
    .map((entry) => entry.suggestion);
}
