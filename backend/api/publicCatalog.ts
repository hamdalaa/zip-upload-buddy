import fs from "node:fs/promises";
import path from "node:path";
import type { CatalogContext } from "../shared/bootstrap.js";
import { compactText, normalizeText, sha256Hex, slugify } from "../shared/catalog/normalization.js";
import type {
  CatalogProductDraft,
  SearchDocument,
  StoreRecord,
} from "../shared/catalog/types.js";
import { catalogConfig } from "../shared/config.js";

interface RawCityIndexEntry {
  slug: string;
  city: string;
  cityAr: string;
  count: number;
}

interface RawCityReviewSample {
  rating?: number | null;
  relativePublishTime?: string;
  publishTime?: string;
  text?: string;
  authorName?: string;
  authorPhotoUrl?: string;
  reviewGoogleMapsUrl?: string;
}

interface RawCityStore {
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
  reviewsSample?: RawCityReviewSample[];
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

interface RawCityFile {
  city: string;
  cityAr: string;
  slug: string;
  count: number;
  stores: RawCityStore[];
}

interface RawStoreLookupEntry {
  citySlug: string;
  cityAr: string;
  store: RawCityStore;
}

interface RawGoogleReviewStore {
  store_name: string;
  google_maps_url?: string;
  area?: string;
}

export interface PublicStore {
  id: string;
  slug: string;
  seedKey: string;
  name: string;
  city?: string;
  cityAr?: string;
  citySlug?: string;
  area: string;
  category: string;
  categories: string[];
  address?: string;
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
  website?: string;
  phone?: string;
  whatsapp?: string;
  discoverySource: string;
  verified: boolean;
  verificationStatus: "verified" | "pending" | "unverified";
  notes?: string;
  imageUrl?: string;
  gallery?: string[];
  rating?: number;
  reviewCount?: number;
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
  quickSignals?: RawCityStore["quickSignals"];
  openNow?: boolean | null;
  businessStatus?: string;
  workingHours?: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  duplicateOf?: string;
  featured?: boolean;
  productCount?: number;
  offerCount?: number;
  lastSyncAt?: string;
  lastProbeAt?: string;
  sourceStatus?: string;
}

export interface PublicProductIndex {
  id: string;
  canonicalProductId: string;
  shopId: string;
  shopName: string;
  city?: string;
  cityAr?: string;
  citySlug?: string;
  area: string;
  category: string;
  categoryPath: string[];
  name: string;
  slug: string;
  sku?: string;
  brand?: string;
  model?: string;
  priceValue?: number;
  priceText?: string;
  originalPriceValue?: number;
  productUrl?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  inStock?: boolean;
  stockState: CatalogProductDraft["availability"];
  currency: string;
  offerLabel?: string;
  crawledAt: string;
}

export interface PublicBrandSummary {
  slug: string;
  brandName: string;
  dealerName: string;
  contactPhones: string[];
  cities: string[];
  coverage: string;
  verificationStatus: "verified" | "pending" | "unverified";
  storeCount: number;
  productCount: number;
}

export interface PublicBootstrapPayload {
  summary: {
    totalStores: number;
    indexedStores: number;
    totalProducts: number;
    lastSyncAt?: string;
  };
  stores: PublicStore[];
  brands: PublicBrandSummary[];
  home: {
    deals: PublicProductIndex[];
    trending: PublicProductIndex[];
    latest: PublicProductIndex[];
  };
}

export interface PublicCatalogProductsPayload {
  total: number;
  limit: number;
  offset: number;
  items: PublicProductIndex[];
}

export interface PublicUnifiedOffer {
  id: string;
  productId: string;
  storeId: string;
  storeName: string;
  storeCity?: string;
  storeRating?: number;
  verified?: boolean;
  officialDealer?: boolean;
  price: number;
  originalPrice?: number;
  currency: "IQD" | "USD";
  stock: CatalogProductDraft["availability"];
  productUrl: string;
  lastSeenAt: string;
  freshnessLabel?: string;
}

export interface PublicUnifiedProduct {
  id: string;
  title: string;
  brand?: string;
  model?: string;
  category?: string;
  description?: string;
  images: string[];
  specs?: Record<string, string>;
  rating?: number;
  reviewCount?: number;
  lowestPrice?: number;
  highestPrice?: number;
  offerCount: number;
  inStockCount: number;
  bestOfferId?: string;
}

interface PublicUnifiedSearchResponse {
  query: string;
  totalProducts: number;
  totalOffers: number;
  storesCovered: number;
  storesScanned: number;
  durationMs: number;
  products: PublicUnifiedProduct[];
  facets: {
    brands: Array<{ key: string; label: string; count: number }>;
    categories: Array<{ key: string; label: string; count: number }>;
    stores: Array<{ key: string; label: string; count: number }>;
    cities: Array<{ key: string; label: string; count: number }>;
    priceRange: { min: number; max: number };
  };
}

const citiesDir = path.join(catalogConfig.repoRoot, "data", "cities");

let cityIndexCache: RawCityIndexEntry[] | null = null;
const cityFileCache = new Map<string, RawCityFile>();
let rawStoreLookupCache: Promise<Map<string, RawStoreLookupEntry>> | null = null;
let streetAreaLookupCache: Promise<{
  byCid: Map<string, string>;
  byName: Map<string, string>;
}> | null = null;

async function loadCityIndex(): Promise<RawCityIndexEntry[]> {
  if (cityIndexCache) return cityIndexCache;
  const raw = await fs.readFile(path.join(citiesDir, "index.json"), "utf8");
  cityIndexCache = JSON.parse(raw) as RawCityIndexEntry[];
  return cityIndexCache;
}

async function loadCityFile(slug: string): Promise<RawCityFile | null> {
  if (cityFileCache.has(slug)) return cityFileCache.get(slug)!;
  try {
    const raw = await fs.readFile(path.join(citiesDir, `${slug}.json`), "utf8");
    const parsed = JSON.parse(raw) as RawCityFile;
    cityFileCache.set(slug, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function loadRawStoreLookup(): Promise<Map<string, RawStoreLookupEntry>> {
  if (!rawStoreLookupCache) {
    rawStoreLookupCache = (async () => {
      const lookup = new Map<string, RawStoreLookupEntry>();
      const cityIndex = await loadCityIndex();
      for (const city of cityIndex) {
        const file = await loadCityFile(city.slug);
        if (!file) continue;
        for (const store of file.stores ?? []) {
          const entry: RawStoreLookupEntry = {
            citySlug: city.slug,
            cityAr: city.cityAr,
            store,
          };
          lookup.set(store.id, entry);
          if (store.place_id) lookup.set(store.place_id, entry);
        }
      }
      return lookup;
    })();
  }
  return rawStoreLookupCache;
}

function extractGoogleCid(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/[?&]cid=(\d+)/);
  return match?.[1];
}

async function loadStreetAreaLookup() {
  if (!streetAreaLookupCache) {
    streetAreaLookupCache = (async () => {
      const byCid = new Map<string, string>();
      const byName = new Map<string, string>();
      const candidatePaths = [
        path.join(catalogConfig.repoRoot, "src", "data", "all-google-reviews.json"),
        path.join(catalogConfig.repoRoot, "..", "src", "data", "all-google-reviews.json"),
      ];
      for (const filePath of candidatePaths) {
        try {
          const raw = await fs.readFile(filePath, "utf8");
          const parsed = JSON.parse(raw) as { stores?: RawGoogleReviewStore[] };
          for (const store of parsed.stores ?? []) {
            if (!store.area?.trim()) continue;
            const cid = extractGoogleCid(store.google_maps_url);
            if (cid) byCid.set(cid, store.area.trim());
            const normalizedName = compactText(store.store_name ?? "");
            if (normalizedName) byName.set(normalizedName, store.area.trim());
          }
          break;
        } catch {
          // Try the next candidate path.
        }
      }
      return { byCid, byName };
    })();
  }
  return streetAreaLookupCache;
}

export async function listPublicCities() {
  return loadCityIndex();
}

export async function getPublicCity(slug: string) {
  return loadCityFile(slug);
}

async function findRawStore(store: StoreRecord): Promise<RawStoreLookupEntry | undefined> {
  const lookup = await loadRawStoreLookup();
  const byPlaceId = store.placeId ? lookup.get(store.placeId) : undefined;
  if (byPlaceId) return byPlaceId;
  const byStoreId = lookup.get(store.id);
  if (byStoreId) return byStoreId;
  const sourceSlug = store.sourceFile?.replace(/\.json$/i, "");
  if (!sourceSlug) return undefined;
  const city = await loadCityFile(sourceSlug);
  if (!city) return undefined;
  const normalizedName = compactText(store.name);
  const matched = city.stores.find((entry) => compactText(entry.name) === normalizedName);
  return matched
    ? {
        citySlug: sourceSlug,
        cityAr: city.cityAr,
        store: matched,
      }
    : undefined;
}

async function inferStreetArea(store: StoreRecord, raw?: RawCityStore): Promise<string | undefined> {
  const lookup = await loadStreetAreaLookup();
  const cid = extractGoogleCid(raw?.googleMapsUrl ?? store.googleMapsUrl);
  if (cid && lookup.byCid.has(cid)) return lookup.byCid.get(cid);
  const normalizedName = compactText(raw?.name ?? store.name);
  if (lookup.byName.has(normalizedName)) return lookup.byName.get(normalizedName);
  return undefined;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function isRenderableProductImage(url?: string | null) {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("data:image/svg+xml")) return false;
  return true;
}

function sanitizeProductImage(url?: string | null) {
  return isRenderableProductImage(url) ? url!.trim() : undefined;
}

function mapVerification(store: StoreRecord, raw?: RawCityStore) {
  const verified = Boolean(
    (store.website && store.websiteType === "official") ||
      raw?.quickSignals?.has_website ||
      raw?.quickSignals?.has_google_maps,
  );
  return {
    verified,
    verificationStatus: verified ? "verified" : "unverified",
  } as const;
}

function buildProductId(storeId: string, sourceProductId: string) {
  return `${storeId}:${sourceProductId}`;
}

function buildCanonicalProductId(product: Pick<CatalogProductDraft, "normalizedTitle" | "title" | "brand" | "model">) {
  const fingerprint = [
    compactText(product.brand ?? ""),
    compactText(product.model ?? ""),
    compactText(product.normalizedTitle || product.title),
  ].join("|");
  return `unified_${sha256Hex(fingerprint).slice(0, 24)}`;
}

function buildProductFamilyKey(product: Pick<CatalogProductDraft, "title" | "brand" | "model">) {
  let value = normalizeText(product.model || product.title || "");
  const brand = normalizeText(product.brand ?? "");

  if (brand) {
    const escapedBrand = escapeRegExp(brand);
    value = value.replace(new RegExp(`\\b${escapedBrand}\\b`, "g"), " ");
  }

  value = value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\b\d+\s?(gb|tb)\b/g, " ")
    .replace(/\bram\b.*$/g, " ")
    .replace(/\bssd\b.*$/g, " ")
    .replace(/\bgps\b/g, " ")
    .replace(/\bcellular\b/g, " ")
    .replace(/\bwifi\b/g, " ")
    .replace(/\bwith\b.*$/g, " ")
    .replace(/\bمن\b/g, " ")
    .replace(/\bسعة\b/g, " ")
    .replace(/\bتخزين\b/g, " ")
    .replace(/\bcolor\b/g, " ")
    .replace(/\bblack|white|silver|gold|blue|pink|green|orange|purple|yellow|gray|grey\b/g, " ")
    .replace(/\bاسود|أبيض|ابيض|فضي|ذهبي|ازرق|أزرق|وردي|اخضر|أخضر|برتقالي|بنفسجي|اصفر|أصفر|رمادي\b/g, " ")
    .replace(/[–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return compactText(value);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function categoryList(store: StoreRecord, raw?: RawCityStore): string[] {
  const categories = uniqueStrings([
    store.primaryCategory,
    store.suggestedCategory,
    raw?.category,
    raw?.suggested_category,
  ]);
  return categories.length > 0 ? categories : ["Uncategorized"];
}

async function mapStoreRecordToPublicStore(
  store: StoreRecord,
  options?: {
    productCount?: number;
    offerCount?: number;
  },
): Promise<PublicStore> {
  const rawEntry = await findRawStore(store);
  const raw = rawEntry?.store;
  const categories = categoryList(store, raw);
  const verification = mapVerification(store, raw);
  const inferredArea = await inferStreetArea(store, raw);
  const area =
    raw?.area?.trim() ||
    store.area?.trim() ||
    inferredArea ||
    store.cityAr?.trim() ||
    store.city?.trim() ||
    "العراق";

  return {
    id: store.id,
    slug: store.slug,
    seedKey: store.placeId ?? store.id,
    name: store.name,
    city: raw?.city ?? store.city,
    cityAr: rawEntry?.cityAr ?? store.cityAr,
    citySlug: rawEntry?.citySlug ?? store.sourceFile?.replace(/\.json$/i, ""),
    area,
    category: categories[0] ?? "Uncategorized",
    categories,
    address: raw?.address ?? store.address,
    lat: raw?.lat ?? store.lat ?? undefined,
    lng: raw?.lng ?? store.lng ?? undefined,
    googleMapsUrl: raw?.googleMapsUrl ?? store.googleMapsUrl,
    website: raw?.website ?? store.website,
    phone: raw?.phone ?? store.phone,
    whatsapp: raw?.whatsapp ?? store.whatsapp,
    discoverySource: store.discoverySource,
    verified: verification.verified,
    verificationStatus: verification.verificationStatus,
    notes: store.blockedReason,
    imageUrl: raw?.imageUrl,
    gallery: raw?.gallery,
    rating: typeof raw?.rating === "number" ? raw.rating : undefined,
    reviewCount: raw?.reviewCount,
    editorialSummary: raw?.editorialSummary,
    reviewSummary: raw?.reviewSummary,
    reviewsSample: raw?.reviewsSample,
    quickSignals: raw?.quickSignals,
    openNow: raw?.openNow,
    businessStatus: raw?.businessStatus,
    workingHours: raw?.workingHours,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    featured: Boolean(store.highPriority),
    productCount: options?.productCount,
    offerCount: options?.offerCount,
    lastSyncAt: store.lastSyncAt,
    lastProbeAt: store.lastProbeAt,
    sourceStatus: store.status,
  };
}

async function getStoreCatalogCached(
  context: CatalogContext,
  storeId: string,
  cache: Map<string, Promise<Awaited<ReturnType<CatalogContext["repository"]["getStoreCatalog"]>>>>,
) {
  if (!cache.has(storeId)) {
    cache.set(storeId, context.repository.getStoreCatalog(storeId));
  }
  return cache.get(storeId)!;
}

async function mapCatalogProductToPublicProduct(
  context: CatalogContext,
  store: StoreRecord,
  product: CatalogProductDraft,
  storeCache: Map<string, PublicStore>,
): Promise<PublicProductIndex> {
  const publicStore = storeCache.get(store.id) ?? (await mapStoreRecordToPublicStore(store));
  storeCache.set(store.id, publicStore);

  return {
    id: buildProductId(store.id, product.sourceProductId),
    canonicalProductId: buildCanonicalProductId(product),
    shopId: store.id,
    shopName: store.name,
    city: publicStore.city,
    cityAr: publicStore.cityAr,
    citySlug: publicStore.citySlug,
    area: publicStore.area,
    category: product.categoryPath.at(-1) ?? publicStore.category,
    categoryPath: product.categoryPath,
    name: product.title,
    slug: slugify(product.title),
    sku: product.sku,
    brand: product.brand,
    model: product.model,
    priceValue: product.livePrice,
    priceText: product.livePrice != null ? `${product.livePrice.toLocaleString("en-US")} ${product.currency}` : undefined,
    originalPriceValue: product.originalPrice,
    productUrl: product.sourceUrl,
    imageUrl: sanitizeProductImage(product.imageUrl),
    rating: publicStore.rating,
    reviewCount: publicStore.reviewCount,
    inStock: product.availability === "in_stock",
    stockState: product.availability,
    currency: product.currency,
    offerLabel: product.offerLabel,
    crawledAt: product.lastSeenAt,
  };
}

async function mapSearchDocumentsToPublicProducts(
  context: CatalogContext,
  documents: SearchDocument[],
  storesById: Map<string, StoreRecord>,
) {
  const catalogCache = new Map<
    string,
    Promise<Awaited<ReturnType<CatalogContext["repository"]["getStoreCatalog"]>>>
  >();
  const storeCache = new Map<string, PublicStore>();
  const items: PublicProductIndex[] = [];

  for (const document of documents) {
    const separator = document.id.indexOf(":");
    if (separator === -1) continue;
    const storeId = document.id.slice(0, separator);
    const sourceProductId = document.id.slice(separator + 1);
    const store = storesById.get(storeId);
    if (!store) continue;
    const catalog = await getStoreCatalogCached(context, storeId, catalogCache);
    const product = catalog.products.find((entry) => entry.sourceProductId === sourceProductId);
    if (!product) continue;
    items.push(await mapCatalogProductToPublicProduct(context, store, product, storeCache));
  }

  return items;
}

function mapBrandSummaries(
  documents: SearchDocument[],
  publicStoresById: Map<string, PublicStore>,
): PublicBrandSummary[] {
  const grouped = new Map<
    string,
    {
      brandName: string;
      productCount: number;
      storeIds: Set<string>;
      cities: Set<string>;
      phones: Set<string>;
      verifiedCount: number;
      featuredStoreName?: string;
    }
  >();

  for (const document of documents) {
    const rawBrand = document.brand?.trim();
    if (!rawBrand) continue;
    const slug = slugify(rawBrand);
    const current =
      grouped.get(slug) ??
      {
        brandName: rawBrand,
        productCount: 0,
        storeIds: new Set<string>(),
        cities: new Set<string>(),
        phones: new Set<string>(),
        verifiedCount: 0,
        featuredStoreName: undefined,
      };

    current.productCount += 1;
    current.storeIds.add(document.storeId);
    const store = publicStoresById.get(document.storeId);
    if (store?.cityAr) current.cities.add(store.cityAr);
    if (store?.phone) current.phones.add(store.phone);
    if (store?.verified) current.verifiedCount += 1;
    if (!current.featuredStoreName && store?.name) current.featuredStoreName = store.name;
    grouped.set(slug, current);
  }

  return [...grouped.entries()]
    .map(([slug, value]) => {
      const storeCount = value.storeIds.size;
      return {
        slug,
        brandName: value.brandName,
        dealerName: value.featuredStoreName
          ? `أبرز ظهور: ${value.featuredStoreName}`
          : `متوفر لدى ${storeCount} محل`,
        contactPhones: [...value.phones].slice(0, 4),
        cities: [...value.cities].sort((a, b) => a.localeCompare(b, "ar")),
        coverage: `${value.productCount.toLocaleString("ar")} منتج عبر ${storeCount.toLocaleString("ar")} محل`,
        verificationStatus: value.verifiedCount > 0 ? "verified" : "pending",
        storeCount,
        productCount: value.productCount,
      } as PublicBrandSummary;
    })
    .sort((a, b) => b.productCount - a.productCount || b.storeCount - a.storeCount || a.brandName.localeCompare(b.brandName, "ar"));
}

function buildUnifiedOffer(publicProduct: PublicProductIndex, store: PublicStore): PublicUnifiedOffer | null {
  if (typeof publicProduct.priceValue !== "number") return null;
  return {
    id: publicProduct.id,
    productId: publicProduct.canonicalProductId,
    storeId: publicProduct.shopId,
    storeName: publicProduct.shopName,
    storeCity: store.cityAr ?? store.city ?? store.area,
    storeRating: store.rating,
    verified: store.verified,
    officialDealer: false,
    price: publicProduct.priceValue,
    originalPrice: publicProduct.originalPriceValue,
    currency: publicProduct.currency === "USD" ? "USD" : "IQD",
    stock: publicProduct.stockState,
    productUrl: publicProduct.productUrl ?? "#",
    lastSeenAt: publicProduct.crawledAt,
  };
}

function buildUnifiedProduct(group: PublicProductIndex[], offers: PublicUnifiedOffer[]): PublicUnifiedProduct {
  const first = group[0];
  if (!first) {
    return {
      id: `unified_${sha256Hex("empty").slice(0, 24)}`,
      title: "",
      images: [""],
      offerCount: 0,
      inStockCount: 0,
    };
  }
  const images = uniqueStrings(group.map((item) => sanitizeProductImage(item.imageUrl)));
  const prices = offers.map((offer) => offer.price).filter((value) => Number.isFinite(value));
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : undefined;
  const inStockCount = offers.filter((offer) => offer.stock === "in_stock").length;
  const bestOffer = [...offers]
    .filter((offer) => offer.stock === "in_stock")
    .sort((a, b) => a.price - b.price)[0];

  return {
    id: first.canonicalProductId,
    title: first.name,
    brand: first.brand,
    model: first.model,
    category: first.category,
    images: images.length > 0 ? images : [""],
    rating: first.rating,
    reviewCount: first.reviewCount,
    lowestPrice,
    highestPrice,
    offerCount: offers.length,
    inStockCount,
    bestOfferId: bestOffer?.id,
  };
}

async function collectCanonicalAndFamilyProducts(
  context: CatalogContext,
  canonicalId: string,
): Promise<{
  products: CatalogProductDraft[];
  storesById: Map<string, StoreRecord>;
}> {
  const stores = await context.repository.listStores();
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const catalogs = await Promise.all(
    stores.map(async (store) => ({
      store,
      catalog: await context.repository.getStoreCatalog(store.id),
    })),
  );

  const exactMatches = catalogs.flatMap(({ catalog }) =>
    catalog.products.filter((product) => buildCanonicalProductId(product) === canonicalId),
  );
  if (exactMatches.length === 0) {
    return { products: [], storesById };
  }

  const familyBrand = normalizeText(exactMatches[0]?.brand ?? "");
  const familyKey = buildProductFamilyKey(exactMatches[0]!);
  const familyMatches = catalogs.flatMap(({ catalog }) =>
    catalog.products.filter((product) => {
      if (buildCanonicalProductId(product) === canonicalId) return true;
      const sameBrand = normalizeText(product.brand ?? "") === familyBrand;
      const sameFamily = buildProductFamilyKey(product) === familyKey;
      return sameBrand && sameFamily;
    }),
  );

  const unique = new Map<string, CatalogProductDraft>();
  for (const product of familyMatches) {
    unique.set(`${product.storeId}:${product.sourceProductId}`, product);
  }

  return {
    products: [...unique.values()],
    storesById,
  };
}

function extractProductDescription(products: CatalogProductDraft[], offersCount?: number): string | undefined {
  const candidates = products
    .map((product) => {
      const htmlCandidate =
        typeof product.rawPayload?.body_html === "string"
          ? product.rawPayload.body_html
          : typeof product.rawPayload?.description === "string"
            ? product.rawPayload.description
            : undefined;
      if (!htmlCandidate) return undefined;
      const text = htmlCandidate
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<li>/gi, "• ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return text.length >= 40 ? text : undefined;
    })
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => b.length - a.length);

  if (candidates[0]) return candidates[0];

  const first = products[0];
  if (!first) return undefined;
  const parts = [
    first.brand ? `${first.brand}` : undefined,
    first.title,
    first.categoryPath.length > 0 ? `ضمن فئة ${first.categoryPath.at(-1)}` : undefined,
    typeof offersCount === "number" && offersCount > 0 ? `ومتوفر حالياً عبر ${offersCount} عرض في حاير.` : undefined,
  ].filter(Boolean);

  return parts.join(" ");
}

function extractProductSpecs(products: CatalogProductDraft[], offersCount?: number): Record<string, string> | undefined {
  const specs = new Map<string, string>();

  for (const product of products) {
    const raw = product.rawPayload ?? {};
    if (typeof raw.sku === "string" && !specs.has("SKU")) specs.set("SKU", raw.sku);
    if (typeof raw.product_type === "string" && !specs.has("Category")) specs.set("Category", raw.product_type);
    if (typeof raw.vendor === "string" && !specs.has("Brand")) specs.set("Brand", raw.vendor);

    const bodyHtml = typeof raw.body_html === "string" ? raw.body_html : undefined;
    if (!bodyHtml) continue;

    const pairs = [...bodyHtml.matchAll(/<strong>\s*([^<:]+)\s*:?\s*<\/strong>\s*([^<]+)/gi)];
    for (const [, keyRaw, valueRaw] of pairs) {
      const key = keyRaw?.replace(/\s+/g, " ").trim();
      const value = valueRaw?.replace(/\s+/g, " ").trim();
      if (!key || !value || specs.has(key)) continue;
      specs.set(key, value);
      if (specs.size >= 10) break;
    }
    if (specs.size >= 10) break;
  }

  const first = products[0];
  if (first) {
    if (!specs.has("Brand") && first.brand) specs.set("Brand", first.brand);
    if (!specs.has("Category") && first.categoryPath.at(-1)) specs.set("Category", first.categoryPath.at(-1)!);
    if (!specs.has("Availability")) specs.set("Availability", availabilityLabel(first.availability));
    if (typeof offersCount === "number" && offersCount > 0 && !specs.has("Offers")) specs.set("Offers", String(offersCount));
    if (typeof first.livePrice === "number" && !specs.has("Current Price")) specs.set("Current Price", `${first.livePrice.toLocaleString("en-US")} ${first.currency}`);
    if (typeof first.originalPrice === "number" && first.originalPrice > first.livePrice! && !specs.has("Original Price")) {
      specs.set("Original Price", `${first.originalPrice.toLocaleString("en-US")} ${first.currency}`);
    }
  }

  return specs.size > 0 ? Object.fromEntries(specs) : undefined;
}

function availabilityLabel(value: CatalogProductDraft["availability"]) {
  switch (value) {
    case "in_stock":
      return "In stock";
    case "out_of_stock":
      return "Out of stock";
    case "preorder":
      return "Preorder";
    default:
      return "Unknown";
  }
}

export async function buildPublicBootstrap(context: CatalogContext): Promise<PublicBootstrapPayload> {
  const stores = await context.repository.listStores();
  const publicStores = await Promise.all(
    stores.map(async (store) => {
      const size = await context.repository.getStoreSizeSummary(store.id);
      return mapStoreRecordToPublicStore(store, {
        productCount: size?.indexedProductCount,
        offerCount: size?.activeOfferCount,
      });
    }),
  );
  const publicStoresById = new Map(publicStores.map((store) => [store.id, store]));
  const searchDocuments = await context.repository.listSearchDocuments();
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const latestSorted = [...searchDocuments].sort((a, b) => new Date(b.freshnessAt).getTime() - new Date(a.freshnessAt).getTime());
  const dealsSorted = [...searchDocuments]
    .filter((document) => typeof document.livePrice === "number" && typeof document.originalPrice === "number" && document.originalPrice > document.livePrice)
    .sort((a, b) => {
      const aSavings = ((a.originalPrice ?? 0) - (a.livePrice ?? 0)) / (a.originalPrice ?? 1);
      const bSavings = ((b.originalPrice ?? 0) - (b.livePrice ?? 0)) / (b.originalPrice ?? 1);
      return bSavings - aSavings;
    });
  const trendingSorted = [...searchDocuments].sort((a, b) => {
    const aScore = Number(a.onSale) * 3 + Number(a.availability === "in_stock") * 2 + (a.livePrice ? 1 : 0);
    const bScore = Number(b.onSale) * 3 + Number(b.availability === "in_stock") * 2 + (b.livePrice ? 1 : 0);
    return bScore - aScore || new Date(b.freshnessAt).getTime() - new Date(a.freshnessAt).getTime();
  });

  const deals = await mapSearchDocumentsToPublicProducts(context, dealsSorted.slice(0, 12), storesById);
  const trending = await mapSearchDocumentsToPublicProducts(context, trendingSorted.slice(0, 12), storesById);
  const latest = await mapSearchDocumentsToPublicProducts(context, latestSorted.slice(0, 12), storesById);
  const brands = mapBrandSummaries(searchDocuments, publicStoresById);

  return {
    summary: {
      totalStores: publicStores.length,
      indexedStores: new Set(searchDocuments.map((document) => document.storeId)).size,
      totalProducts: searchDocuments.length,
      lastSyncAt: stores
        .map((store) => store.lastSyncAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0],
    },
    stores: publicStores,
    brands,
    home: {
      deals,
      trending,
      latest,
    },
  };
}

export async function buildPublicCatalogProducts(
  context: CatalogContext,
  options?: { limit?: number; offset?: number },
): Promise<PublicCatalogProductsPayload> {
  const stores = await context.repository.listStores();
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const searchDocuments = await context.repository.listSearchDocuments();
  const latestSorted = [...searchDocuments].sort((a, b) => new Date(b.freshnessAt).getTime() - new Date(a.freshnessAt).getTime());
  const limit = Math.max(1, Math.min(options?.limit ?? 2000, 10000));
  const offset = Math.max(0, options?.offset ?? 0);
  const items = await mapSearchDocumentsToPublicProducts(
    context,
    latestSorted.slice(offset, offset + limit),
    storesById,
  );

  return {
    total: searchDocuments.length,
    limit,
    offset,
    items,
  };
}

export async function buildPublicStoreDetail(context: CatalogContext, storeId: string) {
  const store = await context.repository.getStoreById(storeId);
  if (!store) return null;
  const size = await context.repository.getStoreSizeSummary(storeId);
  const connectorProfile = await context.repository.getConnectorProfile(storeId);
  const catalog = await context.repository.getStoreCatalog(storeId);
  const publicStore = await mapStoreRecordToPublicStore(store, {
    productCount: size?.indexedProductCount ?? catalog.products.length,
    offerCount: size?.activeOfferCount ?? catalog.offers.length,
  });
  const storeCache = new Map<string, PublicStore>([[store.id, publicStore]]);
  const products = await Promise.all(
    catalog.products.map((product) => mapCatalogProductToPublicProduct(context, store, product, storeCache)),
  );

  const sources = [
    publicStore.website
      ? {
          id: `src:${store.id}:website`,
          shopId: store.id,
          sourceType: "website" as const,
          sourceUrl: publicStore.website,
          status:
            store.status === "indexed"
              ? "ok"
              : store.status === "failed" || store.status === "blocked"
                ? "failed"
                : "pending",
          lastCrawledAt: store.lastSyncAt ?? store.lastProbeAt,
          pagesVisited: size?.estimatedCatalogSize ?? products.length,
        }
      : null,
    publicStore.googleMapsUrl
      ? {
          id: `src:${store.id}:maps`,
          shopId: store.id,
          sourceType: "google_maps" as const,
          sourceUrl: publicStore.googleMapsUrl,
          status: "ok" as const,
          lastCrawledAt: publicStore.updatedAt,
          pagesVisited: 1,
        }
      : null,
  ].filter(Boolean);

  return {
    store: publicStore,
    products,
    sources,
    size,
    connectorProfile,
  };
}

export async function buildPublicProductsByIds(context: CatalogContext, ids: string[]) {
  const grouped = new Map<string, string[]>();
  for (const id of ids) {
    const separator = id.indexOf(":");
    if (separator === -1) continue;
    const storeId = id.slice(0, separator);
    const sourceProductId = id.slice(separator + 1);
    const current = grouped.get(storeId) ?? [];
    current.push(sourceProductId);
    grouped.set(storeId, current);
  }

  const storeCache = new Map<string, PublicStore>();
  const items: PublicProductIndex[] = [];

  for (const [storeId, sourceProductIds] of grouped.entries()) {
    const store = await context.repository.getStoreById(storeId);
    if (!store) continue;
    const catalog = await context.repository.getStoreCatalog(storeId);
    for (const sourceProductId of sourceProductIds) {
      const product = catalog.products.find((entry) => entry.sourceProductId === sourceProductId);
      if (!product) continue;
      items.push(await mapCatalogProductToPublicProduct(context, store, product, storeCache));
    }
  }

  return items;
}

export async function buildPublicBrandDetail(context: CatalogContext, slug: string) {
  const stores = await context.repository.listStores();
  const publicStores = await Promise.all(stores.map((store) => mapStoreRecordToPublicStore(store)));
  const publicStoresById = new Map(publicStores.map((store) => [store.id, store]));
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const searchDocuments = await context.repository.listSearchDocuments();
  const brandDocuments = searchDocuments.filter((document) => document.brand && slugify(document.brand) === slug);
  if (brandDocuments.length === 0) return null;

  const brand = mapBrandSummaries(brandDocuments, publicStoresById)[0];
  const storesForBrand = [...new Set(brandDocuments.map((document) => document.storeId))]
    .map((storeId) => publicStoresById.get(storeId))
    .filter(Boolean) as PublicStore[];
  const products = await mapSearchDocumentsToPublicProducts(context, brandDocuments, storesById);

  return {
    brand,
    stores: storesForBrand,
    products,
  };
}

export async function buildPublicUnifiedSearch(
  context: CatalogContext,
  query: {
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
    sort?: "relevance" | "price_asc" | "price_desc" | "rating_desc" | "freshness_desc" | "offers_desc";
  },
): Promise<PublicUnifiedSearchResponse> {
  const startedAt = Date.now();
  const stores = await context.repository.listStores();
  const publicStores = await Promise.all(stores.map((store) => mapStoreRecordToPublicStore(store)));
  const publicStoresById = new Map(publicStores.map((store) => [store.id, store]));
  const storesById = new Map(stores.map((store) => [store.id, store]));

  const rawSearch = await context.searchEngine.search({
    q: query.q ?? "",
    ...(typeof query.priceMin === "number" ? { minPrice: query.priceMin } : {}),
    ...(typeof query.priceMax === "number" ? { maxPrice: query.priceMax } : {}),
    ...(query.onSaleOnly ? { onSale: true } : {}),
    ...(query.inStockOnly ? { availability: "in_stock" } : {}),
    limit: 200,
  });

  let offerProducts = await mapSearchDocumentsToPublicProducts(context, rawSearch.hits, storesById);
  let offers = offerProducts
    .map((product) => {
      const store = publicStoresById.get(product.shopId);
      return store ? buildUnifiedOffer(product, store) : null;
    })
    .filter(Boolean) as PublicUnifiedOffer[];

  if (query.brands?.length) {
    offers = offers.filter((offer) => {
      const product = offerProducts.find((entry) => entry.id === offer.id);
      return product?.brand ? query.brands!.includes(product.brand) : false;
    });
  }

  if (query.categories?.length) {
    offers = offers.filter((offer) => {
      const product = offerProducts.find((entry) => entry.id === offer.id);
      return query.categories!.includes(product?.category ?? "");
    });
  }

  if (query.stores?.length) {
    offers = offers.filter((offer) => query.stores!.includes(offer.storeId));
  }

  if (query.cities?.length) {
    offers = offers.filter((offer) => offer.storeCity && query.cities!.includes(offer.storeCity));
  }

  if (query.verifiedOnly) {
    offers = offers.filter((offer) => offer.verified);
  }

  if (query.officialDealerOnly) {
    offers = offers.filter((offer) => offer.officialDealer);
  }

  offerProducts = offerProducts.filter((product) => offers.some((offer) => offer.id === product.id));

  const productGroups = new Map<string, PublicProductIndex[]>();
  for (const product of offerProducts) {
    const current = productGroups.get(product.canonicalProductId) ?? [];
    current.push(product);
    productGroups.set(product.canonicalProductId, current);
  }

  const products = [...productGroups.entries()].map(([canonicalId, group]) => {
    const groupOffers = offers.filter((offer) => offer.productId === canonicalId);
    return buildUnifiedProduct(group, groupOffers);
  });

  switch (query.sort) {
    case "price_asc":
      products.sort((a, b) => (a.lowestPrice ?? Number.MAX_SAFE_INTEGER) - (b.lowestPrice ?? Number.MAX_SAFE_INTEGER));
      break;
    case "price_desc":
      products.sort((a, b) => (b.lowestPrice ?? 0) - (a.lowestPrice ?? 0));
      break;
    case "rating_desc":
      products.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      break;
    case "offers_desc":
      products.sort((a, b) => b.offerCount - a.offerCount);
      break;
    case "freshness_desc":
      products.sort((a, b) => {
        const aFreshness = Math.max(...offers.filter((offer) => offer.productId === a.id).map((offer) => new Date(offer.lastSeenAt).getTime()));
        const bFreshness = Math.max(...offers.filter((offer) => offer.productId === b.id).map((offer) => new Date(offer.lastSeenAt).getTime()));
        return bFreshness - aFreshness;
      });
      break;
    case "relevance":
    default:
      products.sort((a, b) => b.offerCount - a.offerCount || (b.inStockCount - a.inStockCount));
      break;
  }

  const brandMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const storeMap = new Map<string, { label: string; count: number }>();
  const cityMap = new Map<string, number>();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;

  for (const product of products) {
    if (product.brand) brandMap.set(product.brand, (brandMap.get(product.brand) ?? 0) + 1);
    if (product.category) categoryMap.set(product.category, (categoryMap.get(product.category) ?? 0) + 1);
    if (typeof product.lowestPrice === "number") minPrice = Math.min(minPrice, product.lowestPrice);
    if (typeof product.highestPrice === "number") maxPrice = Math.max(maxPrice, product.highestPrice);

    for (const offer of offers.filter((entry) => entry.productId === product.id)) {
      const current = storeMap.get(offer.storeId) ?? { label: offer.storeName, count: 0 };
      current.count += 1;
      storeMap.set(offer.storeId, current);
      if (offer.storeCity) cityMap.set(offer.storeCity, (cityMap.get(offer.storeCity) ?? 0) + 1);
    }
  }

  return {
    query: query.q ?? "",
    totalProducts: products.length,
    totalOffers: offers.length,
    storesCovered: storeMap.size,
    storesScanned: rawSearch.total,
    durationMs: Date.now() - startedAt,
    products,
    facets: {
      brands: [...brandMap.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
      categories: [...categoryMap.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
      stores: [...storeMap.entries()].map(([key, value]) => ({ key, label: value.label, count: value.count })).sort((a, b) => b.count - a.count),
      cities: [...cityMap.entries()].map(([key, count]) => ({ key, label: key, count })).sort((a, b) => b.count - a.count),
      priceRange: {
        min: Number.isFinite(minPrice) ? minPrice : 0,
        max: maxPrice,
      },
    },
  };
}

export async function buildPublicProductDetail(context: CatalogContext, canonicalId: string) {
  const collected = await collectCanonicalAndFamilyProducts(context, canonicalId);
  if (collected.products.length === 0) return null;

  const offerProducts = await Promise.all(
    collected.products.map(async (product) => {
      const store = collected.storesById.get(product.storeId);
      if (!store) return null;
      return mapCatalogProductToPublicProduct(context, store, product, new Map());
    }),
  );
  const normalizedProducts = offerProducts.filter((product): product is PublicProductIndex => Boolean(product));
  const storesPublic = await Promise.all([...collected.storesById.values()].map((store) => mapStoreRecordToPublicStore(store)));
  const publicStoresById = new Map(storesPublic.map((store) => [store.id, store]));
  const offers = normalizedProducts
    .map((product) => {
      const store = publicStoresById.get(product.shopId);
      return store ? buildUnifiedOffer(product, store) : null;
    })
    .filter(Boolean) as PublicUnifiedOffer[];
  const product = buildUnifiedProduct(normalizedProducts, offers);
  return {
    ...product,
    description: extractProductDescription(collected.products, offers.length),
    specs: extractProductSpecs(collected.products, offers.length),
  };
}

export async function buildPublicProductOffers(context: CatalogContext, canonicalId: string) {
  const collected = await collectCanonicalAndFamilyProducts(context, canonicalId);
  const offerProducts = await Promise.all(
    collected.products.map(async (product) => {
      const store = collected.storesById.get(product.storeId);
      if (!store) return null;
      return mapCatalogProductToPublicProduct(context, store, product, new Map());
    }),
  );
  const normalizedProducts = offerProducts.filter((product): product is PublicProductIndex => Boolean(product));
  const publicStores = await Promise.all([...collected.storesById.values()].map((store) => mapStoreRecordToPublicStore(store)));
  const publicStoresById = new Map(publicStores.map((store) => [store.id, store]));

  return normalizedProducts
    .map((product) => {
      const store = publicStoresById.get(product.shopId);
      return store ? buildUnifiedOffer(product, store) : null;
    })
    .filter((offer): offer is PublicUnifiedOffer => Boolean(offer))
    .sort((a, b) => {
      if (a.stock === "in_stock" && b.stock !== "in_stock") return -1;
      if (b.stock === "in_stock" && a.stock !== "in_stock") return 1;
      return a.price - b.price;
    });
}
