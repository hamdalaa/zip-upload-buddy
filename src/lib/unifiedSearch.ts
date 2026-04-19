/**
 * Unified Search — Types & Mock API
 * ----------------------------------
 * هذا الملف يعرّف الـ contract اللي راح يستخدمه الـ backend (Codex).
 * الـ UI يستهلك `searchUnified()` و `getProductOffers()` فقط.
 * بدّل الـ implementation داخل هذي الدوال بنداء HTTP حقيقي
 * عند جاهزية الـ backend — بدون تغيير أي مكوّن.
 *
 *   POST /api/search          → UnifiedSearchResponse
 *   GET  /api/products/:id    → UnifiedProduct
 *   GET  /api/products/:id/offers → UnifiedOffer[]
 */

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

/* ====================================================================
 * MOCK IMPLEMENTATION — replace with real fetch when backend is ready
 * ==================================================================== */

const MOCK_STORES = [
  { id: "miswag", name: "Miswag", city: "بغداد", rating: 4.6, verified: true, official: true },
  { id: "icenter", name: "iCenter Iraq", city: "بغداد", rating: 4.8, verified: true, official: true },
  { id: "korektel", name: "Korek Telecom", city: "أربيل", rating: 4.4, verified: true, official: false },
  { id: "elryan", name: "El Ryan Store", city: "بغداد", rating: 4.2, verified: true, official: false },
  { id: "jibalzone", name: "Jibalzone", city: "بغداد", rating: 4.3, verified: false, official: false },
  { id: "masterstore", name: "Master Store", city: "البصرة", rating: 4.5, verified: true, official: true },
  { id: "sinaa-1", name: "محل العراقي للكمبيوتر", city: "بغداد", rating: 4.1, verified: false, official: false },
  { id: "sinaa-2", name: "Tech Hub Sinaa", city: "بغداد", rating: 4.7, verified: true, official: false },
];

const MOCK_PRODUCTS_SEED = [
  {
    title: "iPhone 15 Pro Max 256GB",
    brand: "Apple",
    category: "Phones",
    image: "https://images.unsplash.com/photo-1592286927505-1def25115558?w=800&q=80",
    basePrice: 1850000,
    desc: "أحدث هاتف من Apple بشريحة A17 Pro، شاشة Super Retina XDR 6.7 بوصة، كاميرا 48MP بنظام Pro، وإطار من التيتانيوم.",
    specs: { "الشاشة": "6.7\" Super Retina XDR", "المعالج": "A17 Pro", "الذاكرة": "256GB", "الكاميرا": "48MP + 12MP + 12MP", "البطارية": "4422 mAh", "النظام": "iOS 17" },
  },
  {
    title: "Samsung Galaxy S24 Ultra 512GB",
    brand: "Samsung",
    category: "Phones",
    image: "https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800&q=80",
    basePrice: 1650000,
    desc: "هاتف فلاجشيب من سامسونج بشاشة Dynamic AMOLED 2X 6.8 بوصة، قلم S Pen، وكاميرا 200MP.",
    specs: { "الشاشة": "6.8\" Dynamic AMOLED", "المعالج": "Snapdragon 8 Gen 3", "الذاكرة": "512GB", "الكاميرا": "200MP", "البطارية": "5000 mAh" },
  },
  {
    title: "MacBook Pro 14\" M3 Pro",
    brand: "Apple",
    category: "Computing",
    image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800&q=80",
    basePrice: 2950000,
    desc: "لابتوب احترافي بشريحة M3 Pro، شاشة Liquid Retina XDR، أداء استثنائي للمصممين والمطوّرين.",
    specs: { "المعالج": "Apple M3 Pro", "الذاكرة": "18GB Unified", "التخزين": "512GB SSD", "الشاشة": "14.2\" Liquid Retina XDR" },
  },
  {
    title: "Sony WH-1000XM5 Wireless Headphones",
    brand: "Sony",
    category: "Accessories",
    image: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800&q=80",
    basePrice: 480000,
    desc: "سماعات لاسلكية مع أفضل تقنية إلغاء ضوضاء بالعالم، جودة صوت Hi-Res، وعمر بطارية 30 ساعة.",
    specs: { "النوع": "Over-ear", "البطارية": "30 ساعة", "الاتصال": "Bluetooth 5.2", "ANC": "نعم" },
  },
  {
    title: "PlayStation 5 Slim 1TB",
    brand: "Sony",
    category: "Gaming",
    image: "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=800&q=80",
    basePrice: 720000,
    desc: "جهاز PlayStation 5 الجديد بحجم أصغر بـ30%، تخزين SSD 1TB، يدعم 4K @120Hz.",
    specs: { "التخزين": "1TB SSD", "الدقة": "4K HDR", "الإطار": "120Hz", "المعالج": "AMD Zen 2" },
  },
  {
    title: "Anker PowerCore 20000mAh",
    brand: "Anker",
    category: "Chargers",
    image: "https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800&q=80",
    basePrice: 65000,
    desc: "باور بانك بسعة 20000mAh مع شحن سريع PD 22.5W، يشحن iPhone 15 حتى 4 مرات.",
    specs: { "السعة": "20000 mAh", "المخرج": "USB-C PD 22.5W", "الوزن": "490g" },
  },
];

function makeOffers(productIdx: number, basePrice: number): UnifiedOffer[] {
  const offers: UnifiedOffer[] = [];
  const storeCount = 3 + (productIdx % 4); // 3-6 stores per product
  for (let i = 0; i < storeCount; i++) {
    const store = MOCK_STORES[(productIdx + i) % MOCK_STORES.length];
    const variance = 0.92 + ((i * 7 + productIdx) % 15) / 100; // ±5-7%
    const price = Math.round((basePrice * variance) / 1000) * 1000;
    const onSale = i % 3 === 0;
    const outOfStock = i === storeCount - 1 && productIdx % 2 === 0;
    offers.push({
      id: `offer-${productIdx}-${i}`,
      productId: `product-${productIdx}`,
      storeId: store.id,
      storeName: store.name,
      storeCity: store.city,
      storeRating: store.rating,
      verified: store.verified,
      officialDealer: store.official,
      price,
      originalPrice: onSale ? Math.round(price * 1.12) : undefined,
      currency: "IQD",
      stock: outOfStock ? "out_of_stock" : "in_stock",
      productUrl: `https://${store.id}.iq/product/${productIdx}`,
      shippingNote: i % 2 === 0 ? "توصيل لكل العراق" : "يوصّل اليوم في بغداد",
      lastSeenAt: new Date(Date.now() - i * 3600_000).toISOString(),
      freshnessLabel: i === 0 ? "محدّث قبل دقائق" : `محدّث قبل ${i + 1} ساعة`,
    });
  }
  return offers;
}

const ALL_OFFERS_CACHE: UnifiedOffer[] = [];
const ALL_PRODUCTS_CACHE: UnifiedProduct[] = MOCK_PRODUCTS_SEED.map((seed, idx) => {
  const offers = makeOffers(idx, seed.basePrice);
  ALL_OFFERS_CACHE.push(...offers);
  const prices = offers.map((o) => o.price);
  const inStock = offers.filter((o) => o.stock === "in_stock");
  const best = inStock.sort((a, b) => a.price - b.price)[0] ?? offers[0];
  return {
    id: `product-${idx}`,
    title: seed.title,
    brand: seed.brand,
    category: seed.category,
    description: seed.desc,
    images: [seed.image, seed.image, seed.image],
    specs: seed.specs,
    rating: 4.2 + ((idx * 13) % 7) / 10,
    reviewCount: 50 + idx * 37,
    lowestPrice: Math.min(...prices),
    highestPrice: Math.max(...prices),
    offerCount: offers.length,
    inStockCount: inStock.length,
    bestOfferId: best.id,
  };
});

function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
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
  const start = performance.now();
  const q = (req.q ?? "").trim().toLowerCase();
  let products = [...ALL_PRODUCTS_CACHE];

  if (q) {
    const terms = expandQuery(q);
    const matchTerm = (hay: string) => terms.some((t) => hay.includes(t));
    products = products.filter((p) => {
      // 1) Direct match against the product itself
      const productHay = [p.title, p.brand, p.category, p.description]
        .filter(Boolean).join(" ").toLowerCase();
      if (matchTerm(productHay)) return true;

      // 2) Indirect match — query targets a STORE/CITY that carries this product.
      //    e.g. searching "Miswag" or "بغداد" surfaces every product offered there.
      const offers = ALL_OFFERS_CACHE.filter((o) => o.productId === p.id);
      return offers.some((o) => {
        const offerHay = [o.storeName, o.storeId, o.storeCity]
          .filter(Boolean).join(" ").toLowerCase();
        return matchTerm(offerHay);
      });
    });
  }
  if (req.brands?.length) products = products.filter((p) => p.brand && req.brands!.includes(p.brand));
  if (req.categories?.length) products = products.filter((p) => p.category && req.categories!.includes(p.category));
  if (req.priceMin != null) products = products.filter((p) => (p.lowestPrice ?? 0) >= req.priceMin!);
  if (req.priceMax != null) products = products.filter((p) => (p.lowestPrice ?? 0) <= req.priceMax!);
  if (req.inStockOnly) products = products.filter((p) => p.inStockCount > 0);

  // Filter by store/city — must check offers
  if (req.stores?.length || req.cities?.length || req.officialDealerOnly || req.verifiedOnly || req.onSaleOnly) {
    products = products.filter((p) => {
      const offers = ALL_OFFERS_CACHE.filter((o) => o.productId === p.id);
      return offers.some((o) => {
        if (req.stores?.length && !req.stores.includes(o.storeId)) return false;
        if (req.cities?.length && !req.cities.includes(o.storeCity ?? "")) return false;
        if (req.officialDealerOnly && !o.officialDealer) return false;
        if (req.verifiedOnly && !o.verified) return false;
        if (req.onSaleOnly && !o.originalPrice) return false;
        return true;
      });
    });
  }

  // Sort — default (relevance / no query) ranks by rating × offer count so the
  // most-loved & widely-available items surface first.
  switch (req.sort) {
    case "price_asc": products.sort((a, b) => (a.lowestPrice ?? 0) - (b.lowestPrice ?? 0)); break;
    case "price_desc": products.sort((a, b) => (b.lowestPrice ?? 0) - (a.lowestPrice ?? 0)); break;
    case "rating_desc": products.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)); break;
    case "offers_desc": products.sort((a, b) => b.offerCount - a.offerCount); break;
    case "freshness_desc":
    case "relevance":
    default:
      products.sort((a, b) => {
        const sa = (a.rating ?? 0) * 10 + a.offerCount;
        const sb = (b.rating ?? 0) * 10 + b.offerCount;
        return sb - sa;
      });
      break;
  }

  // Facets
  const brandMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const storeMap = new Map<string, { name: string; count: number }>();
  const cityMap = new Map<string, number>();
  let priceMin = Infinity, priceMax = 0;

  for (const p of products) {
    if (p.brand) brandMap.set(p.brand, (brandMap.get(p.brand) ?? 0) + 1);
    if (p.category) categoryMap.set(p.category, (categoryMap.get(p.category) ?? 0) + 1);
    if (p.lowestPrice != null) priceMin = Math.min(priceMin, p.lowestPrice);
    if (p.highestPrice != null) priceMax = Math.max(priceMax, p.highestPrice);
    const offers = ALL_OFFERS_CACHE.filter((o) => o.productId === p.id);
    for (const o of offers) {
      const cur = storeMap.get(o.storeId) ?? { name: o.storeName, count: 0 };
      storeMap.set(o.storeId, { name: o.storeName, count: cur.count + 1 });
      if (o.storeCity) cityMap.set(o.storeCity, (cityMap.get(o.storeCity) ?? 0) + 1);
    }
  }

  const totalOffers = products.reduce((sum, p) => sum + p.offerCount, 0);
  const storesCovered = storeMap.size;

  const response: UnifiedSearchResponse = {
    query: req.q ?? "",
    totalProducts: products.length,
    totalOffers,
    storesCovered,
    storesScanned: MOCK_STORES.length,
    durationMs: Math.round(performance.now() - start),
    products,
    facets: {
      brands: [...brandMap.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
      categories: [...categoryMap.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
      stores: [...storeMap.entries()].map(([key, v]) => ({ key, label: v.name, count: v.count })).sort((a, b) => b.count - a.count),
      cities: [...cityMap.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
      priceRange: { min: isFinite(priceMin) ? priceMin : 0, max: priceMax || 5_000_000 },
    },
  };
  return delay(response);
}

export async function getProduct(productId: string): Promise<UnifiedProduct | null> {
  const product = ALL_PRODUCTS_CACHE.find((p) => p.id === productId) ?? null;
  return delay(product);
}

export async function getProductOffers(productId: string): Promise<UnifiedOffer[]> {
  const offers = ALL_OFFERS_CACHE.filter((o) => o.productId === productId).sort((a, b) => {
    // in_stock first, then by price
    if (a.stock === "in_stock" && b.stock !== "in_stock") return -1;
    if (b.stock === "in_stock" && a.stock !== "in_stock") return 1;
    return a.price - b.price;
  });
  return delay(offers);
}

export function formatIQD(value: number): string {
  return `${value.toLocaleString("ar-IQ")} د.ع`;
}

/* ====================================================================
 * SHOP SEARCH — searches across local shops in the data store.
 * Used by /search when in "shops" tab. Pure UI helper — no backend yet.
 * ==================================================================== */

import type { Shop } from "@/lib/types";
import { getShopRatingValue, getShopReviewCount } from "@/lib/shopRanking";

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
  limit = 8,
): AutocompleteSuggestion[] {
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const terms = expandQuery(query);
  const out: AutocompleteSuggestion[] = [];
  const matches = (hay: string) => terms.some((t) => hay.includes(t));

  // Products from mock cache
  for (const p of ALL_PRODUCTS_CACHE) {
    if (out.length >= limit) break;
    const hay = [p.title, p.brand, p.category].filter(Boolean).join(" ").toLowerCase();
    if (matches(hay)) {
      out.push({
        type: "product",
        id: p.id,
        label: p.title,
        sublabel: `${p.brand ?? ""} • ${p.offerCount} عرض`,
        href: `/product/${p.id}`,
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

