import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { CatalogContext } from "../shared/bootstrap.js";
import { compactText, extractDomain, extractRootDomain, normalizeText, sha256Hex, slugify } from "../shared/catalog/normalization.js";
import { buildCanonicalProductId, buildLegacyCanonicalProductId } from "../shared/catalog/searchDocuments.js";
import { buildProductIdentity, sameProductIdentity } from "../shared/catalog/productIdentity.js";
import type {
  CatalogProductDraft,
  SearchDocument,
  StoreRecord,
} from "../shared/catalog/types.js";
import { catalogConfig } from "../shared/config.js";
import { getSqlitePublicCatalogDataStore } from "../shared/db/sqlitePublicCatalogData.js";
import { openCatalogSqlite } from "../shared/db/sqliteSupport.js";
import { scoreProductIntentMatch, scoreSearchTextMatch } from "../shared/search/relevance.js";

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
  images?: string[];
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

export interface PublicBootstrapLitePayload {
  summary: PublicBootstrapPayload["summary"];
  featuredShops: PublicStore[];
  topRatedShops: PublicStore[];
  brands: PublicBrandSummary[];
  home: PublicBootstrapPayload["home"];
}

export interface PublicStoreSummaryPayload {
  store: PublicStore;
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

export interface PublicBrandSummaryPayload {
  brand: PublicBrandSummary;
  topStores: PublicStore[];
  totalStores: number;
  totalProducts: number;
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
  priceCurrency?: "IQD" | "USD";
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
let catalogSqliteDb: DatabaseSync | null = null;
let catalogSqliteReadIndexesReady = false;

const DEFAULT_BRAND_DETAIL_PRODUCT_LIMIT = 200;
const MAX_PRODUCT_DETAIL_OFFERS = 500;
const MAX_SEARCH_FAMILY_EXPANSIONS = 16;

function getUnifiedPublicDataStore() {
  if (catalogConfig.database.driver !== "sqlite") return null;
  return getSqlitePublicCatalogDataStore(catalogConfig.database.sqlitePath);
}

function getCatalogSqliteDb() {
  if (catalogConfig.database.driver !== "sqlite") return null;
  if (!catalogSqliteDb) {
    catalogSqliteDb = openCatalogSqlite(catalogConfig.database.sqlitePath);
  }
  if (!catalogSqliteReadIndexesReady) {
    catalogSqliteDb.exec(`
      CREATE INDEX IF NOT EXISTS search_documents_brand_freshness_idx
        ON search_documents(brand, freshness_at DESC);
    `);
    catalogSqliteReadIndexesReady = true;
  }
  return catalogSqliteDb;
}

function shouldUseSqliteCatalogReads(context: CatalogContext): boolean {
  const repositoryName = context.repository?.constructor?.name ?? "";
  return catalogConfig.database.driver === "sqlite" && !/memory/i.test(repositoryName);
}

type SqliteRow = Record<string, unknown>;

function asOptionalString(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function isPublicPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

const SUPPORTED_PUBLIC_CURRENCIES = new Set(["IQD", "USD"]);
const BLOCKED_PUBLIC_OFFER_ROOT_DOMAINS = new Set([
  // UAE storefront that was incorrectly attached to an Iraqi Google place.
  "almatajiralthalath.com",
  // Manufacturer/spec pages are not merchant offers and should not enter price comparison.
  "apple.com",
  "samsung.com",
  "lg.com",
  "hikvision.com",
  "siemens.com",
  "bmw-iraq.com",
]);
const PUBLIC_USD_TO_IQD_RATE = 1515.68;
const USD_PRICED_AS_IQD_ROOT_DOMAINS = new Set([
  "elryan.com",
  "3d-iraq.com",
  "denkae.com",
  "khanstore-iq.com",
  "techgigz.com",
]);

interface PublicPriceContext {
  storeId?: string;
  sourceConnector?: string;
  sourceUrl?: string;
}

function normalizePublicCurrency(currency?: string): "IQD" | "USD" | undefined {
  const normalized = (currency || "IQD").trim().toUpperCase();
  return SUPPORTED_PUBLIC_CURRENCIES.has(normalized) ? normalized as "IQD" | "USD" : undefined;
}

function normalizePublicOutputCurrency(currency?: string): "IQD" | undefined {
  return normalizePublicCurrency(currency) ? "IQD" : undefined;
}

function asPublicPrice(value: unknown): number | undefined {
  const parsed = asNumber(value);
  return isPublicPrice(parsed) ? parsed : undefined;
}

function normalizePublicPriceForCurrency(
  value: unknown,
  currency?: string,
  context?: PublicPriceContext,
): number | undefined {
  const publicCurrency = normalizePublicCurrency(currency);
  if (!publicCurrency) return undefined;
  const parsed = asPublicPrice(value);
  if (!parsed) return undefined;
  if (publicCurrency === "USD") {
    return Math.round(parsed * PUBLIC_USD_TO_IQD_RATE);
  }
  if (publicCurrency === "IQD" && !Number.isInteger(parsed)) {
    if (parsed >= 10_000) return Math.round(parsed);
    const scaled = Math.round(parsed * getIqdDecimalScale(parsed, context));
    return scaled >= 1000 ? scaled : undefined;
  }
  if (publicCurrency === "IQD" && Number.isInteger(parsed) && parsed < 1000) {
    if (shouldTreatIqdValueAsUsd(parsed, context)) {
      return Math.round(parsed * PUBLIC_USD_TO_IQD_RATE);
    }
    return undefined;
  }
  if (publicCurrency === "IQD" && Number.isInteger(parsed) && parsed < 10_000 && shouldTreatIqdValueAsUsd(parsed, context)) {
    return Math.round(parsed * PUBLIC_USD_TO_IQD_RATE);
  }
  return parsed;
}

function getIqdDecimalScale(value: number, context?: PublicPriceContext): number {
  if (shouldTreatIqdValueAsUsd(value, context)) return PUBLIC_USD_TO_IQD_RATE;
  return 1000;
}

function shouldTreatIqdValueAsUsd(value: number, context?: PublicPriceContext): boolean {
  if (value >= 10_000) return false;
  const rootDomain = getPriceContextRootDomain(context);
  return Boolean(rootDomain && USD_PRICED_AS_IQD_ROOT_DOMAINS.has(rootDomain));
}

function getPriceContextRootDomain(context?: PublicPriceContext): string | undefined {
  if (!context) return undefined;
  const sourceUrl = context.sourceUrl;
  if (!sourceUrl) return undefined;
  const domain = extractDomain(sourceUrl);
  return domain ? extractRootDomain(domain) : undefined;
}

function isElRyanPriceContext(context?: PublicPriceContext): boolean {
  if (!context) return false;
  const connector = compactText(context.sourceConnector ?? "");
  if (connector.includes("elryan")) return true;
  const storeId = compactText(context.storeId ?? "");
  if (storeId.includes("elryan")) return true;
  return getPriceContextRootDomain(context) === "elryan.com";
}

function asPublicOriginalPrice(
  originalPrice: unknown,
  livePrice?: number,
  currency?: string,
  context?: PublicPriceContext,
): number | undefined {
  const parsed = normalizePublicPriceForCurrency(originalPrice, currency, context);
  return parsed && livePrice && parsed > livePrice ? parsed : undefined;
}

function formatPublicPrice(value: number | undefined, currency?: string): string | undefined {
  const publicCurrency = normalizePublicCurrency(currency);
  return isPublicPrice(value) && publicCurrency ? `${value.toLocaleString("en-US")} ${publicCurrency}` : undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function mapSqliteSearchRow(row: SqliteRow): SearchDocument {
  const currency = asOptionalString(row.currency);
  const priceContext = {
    storeId: String(row.store_id),
    sourceUrl: asOptionalString(row.source_url),
  };
  const livePrice = normalizePublicPriceForCurrency(row.live_price, currency, priceContext);
  const originalPrice = asPublicOriginalPrice(row.original_price, livePrice, currency, priceContext);
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    storeName: String(row.store_name),
    normalizedTitle: String(row.normalized_title),
    title: String(row.title),
    brand: asOptionalString(row.brand),
    model: asOptionalString(row.model),
    sku: asOptionalString(row.sku),
    livePrice,
    originalPrice,
    onSale: Boolean(asBoolean(row.on_sale) && livePrice && originalPrice),
    availability: String(row.availability) as SearchDocument["availability"],
    freshnessAt: String(row.freshness_at),
    sourceUrl: String(row.source_url),
    categoryPath: String(row.category_path),
    imageUrl: asOptionalString(row.image_url),
    currency: normalizePublicOutputCurrency(currency),
    offerLabel: asOptionalString(row.offer_label),
    sellerName: asOptionalString(row.seller_name),
  };
}

function parseJsonArray(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown[];
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function parseStringArray(value: unknown): string[] {
  return parseJsonArray(value);
}

function parseRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? { ...(parsed as Record<string, unknown>) }
      : {};
  } catch {
    return {};
  }
}

function loadBootstrapSearchSlicesFromSqlite() {
  const db = getCatalogSqliteDb();
  if (!db) return null;

  const latestRows = db.prepare(`
    SELECT *
    FROM search_documents
    ORDER BY freshness_at DESC
    LIMIT 12
  `).all() as SqliteRow[];

  const dealsRows = db.prepare(`
    SELECT *
    FROM search_documents
    WHERE live_price IS NOT NULL
      AND live_price > 0
      AND original_price IS NOT NULL
      AND original_price > 0
      AND original_price > live_price
    ORDER BY ((original_price - live_price) / original_price) DESC, freshness_at DESC
    LIMIT 12
  `).all() as SqliteRow[];

  const trendingRows = db.prepare(`
    SELECT *
    FROM search_documents
    ORDER BY
      on_sale DESC,
      CASE WHEN availability = 'in_stock' THEN 1 ELSE 0 END DESC,
      CASE WHEN live_price IS NOT NULL AND live_price > 0 THEN 1 ELSE 0 END DESC,
      freshness_at DESC
    LIMIT 12
  `).all() as SqliteRow[];

  const brandRows = db.prepare(`
    SELECT
      brand,
      COUNT(*) AS product_count,
      COUNT(DISTINCT store_id) AS store_count,
      MIN(store_id) AS sample_store_id
    FROM search_documents
    WHERE brand IS NOT NULL AND brand != ''
    GROUP BY brand
    ORDER BY product_count DESC, store_count DESC, brand ASC
  `).all() as SqliteRow[];

  return {
    latest: latestRows.map(mapSqliteSearchRow),
    deals: dealsRows.map(mapSqliteSearchRow),
    trending: trendingRows.map(mapSqliteSearchRow),
    brandRows,
  };
}

function loadCatalogProductsPageFromSqlite(limit: number, offset: number) {
  const db = getCatalogSqliteDb();
  if (!db) return null;

  const totalRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM search_documents
  `).get() as SqliteRow | undefined;

  const rows = db.prepare(`
    SELECT *
    FROM search_documents
    ORDER BY freshness_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset) as SqliteRow[];

  return {
    total: asNumber(totalRow?.count) ?? 0,
    items: rows.map(mapSqliteSearchRow),
  };
}

function mapBrandSummariesFromSqliteRows(
  rows: SqliteRow[],
  publicStoresById: Map<string, PublicStore>,
): PublicBrandSummary[] {
  return rows.map((row) => {
    const brandName = String(row.brand);
    const slug = slugify(brandName);
    const productCount = Number(row.product_count ?? 0);
    const storeCount = Number(row.store_count ?? 0);
    const sampleStore = publicStoresById.get(String(row.sample_store_id ?? ""));
    return {
      slug,
      brandName,
      dealerName: sampleStore?.name ? `أبرز ظهور: ${sampleStore.name}` : `متوفر لدى ${storeCount.toLocaleString("ar")} محل`,
      contactPhones: sampleStore?.phone ? [sampleStore.phone] : [],
      cities: sampleStore?.cityAr ? [sampleStore.cityAr] : sampleStore?.city ? [sampleStore.city] : [],
      coverage: `${productCount.toLocaleString("ar")} منتج عبر ${storeCount.toLocaleString("ar")} محل`,
      verificationStatus: sampleStore?.verified ? "verified" : "pending",
      storeCount,
      productCount,
    } satisfies PublicBrandSummary;
  });
}

interface SqliteBrandRows {
  brands: string[];
  summaryRows: SqliteRow[];
  storeIds: string[];
  totalProducts: number;
  totalStores: number;
  documents: SearchDocument[];
}

function buildBrandSummaryFromSqliteRows(
  sqliteBrand: SqliteBrandRows,
  publicStoresById: Map<string, PublicStore>,
): PublicBrandSummary | undefined {
  const summary = mapBrandSummariesFromSqliteRows(sqliteBrand.summaryRows, publicStoresById)[0];
  if (!summary) return undefined;

  return {
    ...summary,
    storeCount: sqliteBrand.totalStores,
    productCount: sqliteBrand.totalProducts,
    coverage: `${sqliteBrand.totalProducts.toLocaleString("ar")} منتج عبر ${sqliteBrand.totalStores.toLocaleString("ar")} محل`,
  };
}

function loadBrandRowsFromSqlite(
  slug: string,
  options?: {
    includeDocuments?: boolean;
    limit?: number;
    offset?: number;
  },
): SqliteBrandRows | null {
  const db = getCatalogSqliteDb();
  if (!db) return null;

  const brands = db.prepare(`
    SELECT DISTINCT brand
    FROM search_documents
    WHERE brand IS NOT NULL AND brand != ''
  `).all() as SqliteRow[];
  const matchedBrands = brands
    .map((row) => String(row.brand))
    .filter((brand) => slugify(brand) === slug);
  if (matchedBrands.length === 0) return null;

  const placeholders = matchedBrands.map(() => "?").join(", ");
  const summaryRows = db.prepare(`
    SELECT
      brand,
      COUNT(*) AS product_count,
      COUNT(DISTINCT store_id) AS store_count,
      MIN(store_id) AS sample_store_id
    FROM search_documents
    WHERE brand IN (${placeholders})
    GROUP BY brand
    ORDER BY product_count DESC, store_count DESC, brand ASC
  `).all(...matchedBrands) as SqliteRow[];

  const storeRows = db.prepare(`
    SELECT
      store_id,
      COUNT(*) AS product_count,
      MAX(freshness_at) AS latest_freshness_at
    FROM search_documents
    WHERE brand IN (${placeholders})
    GROUP BY store_id
    ORDER BY product_count DESC, latest_freshness_at DESC
  `).all(...matchedBrands) as SqliteRow[];

  const limit = Math.max(1, Math.min(options?.limit ?? DEFAULT_BRAND_DETAIL_PRODUCT_LIMIT, 500));
  const offset = Math.max(0, options?.offset ?? 0);
  const docs = options?.includeDocuments === false
    ? []
    : db.prepare(`
        SELECT *
        FROM search_documents
        WHERE brand IN (${placeholders})
        ORDER BY freshness_at DESC
        LIMIT ? OFFSET ?
      `).all(...matchedBrands, limit, offset) as SqliteRow[];

  return {
    brands: matchedBrands,
    summaryRows,
    storeIds: storeRows.map((row) => String(row.store_id)),
    totalProducts: summaryRows.reduce((sum, row) => sum + (asNumber(row.product_count) ?? 0), 0),
    totalStores: storeRows.length,
    documents: docs.map(mapSqliteSearchRow),
  };
}

async function loadCityIndex(): Promise<RawCityIndexEntry[]> {
  if (cityIndexCache) return cityIndexCache;
  const sqliteStore = getUnifiedPublicDataStore();
  if (sqliteStore) {
    cityIndexCache = sqliteStore.listCityIndex();
    return cityIndexCache;
  }
  const raw = await fs.readFile(path.join(citiesDir, "index.json"), "utf8");
  cityIndexCache = JSON.parse(raw) as RawCityIndexEntry[];
  return cityIndexCache;
}

async function loadCityFile(slug: string): Promise<RawCityFile | null> {
  if (cityFileCache.has(slug)) return cityFileCache.get(slug)!;
  const sqliteStore = getUnifiedPublicDataStore();
  if (sqliteStore) {
    const city = sqliteStore.getCityFile(slug);
    if (city) cityFileCache.set(slug, city);
    return city;
  }
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
  const sqliteStore = getUnifiedPublicDataStore();
  if (sqliteStore) {
    const byPlaceId = store.placeId ? sqliteStore.findRawStoreByLookupKey(store.placeId) : undefined;
    if (byPlaceId) return byPlaceId;
    const byStoreId = sqliteStore.findRawStoreByLookupKey(store.id);
    if (byStoreId) return byStoreId;
    const sourceSlug = sanitizePublicCitySlug(store.sourceFile);
    if (!sourceSlug) return undefined;
    const bySlugAndName = sqliteStore.findRawStoreByCitySlugAndName(sourceSlug, compactText(store.name));
    if (bySlugAndName) return bySlugAndName;
    return undefined;
  }

  const lookup = await loadRawStoreLookup();
  const byPlaceId = store.placeId ? lookup.get(store.placeId) : undefined;
  if (byPlaceId) return byPlaceId;
  const byStoreId = lookup.get(store.id);
  if (byStoreId) return byStoreId;
  const sourceSlug = sanitizePublicCitySlug(store.sourceFile);
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
  const sqliteStore = getUnifiedPublicDataStore();
  if (sqliteStore) {
    const cid = extractGoogleCid(raw?.googleMapsUrl ?? store.googleMapsUrl);
    if (cid) {
      const byCid = sqliteStore.findStreetAreaByCid(cid);
      if (byCid) return byCid;
    }
    const normalizedName = compactText(raw?.name ?? store.name);
    const byName = sqliteStore.findStreetAreaByName(normalizedName);
    if (byName) return byName;
    return undefined;
  }

  const lookup = await loadStreetAreaLookup();
  const cid = extractGoogleCid(raw?.googleMapsUrl ?? store.googleMapsUrl);
  if (cid && lookup.byCid.has(cid)) return lookup.byCid.get(cid);
  const normalizedName = compactText(raw?.name ?? store.name);
  if (lookup.byName.has(normalizedName)) return lookup.byName.get(normalizedName);
  return undefined;
}

const KNOWN_PUBLIC_STREET_AREAS = [
  {
    label: "شارع الصناعة",
    aliases: ["شارع الصناعة", "شارع الصناعه", "الصناعة", "الصناعه", "sinaa", "sina'a", "industry street"],
  },
  {
    label: "شارع الربيعي",
    aliases: ["شارع الربيعي", "الربيعي", "rubaie", "rubai", "al rubaie", "al-rubaie"],
  },
];

function inferKnownStreetAreaFromText(...values: Array<string | undefined | null>): string | undefined {
  const compact = compactText(values.filter(Boolean).join(" "));
  if (!compact) return undefined;

  for (const area of KNOWN_PUBLIC_STREET_AREAS) {
    if (area.aliases.some((alias) => compact.includes(compactText(alias)))) {
      return area.label;
    }
  }

  return undefined;
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function sanitizePublicCitySlug(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().replace(/\.json$/i, "");
  if (!normalized) return undefined;
  if (normalized.startsWith(".") || normalized.includes("/")) return undefined;
  if (!/^[a-z0-9-]+$/i.test(normalized)) return undefined;
  return normalized;
}

function isRenderableProductImage(url?: string | null) {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed === "Not found") return false;
  if (trimmed === "Image not found") return false;
  if (trimmed.startsWith("data:image/svg+xml")) return false;
  return true;
}

function isBlockedProductImageHost(hostname: string) {
  const normalized = hostname.replace(/^www\./i, "").toLowerCase();
  return normalized === "s3.elryan.com";
}

function sanitizeProductImage(url?: string | null, baseUrl?: string | null) {
  if (!isRenderableProductImage(url)) return undefined;
  const trimmed = url!.trim();
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    const hostname = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    if (isBlockedProductImageHost(parsed.hostname)) return undefined;
    if (hostname === "elryan.com" && !parsed.pathname.startsWith("/img/")) return undefined;
    return parsed.toString();
  } catch {
    if (!baseUrl) return undefined;
    try {
      const resolved = new URL(trimmed, baseUrl);
      if (resolved.protocol !== "https:" && resolved.protocol !== "http:") return undefined;
      const hostname = resolved.hostname.replace(/^www\./i, "").toLowerCase();
      if (isBlockedProductImageHost(resolved.hostname)) return undefined;
      if (hostname === "elryan.com" && !resolved.pathname.startsWith("/img/")) return undefined;
      return resolved.toString();
    } catch {
      return undefined;
    }
  }
}

function sanitizeProductImages(urls: Array<string | undefined | null>, baseUrl?: string | null): string[] {
  return uniqueStrings(urls.map((url) => sanitizeProductImage(url, baseUrl)));
}

export function sanitizePublicProductImages(urls: Array<string | undefined | null>, baseUrl?: string | null): string[] {
  return sanitizeProductImages(urls, baseUrl);
}

function extractStoredProductImages(product: CatalogProductDraft): string[] {
  const raw = product.rawPayload ?? {};
  const values = [
    product.primaryImageUrl,
    ...(product.images ?? []),
    ...(Array.isArray(raw.images) ? raw.images.filter((entry): entry is string => typeof entry === "string") : []),
    ...(Array.isArray(raw.gallery) ? raw.gallery.filter((entry): entry is string => typeof entry === "string") : []),
    ...(typeof raw.image === "string" ? [raw.image] : []),
    ...(typeof raw.small_image === "string" ? [raw.small_image] : []),
    ...(typeof raw.thumbnail === "string" ? [raw.thumbnail] : []),
    ...collectRawImageLikeStrings(raw),
    product.imageUrl,
  ];

  return sanitizeProductImages(values, product.sourceUrl);
}

function collectRawImageLikeStrings(value: unknown, depth = 0): string[] {
  if (depth > 4 || value == null) return [];
  if (typeof value === "string") return looksLikeProductImageCandidate(value) ? [value] : [];
  if (Array.isArray(value)) return value.flatMap((entry) => collectRawImageLikeStrings(entry, depth + 1));
  if (typeof value !== "object") return [];

  const out: string[] = [];
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const normalizedKey = compactText(key);
    const keyLooksImage =
      normalizedKey.includes("image") ||
      normalizedKey.includes("img") ||
      normalizedKey.includes("photo") ||
      normalizedKey.includes("thumb") ||
      normalizedKey.includes("gallery") ||
      normalizedKey.includes("media") ||
      normalizedKey === "src";
    if (keyLooksImage) {
      out.push(...collectRawImageLikeStrings(nested, depth + 1));
    } else if (Array.isArray(nested) || (nested && typeof nested === "object")) {
      out.push(...collectRawImageLikeStrings(nested, depth + 1));
    }
  }
  return out;
}

function looksLikeProductImageCandidate(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /^(?:#|javascript:)/i.test(trimmed)) return false;
  if (/\.(?:avif|gif|jpe?g|png|webp)(?:[?#]|$)/i.test(trimmed)) return true;
  if (/\/(?:image|images|img|media|catalog\/product|cdn-cgi\/image)\//i.test(trimmed)) return true;
  return false;
}

function loadProductImagesFromSqlite(productId: string): string[] {
  const db = getCatalogSqliteDb();
  if (!db) return [];
  const [storeId, sourceProductId] = productId.split(":", 2);
  if (!storeId || !sourceProductId) return [];

  const row = db.prepare(`
    SELECT images_json, primary_image_url, image_url, source_url, raw_payload
    FROM catalog_products
    WHERE store_id = ? AND source_product_id = ?
    LIMIT 1
  `).get(storeId, sourceProductId) as SqliteRow | undefined;
  if (!row) return [];

  let rawPayload: Record<string, unknown> = {};
  if (typeof row.raw_payload === "string" && row.raw_payload.trim()) {
    try {
      rawPayload = JSON.parse(row.raw_payload) as Record<string, unknown>;
    } catch {
      rawPayload = {};
    }
  }

  return sanitizeProductImages([
    asOptionalString(row.primary_image_url),
    ...parseJsonArray(row.images_json),
    ...(Array.isArray(rawPayload.images) ? rawPayload.images.filter((entry): entry is string => typeof entry === "string") : []),
    ...(Array.isArray(rawPayload.gallery) ? rawPayload.gallery.filter((entry): entry is string => typeof entry === "string") : []),
    ...(typeof rawPayload.image === "string" ? [rawPayload.image] : []),
    ...(typeof rawPayload.small_image === "string" ? [rawPayload.small_image] : []),
    ...(typeof rawPayload.thumbnail === "string" ? [rawPayload.thumbnail] : []),
    ...collectRawImageLikeStrings(rawPayload),
    asOptionalString(row.image_url),
  ], asOptionalString(row.source_url));
}

function mapSqliteCatalogProductRow(row: SqliteRow): CatalogProductDraft {
  const rawPayload = parseRecord(row.raw_payload);
  const imageUrl = asOptionalString(row.image_url);
  const images = parseJsonArray(row.images_json);
  const currency = String(row.currency);
  const priceContext = {
    storeId: String(row.store_id),
    sourceConnector: String(row.source_connector),
    sourceUrl: asOptionalString(row.source_url),
  };
  const livePrice = normalizePublicPriceForCurrency(row.live_price, currency, priceContext);
  const originalPrice = asPublicOriginalPrice(row.original_price, livePrice, currency, priceContext);
  const publicCurrency = normalizePublicOutputCurrency(currency);
  const draft: CatalogProductDraft = {
    storeId: String(row.store_id),
    sourceProductId: String(row.source_product_id),
    normalizedTitle: String(row.normalized_title),
    title: String(row.title),
    brand: asOptionalString(row.brand),
    model: asOptionalString(row.model),
    sku: asOptionalString(row.sku),
    sellerName: asOptionalString(row.seller_name),
    sellerId: asOptionalString(row.seller_id),
    categoryPath: parseStringArray(row.category_path),
    sourceUrl: String(row.source_url),
    imageUrl,
    availability: String(row.availability) as CatalogProductDraft["availability"],
    currency: publicCurrency ?? currency,
    livePrice,
    originalPrice,
    onSale: Boolean(asBoolean(row.on_sale) && livePrice && originalPrice),
    sourceConnector: String(row.source_connector) as CatalogProductDraft["sourceConnector"],
    freshnessAt: String(row.freshness_at),
    lastSeenAt: String(row.last_seen_at),
    offerLabel: asOptionalString(row.offer_label),
    offerStartsAt: asOptionalString(row.offer_starts_at),
    offerEndsAt: asOptionalString(row.offer_ends_at),
    brandTokens: parseStringArray(row.brand_tokens),
    modelTokens: parseStringArray(row.model_tokens),
    skuTokens: parseStringArray(row.sku_tokens),
    rawPayload,
  };
  const fallbackImages = images.length > 0 ? images : extractStoredProductImages(draft);
  const primaryImageUrl = asOptionalString(row.primary_image_url) ?? fallbackImages[0] ?? imageUrl;

  return {
    ...draft,
    primaryImageUrl,
    images: fallbackImages,
  };
}

function loadStoreCatalogProductsPageFromSqlite(storeId: string, limit: number, offset: number) {
  const db = getCatalogSqliteDb();
  if (!db) return null;

  const totalRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM catalog_products
    WHERE store_id = ?
  `).get(storeId) as SqliteRow | undefined;

  const rows = db.prepare(`
    SELECT *
    FROM catalog_products
    WHERE store_id = ?
    ORDER BY last_seen_at DESC
    LIMIT ? OFFSET ?
  `).all(storeId, limit, offset) as SqliteRow[];

  return {
    total: asNumber(totalRow?.count) ?? 0,
    items: rows.map(mapSqliteCatalogProductRow),
  };
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

function buildProductFamilyKey(product: Pick<CatalogProductDraft, "title" | "brand" | "model">) {
  let value = normalizeText(product.model || product.title || "");
  const brand = normalizeText(product.brand ?? "");

  if (brand) {
    const escapedBrand = escapeRegExp(brand);
    value = value.replace(new RegExp(`\\b${escapedBrand}\\b`, "g"), " ");
  }

  value = value
    .replace(/\([^)]*\)/g, " ")
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

function sameCatalogProductFamily(
  reference: Pick<CatalogProductDraft | SearchDocument, "title" | "brand" | "model" | "normalizedTitle"> & {
    categoryPath?: string[] | string;
    sku?: string;
  },
  candidate: Pick<CatalogProductDraft | SearchDocument, "title" | "brand" | "model" | "normalizedTitle"> & {
    categoryPath?: string[] | string;
    sku?: string;
  },
) {
  if (sameProductIdentity(reference, candidate)) return true;
  if (buildProductIdentity(reference) && buildProductIdentity(candidate)) return false;

  const referenceBrand = normalizeText(reference.brand ?? "");
  if (!referenceBrand || normalizeText(candidate.brand ?? "") !== referenceBrand) return false;
  return buildProductFamilyKey(candidate) === buildProductFamilyKey(reference);
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
  const textArea = inferKnownStreetAreaFromText(
    raw?.area,
    raw?.address,
    raw?.name,
    store.area,
    store.address,
    store.name,
  );
  const area =
    textArea ||
    inferredArea ||
    raw?.area?.trim() ||
    store.area?.trim() ||
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
    citySlug: sanitizePublicCitySlug(rawEntry?.citySlug ?? store.sourceFile),
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

function mapStoreRecordToPublicStoreFast(
  store: StoreRecord,
  options?: {
    productCount?: number;
    offerCount?: number;
  },
): PublicStore {
  const categories = uniqueStrings([
    store.primaryCategory,
    store.suggestedCategory,
  ]);
  const category = categories[0] ?? "Uncategorized";
  const textArea = inferKnownStreetAreaFromText(store.area, store.address, store.name);
  const area =
    textArea ||
    store.area?.trim() ||
    store.cityAr?.trim() ||
    store.city?.trim() ||
    "العراق";
  const verified = Boolean(store.website && store.websiteType === "official");

  return {
    id: store.id,
    slug: store.slug,
    seedKey: store.placeId ?? store.id,
    name: store.name,
    city: store.city,
    cityAr: store.cityAr,
    citySlug: sanitizePublicCitySlug(store.sourceFile),
    area,
    category,
    categories: categories.length > 0 ? categories : [category],
    address: store.address,
    lat: store.lat,
    lng: store.lng,
    googleMapsUrl: store.googleMapsUrl,
    website: store.website,
    phone: store.phone,
    whatsapp: store.whatsapp,
    discoverySource: store.discoverySource,
    verified,
    verificationStatus: verified ? "verified" : "unverified",
    notes: store.blockedReason,
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

function comparePublicStoresByRating(a: PublicStore, b: PublicStore) {
  return (
    (b.rating ?? 0) - (a.rating ?? 0) ||
    (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
    Number(Boolean(b.verified)) - Number(Boolean(a.verified)) ||
    Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
    (b.productCount ?? 0) - (a.productCount ?? 0) ||
    (b.offerCount ?? 0) - (a.offerCount ?? 0) ||
    a.name.localeCompare(b.name, "ar")
  );
}

async function mapCatalogProductToPublicProduct(
  store: StoreRecord,
  product: CatalogProductDraft,
  storeCache: Map<string, PublicStore>,
): Promise<PublicProductIndex> {
  const publicStore = storeCache.get(store.id) ?? mapStoreRecordToPublicStoreFast(store);
  storeCache.set(store.id, publicStore);
  const priceContext = {
    storeId: store.id,
    sourceConnector: product.sourceConnector,
    sourceUrl: product.sourceUrl,
  };
  const priceValue = normalizePublicPriceForCurrency(product.livePrice, product.currency, priceContext);
  const originalPriceValue = asPublicOriginalPrice(product.originalPrice, priceValue, product.currency, priceContext);
  const publicCurrency = normalizePublicOutputCurrency(product.currency);

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
    priceValue,
    priceText: formatPublicPrice(priceValue, publicCurrency),
    originalPriceValue,
    productUrl: product.sourceUrl,
    imageUrl: sanitizeProductImage(product.primaryImageUrl ?? product.imageUrl, product.sourceUrl),
    images: extractStoredProductImages(product),
    rating: publicStore.rating,
    reviewCount: publicStore.reviewCount,
    inStock: product.availability === "in_stock",
    stockState: product.availability,
    currency: publicCurrency ?? product.currency,
    offerLabel: product.offerLabel,
    crawledAt: product.lastSeenAt,
  };
}

function mapSearchDocumentToPublicProduct(
  document: SearchDocument,
  store: StoreRecord,
  storeCache: Map<string, PublicStore>,
  options?: {
    includeImages?: boolean;
  },
): PublicProductIndex {
  const publicStore = storeCache.get(store.id) ?? mapStoreRecordToPublicStoreFast(store);
  storeCache.set(store.id, publicStore);
  const includeImages = options?.includeImages ?? true;
  const images = includeImages ? loadProductImagesFromSqlite(document.id) : [];
  const primaryImageUrl = images[0] ?? sanitizeProductImage(document.imageUrl, document.sourceUrl);
  const categoryPath = document.categoryPath
    .split(" > ")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const priceContext = {
    storeId: document.storeId,
    sourceUrl: document.sourceUrl,
  };
  const priceValue = normalizePublicPriceForCurrency(document.livePrice, document.currency, priceContext);
  const originalPriceValue = asPublicOriginalPrice(document.originalPrice, priceValue, document.currency, priceContext);
  const publicCurrency = normalizePublicOutputCurrency(document.currency);

  return {
    id: document.id,
    canonicalProductId: buildCanonicalProductId({
      normalizedTitle: document.normalizedTitle,
      title: document.title,
      brand: document.brand,
      model: document.model,
      sku: document.sku,
      categoryPath: document.categoryPath,
    }),
    shopId: store.id,
    shopName: document.storeName,
    city: publicStore.city,
    cityAr: publicStore.cityAr,
    citySlug: publicStore.citySlug,
    area: publicStore.area,
    category: categoryPath.at(-1) ?? publicStore.category,
    categoryPath,
    name: document.title,
    slug: slugify(document.title),
    sku: document.sku,
    brand: document.brand,
    model: document.model,
    priceValue,
    priceText: formatPublicPrice(priceValue, publicCurrency),
    originalPriceValue,
    productUrl: document.sourceUrl,
    imageUrl: primaryImageUrl,
    images,
    rating: publicStore.rating,
    reviewCount: publicStore.reviewCount,
    inStock: document.availability === "in_stock",
    stockState: document.availability,
    currency: publicCurrency ?? document.currency ?? "IQD",
    offerLabel: document.offerLabel,
    crawledAt: document.freshnessAt,
  };
}

async function mapSearchDocumentsToPublicProducts(
  documents: SearchDocument[],
  storesById: Map<string, StoreRecord>,
  options?: {
    includeImages?: boolean;
  },
) {
  const storeCache = new Map<string, PublicStore>();
  const items: PublicProductIndex[] = [];

  for (const document of documents) {
    const store = storesById.get(document.storeId);
    if (!store) continue;
    items.push(mapSearchDocumentToPublicProduct(document, store, storeCache, options));
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
  if (!isPublicPrice(publicProduct.priceValue)) return null;
  const publicCurrency = normalizePublicCurrency(publicProduct.currency);
  if (!publicCurrency) return null;
  if (!isPublicOfferUrlEligible(publicProduct.productUrl)) return null;
  return {
    id: publicProduct.id,
    productId: publicProduct.canonicalProductId,
    storeId: publicProduct.shopId,
    storeName: publicProduct.shopName,
    storeCity: store.area || store.cityAr || store.city,
    storeRating: store.rating,
    verified: store.verified,
    officialDealer: false,
    price: publicProduct.priceValue,
    originalPrice: asPublicOriginalPrice(publicProduct.originalPriceValue, publicProduct.priceValue),
    currency: publicCurrency,
    stock: publicProduct.stockState,
    productUrl: publicProduct.productUrl ?? "#",
    lastSeenAt: publicProduct.crawledAt,
  };
}

function isPublicOfferUrlEligible(productUrl?: string): boolean {
  if (!productUrl) return false;
  const domain = extractDomain(productUrl);
  if (!domain) return false;
  return !BLOCKED_PUBLIC_OFFER_ROOT_DOMAINS.has(extractRootDomain(domain));
}

function dedupeUnifiedOffers(offers: PublicUnifiedOffer[]): PublicUnifiedOffer[] {
  const byMerchant = new Map<string, PublicUnifiedOffer>();
  for (const offer of offers) {
    const key = `${offer.productId}:${buildOfferMerchantKey(offer)}`;
    const current = byMerchant.get(key);
    if (!current || compareUnifiedOfferPreference(offer, current) < 0) {
      byMerchant.set(key, offer);
    }
  }
  return [...byMerchant.values()];
}

function buildOfferMerchantKey(offer: PublicUnifiedOffer): string {
  const domain = extractDomain(offer.productUrl);
  if (domain) return `domain:${extractRootDomain(domain)}`;
  return `store:${compactText(offer.storeName) || offer.storeId}`;
}

function compareUnifiedOfferPreference(a: PublicUnifiedOffer, b: PublicUnifiedOffer): number {
  if (a.stock === "in_stock" && b.stock !== "in_stock") return -1;
  if (b.stock === "in_stock" && a.stock !== "in_stock") return 1;
  if (a.verified !== b.verified) return a.verified ? -1 : 1;
  if (a.officialDealer !== b.officialDealer) return a.officialDealer ? -1 : 1;
  if (a.price !== b.price) return a.price - b.price;
  const storeNameOrder = a.storeName.localeCompare(b.storeName, "en", { sensitivity: "base" });
  if (storeNameOrder !== 0) return storeNameOrder;
  if (a.storeId !== b.storeId) return a.storeId.localeCompare(b.storeId, "en", { sensitivity: "base" });
  return new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime();
}

function sortUnifiedOffers(offers: PublicUnifiedOffer[]): PublicUnifiedOffer[] {
  return [...offers].sort(compareUnifiedOfferPreference);
}

function buildUnifiedProduct(
  group: PublicProductIndex[],
  offers: PublicUnifiedOffer[],
  sourceProducts?: CatalogProductDraft[],
): PublicUnifiedProduct {
  const first = group[0];
  if (!first) {
    return {
      id: `unified_${sha256Hex("empty").slice(0, 24)}`,
      title: "",
      images: [],
      offerCount: 0,
      inStockCount: 0,
    };
  }
  const images = sourceProducts && sourceProducts.length > 0
    ? sanitizeProductImages(sourceProducts.flatMap((product) => extractStoredProductImages(product)))
    : sanitizeProductImages(group.flatMap((item) => item.images?.length ? item.images : [item.imageUrl]));
  const pricedOffers = offers.filter((offer) => isPublicPrice(offer.price));
  const prices = pricedOffers.map((offer) => offer.price);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : undefined;
  const inStockCount = offers.filter((offer) => offer.stock === "in_stock").length;
  const cheapestOffer = [...pricedOffers].sort((a, b) => a.price - b.price)[0];
  const bestOffer = [...pricedOffers]
    .filter((offer) => offer.stock === "in_stock")
    .sort((a, b) => a.price - b.price)[0];

  return {
    id: first.canonicalProductId,
    title: first.name,
    brand: first.brand,
    model: first.model,
    category: first.category,
    images,
    rating: first.rating,
    reviewCount: first.reviewCount,
    lowestPrice,
    highestPrice,
    priceCurrency: cheapestOffer?.currency,
    offerCount: offers.length,
    inStockCount,
    bestOfferId: bestOffer?.id,
  };
}

function loadCatalogProductsBySearchDocumentIdsFromSqlite(ids: string[]): CatalogProductDraft[] {
  const db = getCatalogSqliteDb();
  if (!db || ids.length === 0) return [];

  const pairs = ids
    .map((id) => {
      const [storeId, sourceProductId] = id.split(":", 2);
      return storeId && sourceProductId ? ([storeId, sourceProductId] as const) : null;
    })
    .filter((pair): pair is readonly [string, string] => Boolean(pair));
  if (pairs.length === 0) return [];

  const where = pairs.map(() => "(store_id = ? AND source_product_id = ?)").join(" OR ");
  const params = pairs.flatMap(([storeId, sourceProductId]) => [storeId, sourceProductId]);
  const rows = db.prepare(`
    SELECT *
    FROM catalog_products
    WHERE ${where}
  `).all(...params) as SqliteRow[];

  return rows.map(mapSqliteCatalogProductRow);
}

function loadCanonicalAndFamilyProductsFromSqlite(canonicalId: string): {
  products: CatalogProductDraft[];
  storeIds: string[];
} | null {
  const db = getCatalogSqliteDb();
  if (!db) return null;

  const exactRows = db.prepare(`
    SELECT *
    FROM search_documents
    WHERE canonical_product_id = ?
       OR legacy_canonical_product_id = ?
    ORDER BY freshness_at DESC
    LIMIT ?
  `).all(canonicalId, canonicalId, MAX_PRODUCT_DETAIL_OFFERS) as SqliteRow[];
  const exactMatches = exactRows.map(mapSqliteSearchRow);

  if (exactMatches.length === 0) {
    return { products: [], storeIds: [] };
  }

  const reference = exactMatches[0]!;
  const productIds = new Set(exactMatches.map((document) => document.id));

  const currentCanonicalId = buildCanonicalProductId(reference);
  if (currentCanonicalId && currentCanonicalId !== canonicalId) {
    const currentRows = db.prepare(`
      SELECT *
      FROM search_documents
      WHERE canonical_product_id = ?
      ORDER BY freshness_at DESC
      LIMIT ?
    `).all(currentCanonicalId, MAX_PRODUCT_DETAIL_OFFERS) as SqliteRow[];
    for (const row of currentRows) {
      productIds.add(mapSqliteSearchRow(row).id);
      if (productIds.size >= MAX_PRODUCT_DETAIL_OFFERS) break;
    }
  }

  const needsLegacyFamilyExpansion = productIds.size <= 1;
  if (needsLegacyFamilyExpansion) {
    const familyRows = loadFamilyCandidateRowsFromSqlite(db, reference);
    for (const row of familyRows) {
      if (productIds.size >= MAX_PRODUCT_DETAIL_OFFERS) break;
      const document = mapSqliteSearchRow(row);
      if (productIds.has(document.id)) continue;
      if (sameCatalogProductFamily(reference, document)) {
        productIds.add(document.id);
      }
    }
  }

  const products = loadCatalogProductsBySearchDocumentIdsFromSqlite([...productIds]);
  return {
    products,
    storeIds: [...new Set(products.map((product) => product.storeId))],
  };
}

function loadFamilyCandidateRowsFromSqlite(db: DatabaseSync, reference: SearchDocument): SqliteRow[] {
  const identity = buildProductIdentity(reference);
  if (identity) {
    const modelPatterns = buildModelLikePatterns(identity.model);
    const capacityPatterns = identity.capacity ? buildCapacityLikePatterns(identity.capacity) : [];
    const predicates: string[] = [];
    const params: Array<string | number> = [];

    for (const pattern of modelPatterns) {
      predicates.push("(lower(title) LIKE ? OR lower(normalized_title) LIKE ? OR lower(model) LIKE ? OR lower(sku) LIKE ?)");
      params.push(pattern, pattern, pattern, pattern);
    }

    if (capacityPatterns.length > 0) {
      const capacityPredicate = capacityPatterns.map(() => "lower(title) LIKE ?").join(" OR ");
      predicates.push(`(${capacityPredicate})`);
      params.push(...capacityPatterns);
    }

    if (predicates.length > 0) {
      return db.prepare(`
        SELECT *
        FROM search_documents
        WHERE ${predicates.join(" AND ")}
        ORDER BY freshness_at DESC
        LIMIT ?
      `).all(...params, MAX_PRODUCT_DETAIL_OFFERS * 40) as SqliteRow[];
    }
  }

  const referenceBrand = reference.brand?.trim();
  if (!referenceBrand) return [];
  return db.prepare(`
    SELECT *
    FROM search_documents
    WHERE brand = ?
       OR lower(title) LIKE ?
    ORDER BY freshness_at DESC
    LIMIT ?
  `).all(referenceBrand, `%${normalizeText(referenceBrand).toLowerCase()}%`, MAX_PRODUCT_DETAIL_OFFERS * 40) as SqliteRow[];
}

function buildModelLikePatterns(model: string): string[] {
  const normalized = normalizeText(model).toLowerCase();
  const compact = compactText(model).toLowerCase();
  const split = normalized.match(/^([a-z]+)(\d+[a-z0-9]*)$/i);
  const patterns = new Set<string>();
  if (normalized) patterns.add(`%${normalized}%`);
  if (compact && compact !== normalized) patterns.add(`%${compact}%`);
  if (split?.[1] && split[2]) patterns.add(`%${split[1].toLowerCase()}%${split[2].toLowerCase()}%`);
  return [...patterns];
}

function buildCapacityLikePatterns(capacity: string): string[] {
  const normalized = capacity.toLowerCase();
  const match = normalized.match(/^(\d+(?:\.\d+)?)(tb|gb)$/);
  if (!match) return [`%${normalized}%`];
  const amount = match[1]!;
  const unit = match[2]!;
  const arabicUnit = unit === "tb" ? "تيرا" : "جيجا";
  return [`%${amount}${unit}%`, `%${amount} ${unit}%`, `%${amount}%${arabicUnit}%`];
}

async function collectCanonicalAndFamilyProducts(
  context: CatalogContext,
  canonicalId: string,
): Promise<{
  products: CatalogProductDraft[];
  storesById: Map<string, StoreRecord>;
}> {
  const sqliteCollected = shouldUseSqliteCatalogReads(context)
    ? loadCanonicalAndFamilyProductsFromSqlite(canonicalId)
    : null;
  if (sqliteCollected) {
    const stores = await context.repository.getStoresByIds(sqliteCollected.storeIds);
    return {
      products: sqliteCollected.products,
      storesById: new Map(stores.map((store) => [store.id, store])),
    };
  }

  const stores = await context.repository.listStores();
  const storesById = new Map(stores.map((store) => [store.id, store]));
  const catalogs = await Promise.all(
    stores.map(async (store) => ({
      store,
      catalog: await context.repository.getStoreCatalog(store.id),
    })),
  );

  const exactMatches = catalogs.flatMap(({ catalog }) =>
    catalog.products.filter((product) =>
      buildCanonicalProductId(product) === canonicalId ||
      buildLegacyCanonicalProductId(product) === canonicalId,
    ),
  );
  if (exactMatches.length === 0) {
    return { products: [], storesById };
  }

  const reference = exactMatches[0]!;
  const familyMatches = catalogs.flatMap(({ catalog }) =>
    catalog.products.filter((product) => {
      if (buildCanonicalProductId(product) === canonicalId || buildLegacyCanonicalProductId(product) === canonicalId) {
        return true;
      }
      return sameCatalogProductFamily(reference, product);
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

async function expandSearchOfferProducts(
  context: CatalogContext,
  seedProducts: PublicProductIndex[],
  initialStoresById: Map<string, StoreRecord>,
): Promise<{
  products: PublicProductIndex[];
  storesById: Map<string, StoreRecord>;
  publicStoresById: Map<string, PublicStore>;
}> {
  if (seedProducts.length === 0) {
    return {
      products: [],
      storesById: initialStoresById,
      publicStoresById: new Map([...initialStoresById.values()].map((store) => {
        const publicStore = mapStoreRecordToPublicStoreFast(store);
        return [publicStore.id, publicStore] as const;
      })),
    };
  }

  const productsById = new Map(seedProducts.map((product) => [product.id, product]));
  const storesById = new Map(initialStoresById);
  const publicStoreCache = new Map<string, PublicStore>();
  const seedsByCanonical = new Map<string, PublicProductIndex>();
  for (const product of seedProducts) {
    if (!seedsByCanonical.has(product.canonicalProductId)) {
      seedsByCanonical.set(product.canonicalProductId, product);
    }
    if (seedsByCanonical.size >= MAX_SEARCH_FAMILY_EXPANSIONS) break;
  }

  for (const seedProduct of seedsByCanonical.values()) {
    const collected = await collectSearchSeedFamilyProducts(context, seedProduct);
    for (const [storeId, store] of collected.storesById.entries()) {
      storesById.set(storeId, store);
    }
    for (const product of collected.products) {
      const store = collected.storesById.get(product.storeId) ?? storesById.get(product.storeId);
      if (!store) continue;
      const publicProduct = await mapCatalogProductToPublicProduct(store, product, publicStoreCache);
      productsById.set(publicProduct.id, publicProduct);
    }
  }

  for (const store of storesById.values()) {
    if (!publicStoreCache.has(store.id)) {
      publicStoreCache.set(store.id, mapStoreRecordToPublicStoreFast(store));
    }
  }

  return {
    products: [...productsById.values()],
    storesById,
    publicStoresById: publicStoreCache,
  };
}

async function collectSearchSeedFamilyProducts(
  context: CatalogContext,
  seedProduct: PublicProductIndex,
): Promise<{
  products: CatalogProductDraft[];
  storesById: Map<string, StoreRecord>;
}> {
  const sqliteCollected = shouldUseSqliteCatalogReads(context)
    ? loadSearchSeedFamilyProductsFromSqlite(seedProduct)
    : null;
  if (sqliteCollected) {
    const stores = await context.repository.getStoresByIds(sqliteCollected.storeIds);
    return {
      products: sqliteCollected.products,
      storesById: new Map(stores.map((store) => [store.id, store])),
    };
  }
  return collectCanonicalAndFamilyProducts(context, seedProduct.canonicalProductId);
}

function loadSearchSeedFamilyProductsFromSqlite(seedProduct: PublicProductIndex): {
  products: CatalogProductDraft[];
  storeIds: string[];
} | null {
  const db = getCatalogSqliteDb();
  if (!db) return null;

  const reference = publicProductToSearchReference(seedProduct);
  const productIds = new Set<string>();
  if (seedProduct.id.includes(":")) productIds.add(seedProduct.id);

  const exactRows = db.prepare(`
    SELECT *
    FROM search_documents
    WHERE canonical_product_id = ?
       OR legacy_canonical_product_id = ?
    ORDER BY freshness_at DESC
    LIMIT ?
  `).all(seedProduct.canonicalProductId, seedProduct.canonicalProductId, MAX_PRODUCT_DETAIL_OFFERS) as SqliteRow[];

  for (const row of exactRows) {
    const document = mapSqliteSearchRow(row);
    productIds.add(document.id);
  }

  const currentCanonicalId = buildCanonicalProductId(reference);
  if (currentCanonicalId && currentCanonicalId !== seedProduct.canonicalProductId) {
    const currentRows = db.prepare(`
      SELECT *
      FROM search_documents
      WHERE canonical_product_id = ?
      ORDER BY freshness_at DESC
      LIMIT ?
    `).all(currentCanonicalId, MAX_PRODUCT_DETAIL_OFFERS) as SqliteRow[];
    for (const row of currentRows) {
      if (productIds.size >= MAX_PRODUCT_DETAIL_OFFERS) break;
      productIds.add(mapSqliteSearchRow(row).id);
    }
  }

  const products = loadCatalogProductsBySearchDocumentIdsFromSqlite([...productIds]);
  return {
    products,
    storeIds: [...new Set(products.map((product) => product.storeId))],
  };
}

function publicProductToSearchReference(product: PublicProductIndex): SearchDocument {
  return {
    id: product.id,
    storeId: product.shopId,
    storeName: product.shopName,
    normalizedTitle: compactText(product.name),
    title: product.name,
    brand: product.brand,
    model: product.model,
    sku: product.sku,
    livePrice: product.priceValue,
    originalPrice: product.originalPriceValue,
    onSale: Boolean(product.originalPriceValue && product.priceValue && product.originalPriceValue > product.priceValue),
    availability: product.stockState,
    freshnessAt: product.crawledAt ?? new Date(0).toISOString(),
    sourceUrl: product.productUrl ?? "",
    categoryPath: product.categoryPath.join(" > "),
    imageUrl: product.imageUrl,
    currency: product.currency,
    offerLabel: product.offerLabel,
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
  const sizeSummaries = await context.repository.listStoreSizeSummaries();
  const sizeByStoreId = new Map(sizeSummaries.map((summary) => [summary.storeId, summary]));
  const indexedStoreIds = new Set(
    sizeSummaries
      .filter((summary) => summary.indexedProductCount > 0)
      .map((summary) => summary.storeId),
  );
  const bootstrapStores = stores.filter((store) => indexedStoreIds.has(store.id));
  const publicStores = await Promise.all(
    bootstrapStores.map(async (store) => {
      const size = sizeByStoreId.get(store.id);
      return mapStoreRecordToPublicStore(store, {
        productCount: size?.indexedProductCount,
        offerCount: size?.activeOfferCount,
      });
    }),
  );
  publicStores.sort(comparePublicStoresByRating);
  const publicStoresById = new Map(publicStores.map((store) => [store.id, store]));
  const storesById = new Map(bootstrapStores.map((store) => [store.id, store]));
  const sqliteSlices = loadBootstrapSearchSlicesFromSqlite();
  const searchDocuments = sqliteSlices?.latest ?? await context.repository.listSearchDocuments();
  const dealsSource = sqliteSlices?.deals ?? [...searchDocuments]
    .filter((document) => isPublicPrice(document.livePrice) && isPublicPrice(document.originalPrice) && document.originalPrice > document.livePrice)
    .sort((a, b) => {
      const aSavings = ((a.originalPrice ?? 0) - (a.livePrice ?? 0)) / (a.originalPrice ?? 1);
      const bSavings = ((b.originalPrice ?? 0) - (b.livePrice ?? 0)) / (b.originalPrice ?? 1);
      return bSavings - aSavings;
    })
    .slice(0, 12);
  const trendingSource = sqliteSlices?.trending ?? [...searchDocuments]
    .sort((a, b) => {
      const aScore = Number(a.onSale) * 3 + Number(a.availability === "in_stock") * 2 + Number(isPublicPrice(a.livePrice));
      const bScore = Number(b.onSale) * 3 + Number(b.availability === "in_stock") * 2 + Number(isPublicPrice(b.livePrice));
      return bScore - aScore || new Date(b.freshnessAt).getTime() - new Date(a.freshnessAt).getTime();
    })
    .slice(0, 12);
  const latestSource = sqliteSlices?.latest ?? [...searchDocuments]
    .sort((a, b) => new Date(b.freshnessAt).getTime() - new Date(a.freshnessAt).getTime())
    .slice(0, 12);

  const deals = await mapSearchDocumentsToPublicProducts(dealsSource, storesById);
  const trending = await mapSearchDocumentsToPublicProducts(trendingSource, storesById);
  const latest = await mapSearchDocumentsToPublicProducts(latestSource, storesById);
  const brands = sqliteSlices?.brandRows
    ? mapBrandSummariesFromSqliteRows(sqliteSlices.brandRows, publicStoresById)
    : mapBrandSummaries(searchDocuments, publicStoresById);

  return {
    summary: {
      totalStores: stores.length,
      indexedStores: indexedStoreIds.size,
      totalProducts: sizeSummaries.reduce((sum, summary) => sum + summary.indexedProductCount, 0),
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
  const limit = Math.max(1, Math.min(options?.limit ?? 100, 250));
  const offset = Math.max(0, options?.offset ?? 0);
  const sqlitePage = loadCatalogProductsPageFromSqlite(limit, offset);
  const sourceItems = sqlitePage?.items ?? (() => {
    const fallback = [] as SearchDocument[];
    return fallback;
  })();
  const items = sqlitePage
    ? await mapSearchDocumentsToPublicProducts(sourceItems, storesById)
    : await (async () => {
        const searchDocuments = await context.repository.listSearchDocuments();
        const latestSorted = [...searchDocuments].sort((a, b) => new Date(b.freshnessAt).getTime() - new Date(a.freshnessAt).getTime());
        return mapSearchDocumentsToPublicProducts(latestSorted.slice(offset, offset + limit), storesById);
      })();

  return {
    total: sqlitePage?.total ?? items.length,
    limit,
    offset,
    items,
  };
}

export async function buildPublicBootstrapLite(context: CatalogContext): Promise<PublicBootstrapLitePayload> {
  const stores = await context.repository.listStores();
  const sizeSummaries = await context.repository.listStoreSizeSummaries();
  const sizeByStoreId = new Map(sizeSummaries.map((summary) => [summary.storeId, summary]));
  const candidateStores = stores
    .filter((store) => (sizeByStoreId.get(store.id)?.indexedProductCount ?? 0) > 0)
    .sort((a, b) =>
      Number(Boolean(b.highPriority)) - Number(Boolean(a.highPriority)) ||
      (sizeByStoreId.get(b.id)?.indexedProductCount ?? 0) - (sizeByStoreId.get(a.id)?.indexedProductCount ?? 0) ||
      (sizeByStoreId.get(b.id)?.activeOfferCount ?? 0) - (sizeByStoreId.get(a.id)?.activeOfferCount ?? 0) ||
      a.name.localeCompare(b.name, "ar"),
    )
    .slice(0, 24);

  const publicStores = await Promise.all(
    candidateStores.map(async (store) => {
      const size = sizeByStoreId.get(store.id);
      return mapStoreRecordToPublicStore(store, {
        productCount: size?.indexedProductCount,
        offerCount: size?.activeOfferCount,
      });
    }),
  );
  publicStores.sort(comparePublicStoresByRating);

  const sqliteSlices = loadBootstrapSearchSlicesFromSqlite();
  const publicStoresById = new Map(publicStores.map((store) => [store.id, store]));
  const brands = sqliteSlices?.brandRows
    ? mapBrandSummariesFromSqliteRows(sqliteSlices.brandRows, publicStoresById).slice(0, 24)
    : [];
  const homeStoreIds = sqliteSlices
    ? [...new Set([
        ...sqliteSlices.deals.slice(0, 6).map((item) => item.storeId),
        ...sqliteSlices.trending.slice(0, 6).map((item) => item.storeId),
        ...sqliteSlices.latest.slice(0, 6).map((item) => item.storeId),
      ])]
    : [];
  const homeStores = homeStoreIds.length > 0 ? await context.repository.getStoresByIds(homeStoreIds) : [];
  const homeStoresById = new Map(homeStores.map((store) => [store.id, store]));

  return {
    summary: {
      totalStores: stores.length,
      indexedStores: sizeSummaries.filter((summary) => summary.indexedProductCount > 0).length,
      totalProducts: sizeSummaries.reduce((sum, summary) => sum + summary.indexedProductCount, 0),
      lastSyncAt: stores
        .map((store) => store.lastSyncAt)
        .filter(Boolean)
        .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0],
    },
    featuredShops: publicStores
      .filter((store) => Boolean(store.featured))
      .slice(0, 8),
    topRatedShops: publicStores.slice(0, 8),
    brands,
    home: {
      deals: sqliteSlices?.deals
        ? await mapSearchDocumentsToPublicProducts(
            sqliteSlices.deals.slice(0, 6),
            homeStoresById,
            { includeImages: false },
          )
        : [],
      trending: sqliteSlices?.trending
        ? await mapSearchDocumentsToPublicProducts(
            sqliteSlices.trending.slice(0, 6),
            homeStoresById,
            { includeImages: false },
          )
        : [],
      latest: sqliteSlices?.latest
        ? await mapSearchDocumentsToPublicProducts(
            sqliteSlices.latest.slice(0, 6),
            homeStoresById,
            { includeImages: false },
          )
        : [],
    },
  };
}

export async function buildPublicStoreSummary(
  context: CatalogContext,
  storeId: string,
): Promise<PublicStoreSummaryPayload | null> {
  const store = await context.repository.getStoreById(storeId);
  if (!store) return null;
  const size = await context.repository.getStoreSizeSummary(storeId);
  const connectorProfile = await context.repository.getConnectorProfile(storeId);
  const publicStore = await mapStoreRecordToPublicStore(store, {
    productCount: size?.indexedProductCount,
    offerCount: size?.activeOfferCount,
  });

  return {
    store: publicStore,
    size,
    sourceCount: Number(Boolean(publicStore.website)) + Number(Boolean(publicStore.googleMapsUrl)),
    connectorProfile,
  };
}

export async function buildPublicStoreProducts(
  context: CatalogContext,
  storeId: string,
  options?: { limit?: number; offset?: number },
): Promise<PublicCatalogProductsPayload | null> {
  const store = await context.repository.getStoreById(storeId);
  if (!store) return null;

  const limit = Math.max(1, Math.min(options?.limit ?? 24, 200));
  const offset = Math.max(0, options?.offset ?? 0);
  const sqlitePage = loadStoreCatalogProductsPageFromSqlite(storeId, limit, offset);
  const storeCache = new Map<string, PublicStore>();

  if (sqlitePage) {
    return {
      total: sqlitePage.total,
      limit,
      offset,
      items: await Promise.all(
        sqlitePage.items.map((product) => mapCatalogProductToPublicProduct(store, product, storeCache)),
      ),
    };
  }

  const catalog = await context.repository.getStoreCatalog(storeId);
  const items = await Promise.all(
    catalog.products.slice(offset, offset + limit).map((product) => mapCatalogProductToPublicProduct(store, product, storeCache)),
  );
  return {
    total: catalog.products.length,
    limit,
    offset,
    items,
  };
}

export async function buildPublicBrandSummary(
  context: CatalogContext,
  slug: string,
): Promise<PublicBrandSummaryPayload | null> {
  const sqliteBrand = loadBrandRowsFromSqlite(slug, { includeDocuments: false });
  if (sqliteBrand) {
    const stores = await context.repository.getStoresByIds(sqliteBrand.storeIds);
    const publicStores = await Promise.all(stores.map((store) => mapStoreRecordToPublicStore(store)));
    const publicStoresById = new Map(publicStores.map((store) => [store.id, store]));
    const brand = buildBrandSummaryFromSqliteRows(sqliteBrand, publicStoresById);
    if (!brand) return null;

    return {
      brand,
      topStores: [...publicStores]
        .sort(comparePublicStoresByRating)
        .slice(0, 8),
      totalStores: sqliteBrand.totalStores,
      totalProducts: sqliteBrand.totalProducts,
    };
  }

  const detail = await buildPublicBrandDetail(context, slug);
  if (!detail) return null;

  return {
    brand: detail.brand,
    topStores: [...detail.stores]
      .sort(comparePublicStoresByRating)
      .slice(0, 8),
    totalStores: detail.stores.length,
    totalProducts: detail.brand.productCount || detail.products.length,
  };
}

export async function buildPublicBrandProducts(
  context: CatalogContext,
  slug: string,
  options?: { limit?: number; offset?: number },
): Promise<PublicCatalogProductsPayload | null> {
  const limit = Math.max(1, Math.min(options?.limit ?? 24, 200));
  const offset = Math.max(0, options?.offset ?? 0);

  const sqliteBrand = loadBrandRowsFromSqlite(slug, { limit, offset });
  if (sqliteBrand) {
    const storeIds = [...new Set(sqliteBrand.documents.map((document) => document.storeId))];
    const stores = storeIds.length > 0 ? await context.repository.getStoresByIds(storeIds) : [];
    const storesById = new Map(stores.map((store) => [store.id, store]));

    return {
      total: sqliteBrand.totalProducts,
      limit,
      offset,
      items: await mapSearchDocumentsToPublicProducts(sqliteBrand.documents, storesById),
    };
  }

  const detail = await buildPublicBrandDetail(context, slug);
  if (!detail) return null;

  return {
    total: detail.brand.productCount || detail.products.length,
    limit,
    offset,
    items: detail.products.slice(offset, offset + limit),
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
    catalog.products.map((product) => mapCatalogProductToPublicProduct(store, product, storeCache)),
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
  const sqliteProducts = loadCatalogProductsBySearchDocumentIdsFromSqlite(ids);
  if (sqliteProducts.length > 0) {
    const storeCache = new Map<string, PublicStore>();
    const stores = await context.repository.getStoresByIds([...new Set(sqliteProducts.map((product) => product.storeId))]);
    const storesById = new Map(stores.map((store) => [store.id, store]));
    const productsById = new Map<string, CatalogProductDraft>(
      sqliteProducts.map((product) => [`${product.storeId}:${product.sourceProductId}`, product] as const),
    );
    const items: PublicProductIndex[] = [];

    for (const id of ids) {
      const product = productsById.get(id);
      if (!product) continue;
      const store = storesById.get(product.storeId);
      if (!store) continue;
      items.push(await mapCatalogProductToPublicProduct(store, product, storeCache));
    }

    return items;
  }

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
      items.push(await mapCatalogProductToPublicProduct(store, product, storeCache));
    }
  }

  return items;
}

export async function buildPublicBrandDetail(context: CatalogContext, slug: string) {
  const sqliteBrand = loadBrandRowsFromSqlite(slug, { limit: DEFAULT_BRAND_DETAIL_PRODUCT_LIMIT, offset: 0 });
  if (!sqliteBrand && catalogConfig.database.driver === "sqlite") return null;
  const brandDocuments = sqliteBrand?.documents ?? (await context.repository.listSearchDocuments())
    .filter((document) => document.brand && slugify(document.brand) === slug);
  if (brandDocuments.length === 0) return null;
  const productDocuments = sqliteBrand ? brandDocuments : brandDocuments.slice(0, DEFAULT_BRAND_DETAIL_PRODUCT_LIMIT);
  const storeIds = sqliteBrand?.storeIds ?? [...new Set(brandDocuments.map((document) => document.storeId))];
  const stores = await context.repository.getStoresByIds(storeIds);
  const publicStores = await Promise.all(stores.map((store) => mapStoreRecordToPublicStore(store)));
  const publicStoresById = new Map(publicStores.map((store) => [store.id, store]));
  const storesById = new Map(stores.map((store) => [store.id, store]));

  const brand = sqliteBrand?.summaryRows
    ? buildBrandSummaryFromSqliteRows(sqliteBrand, publicStoresById)
    : mapBrandSummaries(brandDocuments, publicStoresById)[0];
  if (!brand) return null;
  const storesForBrand = storeIds
    .map((storeId) => publicStoresById.get(storeId))
    .filter(Boolean) as PublicStore[];
  const products = await mapSearchDocumentsToPublicProducts(productDocuments, storesById);

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
  const normalizedQuery = query.q?.trim() ?? "";
  const shouldScanStructuredDocuments =
    !normalizedQuery &&
    Boolean(query.brands?.length || query.categories?.length || query.stores?.length || query.cities?.length);

  let searchHits: SearchDocument[];
  let stores: StoreRecord[];
  let publicStoresById: Map<string, PublicStore>;
  let storesById: Map<string, StoreRecord>;

  if (shouldScanStructuredDocuments) {
    stores = await context.repository.listStores();
    publicStoresById = new Map(stores.map((store) => {
      const publicStore = mapStoreRecordToPublicStoreFast(store);
      return [publicStore.id, publicStore] as const;
    }));
    storesById = new Map(stores.map((store) => [store.id, store]));

    const hasStoreScopedFilter = Boolean(query.cities?.length || query.stores?.length);
    const candidateStores = hasStoreScopedFilter
      ? stores.filter((store) => {
          const publicStore = publicStoresById.get(store.id);
          if (query.stores?.length && !query.stores.includes(store.id)) return false;
          if (query.cities?.length) {
            const locations = [publicStore?.area, publicStore?.cityAr, publicStore?.city].filter(Boolean) as string[];
            if (!locations.some((location) => query.cities!.includes(location))) return false;
          }
          return true;
        })
      : stores;

    const scopedResults = hasStoreScopedFilter
      ? await Promise.all(candidateStores.slice(0, 80).map((store) =>
          context.searchEngine.search({
            q: "",
            storeId: store.id,
            ...(typeof query.priceMin === "number" ? { minPrice: query.priceMin } : {}),
            ...(typeof query.priceMax === "number" ? { maxPrice: query.priceMax } : {}),
            ...(query.onSaleOnly ? { onSale: true } : {}),
            ...(query.inStockOnly ? { availability: "in_stock" } : {}),
            limit: 500,
          }),
        ))
      : [
          await context.searchEngine.search({
            q: "",
            ...(typeof query.priceMin === "number" ? { minPrice: query.priceMin } : {}),
            ...(typeof query.priceMax === "number" ? { maxPrice: query.priceMax } : {}),
            ...(query.onSaleOnly ? { onSale: true } : {}),
            ...(query.inStockOnly ? { availability: "in_stock" } : {}),
            limit: 500,
          }),
        ];

    searchHits = [...new Map(scopedResults.flatMap((result) => result.hits).map((hit) => [hit.id, hit])).values()]
      .filter((document) => searchDocumentMatchesStructuredFilters(document, query, publicStoresById))
      .slice(0, 2500);
  } else {
    const rawSearch = await context.searchEngine.search({
      q: query.q ?? "",
      ...(typeof query.priceMin === "number" ? { minPrice: query.priceMin } : {}),
      ...(typeof query.priceMax === "number" ? { maxPrice: query.priceMax } : {}),
      ...(query.onSaleOnly ? { onSale: true } : {}),
      ...(query.inStockOnly ? { availability: "in_stock" } : {}),
      limit: 200,
    });

    searchHits = rawSearch.hits;
    stores = await context.repository.getStoresByIds([...new Set(searchHits.map((hit) => hit.storeId))]);
    publicStoresById = new Map(stores.map((store) => {
      const publicStore = mapStoreRecordToPublicStoreFast(store);
      return [publicStore.id, publicStore] as const;
    }));
    storesById = new Map(stores.map((store) => [store.id, store]));
  }

  let offerProducts = await mapSearchDocumentsToPublicProducts(searchHits, storesById, { includeImages: false });
  if (normalizedQuery) {
    const expanded = await expandSearchOfferProducts(context, offerProducts, storesById);
    offerProducts = expanded.products;
    storesById = expanded.storesById;
    publicStoresById = expanded.publicStoresById;
  }
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
      return product ? productMatchesCategoryFilter(product, query.categories!) : false;
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

  const visibleOffers = sortUnifiedOffers(dedupeUnifiedOffers(offers));
  const keptOfferIds = new Set(visibleOffers.map((offer) => offer.id));
  offerProducts = offerProducts.filter((product) => keptOfferIds.has(product.id));

  const productGroups = new Map<string, PublicProductIndex[]>();
  for (const product of offerProducts) {
    const current = productGroups.get(product.canonicalProductId) ?? [];
    current.push(product);
    productGroups.set(product.canonicalProductId, current);
  }

  const offersByProductId = new Map<string, PublicUnifiedOffer[]>();
  for (const offer of visibleOffers) {
    const current = offersByProductId.get(offer.productId) ?? [];
    current.push(offer);
    offersByProductId.set(offer.productId, current);
  }

  const hitIndexByOfferId = new Map(searchHits.map((hit, index) => [hit.id, index]));
  const relevanceByOfferId = new Map(
    offerProducts.map((product) => [product.id, scoreUnifiedProductForQuery(normalizedQuery, product)]),
  );

  const productEntries = [...productGroups.entries()].map(([canonicalId, group]) => {
    const groupOffers = offersByProductId.get(canonicalId) ?? [];
    const freshness = Math.max(0, ...groupOffers.map((offer) => new Date(offer.lastSeenAt).getTime()));
    const bestHitIndex = Math.min(
      Number.MAX_SAFE_INTEGER,
      ...group.map((product) => hitIndexByOfferId.get(product.id) ?? Number.MAX_SAFE_INTEGER),
    );
    const relevanceScore = normalizedQuery
      ? Math.max(0, ...group.map((product) => relevanceByOfferId.get(product.id) ?? 0))
      : 0;

    return {
      product: buildUnifiedProduct(group, groupOffers),
      freshness,
      bestHitIndex,
      relevanceScore,
    };
  });

  switch (query.sort) {
    case "price_asc":
      productEntries.sort(
        (a, b) =>
          compareSearchSortIntent(a, b, normalizedQuery) ||
          (a.product.lowestPrice ?? Number.MAX_SAFE_INTEGER) - (b.product.lowestPrice ?? Number.MAX_SAFE_INTEGER),
      );
      break;
    case "price_desc":
      productEntries.sort(
        (a, b) =>
          compareSearchSortIntent(a, b, normalizedQuery) ||
          (b.product.lowestPrice ?? 0) - (a.product.lowestPrice ?? 0),
      );
      break;
    case "rating_desc":
      productEntries.sort(
        (a, b) =>
          compareSearchSortIntent(a, b, normalizedQuery) ||
          (b.product.rating ?? 0) - (a.product.rating ?? 0),
      );
      break;
    case "offers_desc":
      productEntries.sort(
        (a, b) =>
          compareSearchSortIntent(a, b, normalizedQuery) ||
          b.product.offerCount - a.product.offerCount,
      );
      break;
    case "freshness_desc":
      productEntries.sort(
        (a, b) =>
          compareSearchSortIntent(a, b, normalizedQuery) ||
          b.freshness - a.freshness,
      );
      break;
    case "relevance":
    default:
      productEntries.sort(
        (a, b) =>
          b.relevanceScore - a.relevanceScore ||
          a.bestHitIndex - b.bestHitIndex ||
          b.product.inStockCount - a.product.inStockCount ||
          b.product.offerCount - a.product.offerCount,
      );
      break;
  }

  const brandMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  const storeMap = new Map<string, { label: string; count: number }>();
  const cityMap = new Map<string, number>();
  let minPrice = Number.POSITIVE_INFINITY;
  let maxPrice = 0;

  for (const { product } of productEntries) {
    if (product.brand) brandMap.set(product.brand, (brandMap.get(product.brand) ?? 0) + 1);
    if (product.category) categoryMap.set(product.category, (categoryMap.get(product.category) ?? 0) + 1);
    if (typeof product.lowestPrice === "number") minPrice = Math.min(minPrice, product.lowestPrice);
    if (typeof product.highestPrice === "number") maxPrice = Math.max(maxPrice, product.highestPrice);

    for (const offer of offersByProductId.get(product.id) ?? []) {
      const current = storeMap.get(offer.storeId) ?? { label: offer.storeName, count: 0 };
      current.count += 1;
      storeMap.set(offer.storeId, current);
      if (offer.storeCity) cityMap.set(offer.storeCity, (cityMap.get(offer.storeCity) ?? 0) + 1);
    }
  }

  return {
    query: query.q ?? "",
    totalProducts: productEntries.length,
    totalOffers: visibleOffers.length,
    storesCovered: storeMap.size,
    storesScanned: storesById.size,
    durationMs: Date.now() - startedAt,
    products: productEntries.map((entry) => entry.product),
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

const PUBLIC_CATEGORY_ALIASES = new Map<string, string[]>([
  ["computing", ["computing", "حاسبات", "computer", "computers", "laptop", "laptops", "notebook", "macbook"]],
  ["pcparts", ["pcparts", "pc parts", "قطع pc", "قطع", "case", "processor", "motherboard", "gpu", "ram", "ssd"]],
  ["networking", ["networking", "شبكات", "network", "router", "switch", "access point"]],
  ["gaming", ["gaming", "ألعاب", "العاب", "playstation", "xbox", "controller", "game"]],
  ["cameras", ["cameras", "كاميرات", "camera", "canon", "nikon", "lens"]],
  ["printers", ["printers", "طابعات", "printer", "print", "scanner", "scanners"]],
  ["phones", ["phones", "هواتف", "موبايل", "موبايلات", "phone", "mobile", "iphone", "galaxy"]],
  ["chargers", ["chargers", "شواحن", "charger", "charging", "power bank", "powerbank"]],
  ["accessories", ["accessories", "اكسسوارات", "إكسسوارات", "accessory", "case", "cover", "cable", "سماعات"]],
  ["tablets", ["tablets", "تابلت", "tablet", "ipad"]],
  ["smartdevices", ["smartdevices", "smart devices", "أجهزة ذكية", "اجهزة ذكية", "wearable", "watch", "smart watch"]],
]);

function normalizeCategoryFacet(value: string): string {
  return compactText(normalizeText(value)).toLowerCase();
}

function categoryHaystackMatches(categories: string[], selectedCategories: string[]): boolean {
  const haystack = categories
    .filter(Boolean)
    .map((entry) => normalizeCategoryFacet(entry));
  if (haystack.length === 0) return false;

  for (const category of selectedCategories) {
    const normalized = normalizeCategoryFacet(category);
    const aliases = [normalized, ...(PUBLIC_CATEGORY_ALIASES.get(normalized) ?? []).map(normalizeCategoryFacet)];
    if (haystack.some((value) => aliases.some((alias) => value === alias || value.includes(alias) || alias.includes(value)))) {
      return true;
    }
  }

  return false;
}

function productMatchesCategoryFilter(product: PublicProductIndex, categories: string[]): boolean {
  return categoryHaystackMatches([product.category, ...product.categoryPath], categories);
}

function searchDocumentMatchesStructuredFilters(
  document: SearchDocument,
  query: {
    brands?: string[];
    categories?: string[];
    stores?: string[];
    cities?: string[];
    priceMin?: number;
    priceMax?: number;
    inStockOnly?: boolean;
    onSaleOnly?: boolean;
  },
  publicStoresById: Map<string, PublicStore>,
): boolean {
  if (typeof query.priceMin === "number" && (document.livePrice ?? 0) < query.priceMin) return false;
  if (typeof query.priceMax === "number" && (document.livePrice ?? Number.POSITIVE_INFINITY) > query.priceMax) return false;
  if (query.onSaleOnly && !document.onSale) return false;
  if (query.inStockOnly && document.availability !== "in_stock") return false;
  if (query.stores?.length && !query.stores.includes(document.storeId)) return false;
  if (query.brands?.length && (!document.brand || !query.brands.includes(document.brand))) return false;
  if (query.categories?.length && !categoryHaystackMatches(document.categoryPath.split(" > "), query.categories)) return false;

  if (query.cities?.length) {
    const store = publicStoresById.get(document.storeId);
    const storeLocations = [store?.area, store?.cityAr, store?.city].filter(Boolean) as string[];
    if (!storeLocations.some((location) => query.cities!.includes(location))) return false;
  }

  return true;
}

function scoreUnifiedProductForQuery(query: string, product: PublicProductIndex): number {
  if (!query) return 0;

  let score = scoreSearchTextMatch(query, [
    { value: product.name, weight: 5 },
    { value: product.brand, weight: 3.5 },
    { value: product.model, weight: 3 },
    { value: product.sku, weight: 4 },
    { value: product.category, weight: 1.5 },
    { value: product.categoryPath.join(" "), weight: 1.2 },
    { value: product.shopName, weight: 1 },
    { value: product.cityAr ?? product.city, weight: 0.8 },
    { value: product.area, weight: 0.5 },
  ]);
  score += scoreProductIntentMatch(query, {
    title: product.name,
    brand: product.brand,
    model: product.model,
    sku: product.sku,
    category: product.category,
    categoryPath: product.categoryPath.join(" "),
    storeName: product.shopName,
  });

  if (product.inStock) score += 0.5;
  if (
    isPublicPrice(product.originalPriceValue) &&
    isPublicPrice(product.priceValue) &&
    product.originalPriceValue > product.priceValue
  ) {
    score += 0.2;
  }

  return score;
}

function compareSearchSortIntent(
  a: { relevanceScore: number },
  b: { relevanceScore: number },
  query: string,
): number {
  if (!query) return 0;
  const aBand = relevanceBand(a.relevanceScore);
  const bBand = relevanceBand(b.relevanceScore);
  return bBand - aBand;
}

function relevanceBand(score: number): number {
  if (score >= 500) return 5;
  if (score >= 300) return 4;
  if (score >= 180) return 3;
  if (score >= 80) return 2;
  if (score > 0) return 1;
  return 0;
}

async function buildPublicProductPayload(context: CatalogContext, canonicalId: string) {
  const collected = await collectCanonicalAndFamilyProducts(context, canonicalId);
  if (collected.products.length === 0) {
    return { product: null, offers: [] as PublicUnifiedOffer[] };
  }

  const offerProducts = await Promise.all(
    collected.products.map(async (product) => {
      const store = collected.storesById.get(product.storeId);
      if (!store) return null;
      return mapCatalogProductToPublicProduct(store, product, new Map());
    }),
  );
  const normalizedProducts = offerProducts.filter((product): product is PublicProductIndex => Boolean(product));
  const storesPublic = [...collected.storesById.values()].map((store) => mapStoreRecordToPublicStoreFast(store));
  const publicStoresById = new Map(storesPublic.map((store) => [store.id, store]));
  const rawOffers = normalizedProducts
    .map((product) => {
      const store = publicStoresById.get(product.shopId);
      return store ? buildUnifiedOffer(product, store) : null;
    })
    .filter((offer): offer is PublicUnifiedOffer => Boolean(offer));
  const offers = sortUnifiedOffers(dedupeUnifiedOffers(rawOffers));
  if (offers.length === 0) {
    return { product: null, offers: [] as PublicUnifiedOffer[] };
  }
  const product = buildUnifiedProduct(normalizedProducts, offers, collected.products);
  return {
    product: {
      ...product,
      description: extractProductDescription(collected.products, offers.length),
      specs: extractProductSpecs(collected.products, offers.length),
    },
    offers,
  };
}

export async function buildPublicProductOffers(context: CatalogContext, canonicalId: string) {
  const payload = await buildPublicProductPayload(context, canonicalId);
  return payload.offers;
}

export async function buildPublicProductDetail(context: CatalogContext, canonicalId: string) {
  const payload = await buildPublicProductPayload(context, canonicalId);
  return payload.product;
}

export async function buildPublicProductFull(context: CatalogContext, canonicalId: string) {
  const payload = await buildPublicProductPayload(context, canonicalId);
  if (!payload.product) return null;
  return payload;
}
