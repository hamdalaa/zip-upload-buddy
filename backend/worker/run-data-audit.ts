import fs from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { catalogConfig } from "../shared/config.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    baseUrl: (get("--base-url") ?? `http://${catalogConfig.bindHost}:${catalogConfig.port}`).replace(/\/+$/, ""),
    jsonOut: get("--json-out"),
    markdownOut: get("--markdown-out"),
  };
}

type DbRow = Record<string, unknown>;

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function asOptionalString(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function compactText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىئ]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function extractHostname(url?: string) {
  if (!url) return undefined;
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

function extractRootDomain(hostname?: string) {
  if (!hostname) return undefined;
  const parts = hostname.split(".").filter(Boolean);
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

function extractGoogleCid(url?: string) {
  return url?.match(/[?&]cid=(\d+)/)?.[1];
}

async function timeFetch(url: string) {
  const startedAt = Date.now();
  try {
    const response = await fetch(url);
    const body = await response.text();
    return {
      url,
      status: response.status,
      ok: response.ok,
      ms: Date.now() - startedAt,
      bytes: body.length,
      cacheControl: response.headers.get("cache-control"),
      contentType: response.headers.get("content-type"),
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      ms: Date.now() - startedAt,
    };
  }
}

function topCounts(values: string[], limit = 10) {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ar"))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

function renderMarkdown(report: Record<string, unknown>) {
  const counts = report.counts as Record<string, unknown>;
  const quality = report.quality as Record<string, unknown>;
  const api = report.api as Record<string, unknown>;
  const duplicates = report.duplicates as Record<string, unknown>;
  const runtime = report.runtime as Record<string, unknown>;

  const endpointLines = Object.entries(api)
    .map(([key, value]) => {
      const entry = value as Record<string, unknown>;
      if (entry.error) return `- ${key}: error - ${entry.error}`;
      return `- ${key}: ${entry.status} in ${entry.ms}ms, ${entry.bytes} bytes`;
    })
    .join("\n");

  return [
    "# Catalog Data Audit",
    "",
    `Generated: ${runtime.generatedAt}`,
    `Database: ${runtime.sqlitePath}`,
    `Base URL: ${runtime.baseUrl}`,
    "",
    "## Core Counts",
    `- Stores total: ${counts.storesTotal}`,
    `- Stores with website: ${counts.storesWithWebsite}`,
    `- Stores with Google Maps: ${counts.storesWithGoogleMaps}`,
    `- Stores with products: ${counts.storesWithProducts}`,
    `- Indexed stores by status: ${counts.storesStatusIndexed}`,
    `- Stores with products but not indexed: ${counts.storesWithProductsButNotIndexed}`,
    `- Products total: ${counts.productsTotal}`,
    `- Search documents total: ${counts.searchDocumentsTotal}`,
    "",
    "## Data Quality",
    `- Stores missing city: ${quality.storesMissingCity}`,
    `- Stores missing area: ${quality.storesMissingArea}`,
    `- Stores missing phone: ${quality.storesMissingPhone}`,
    `- Stores missing website: ${quality.storesMissingWebsite}`,
    `- Stores missing maps: ${quality.storesMissingGoogleMaps}`,
    `- Stores missing rating: ${quality.storesMissingRating}`,
    `- Stores missing reviews: ${quality.storesMissingReviewCount}`,
    `- Products missing image: ${quality.productsMissingImage}`,
    `- Products missing price: ${quality.productsMissingPrice}`,
    `- Products missing brand: ${quality.productsMissingBrand}`,
    `- Products missing category path: ${quality.productsMissingCategoryPath}`,
    `- Catalog products missing from search index: ${quality.productsMissingSearchDocument}`,
    `- Search documents missing source product: ${quality.searchDocumentsMissingCatalogProduct}`,
    `- Products with unsupported currency: ${quality.productsUnsupportedCurrency}`,
    `- Products with tiny IQD prices: ${quality.productsTinyIqdPrice}`,
    `- Products on blocked public-offer domains: ${quality.productsBlockedOfferDomain}`,
    "",
    "## Duplicates",
    `- Duplicate root domains: ${JSON.stringify(duplicates.rootDomains)}`,
    `- Duplicate Google CIDs: ${JSON.stringify(duplicates.googleCids)}`,
    `- Duplicate normalized names: ${JSON.stringify(duplicates.normalizedNames)}`,
    `- Duplicate website hosts: ${JSON.stringify(duplicates.websiteHosts)}`,
    "",
    "## Public API Checks",
    endpointLines,
    "",
  ].join("\n");
}

const args = parseArgs(process.argv.slice(2));
const db = new DatabaseSync(catalogConfig.database.sqlitePath);

const stores = db.prepare(`
  SELECT id, place_id, name, status, city, city_ar, area, phone, website, google_maps_url, normalized_name
  FROM stores
`).all() as DbRow[];
const rawLookupRows = db.prepare(`
  SELECT lookup_key, store_payload
  FROM public_store_lookup
`).all() as DbRow[];
const ratingByStoreId = new Map<string, { rating?: number; reviewCount?: number }>();
for (const row of rawLookupRows) {
  const lookupKey = String(row.lookup_key ?? "");
  const payload = (() => {
    try {
      return JSON.parse(String(row.store_payload ?? "{}")) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();
  ratingByStoreId.set(lookupKey, {
    rating: typeof payload.rating === "number" ? payload.rating : undefined,
    reviewCount: typeof payload.reviewCount === "number" ? payload.reviewCount : undefined,
  });
}

const counts = {
  storesTotal: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores").get() as DbRow).c),
  storesWithWebsite: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores WHERE website IS NOT NULL AND website != ''").get() as DbRow).c),
  storesWithGoogleMaps: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores WHERE google_maps_url IS NOT NULL AND google_maps_url != ''").get() as DbRow).c),
  storesWithProducts: asNumber((db.prepare("SELECT COUNT(*) AS c FROM store_size_summaries WHERE indexed_product_count > 0").get() as DbRow).c),
  storesStatusIndexed: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores WHERE status = 'indexed'").get() as DbRow).c),
  storesWithProductsButNotIndexed: asNumber((db.prepare(`
    SELECT COUNT(*) AS c
    FROM stores s
    JOIN store_size_summaries sz ON sz.store_id = s.id
    WHERE sz.indexed_product_count > 0 AND s.status != 'indexed'
  `).get() as DbRow).c),
  productsTotal: asNumber((db.prepare("SELECT COUNT(*) AS c FROM catalog_products").get() as DbRow).c),
  searchDocumentsTotal: asNumber((db.prepare("SELECT COUNT(*) AS c FROM search_documents").get() as DbRow).c),
  offersTotal: asNumber((db.prepare("SELECT COUNT(*) AS c FROM offers").get() as DbRow).c),
  variantsTotal: asNumber((db.prepare("SELECT COUNT(*) AS c FROM product_variants").get() as DbRow).c),
  storeStatuses: db.prepare("SELECT status, COUNT(*) AS c FROM stores GROUP BY status ORDER BY c DESC").all(),
};

const quality = {
  storesMissingCity: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores WHERE (city IS NULL OR city = '') AND (city_ar IS NULL OR city_ar = '')").get() as DbRow).c),
  storesMissingArea: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores WHERE area IS NULL OR area = ''").get() as DbRow).c),
  storesMissingPhone: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores WHERE phone IS NULL OR phone = ''").get() as DbRow).c),
  storesMissingWebsite: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores WHERE website IS NULL OR website = ''").get() as DbRow).c),
  storesMissingGoogleMaps: asNumber((db.prepare("SELECT COUNT(*) AS c FROM stores WHERE google_maps_url IS NULL OR google_maps_url = ''").get() as DbRow).c),
  storesMissingRating: stores.filter((store) => {
    const key = String(store.id);
    const placeId = asOptionalString(store.place_id);
    return ratingByStoreId.get(key)?.rating == null && (!placeId || ratingByStoreId.get(placeId)?.rating == null);
  }).length,
  storesMissingReviewCount: stores.filter((store) => {
    const key = String(store.id);
    const placeId = asOptionalString(store.place_id);
    return (ratingByStoreId.get(key)?.reviewCount ?? ratingByStoreId.get(placeId ?? "")?.reviewCount ?? 0) <= 0;
  }).length,
  productsMissingImage: asNumber((db.prepare(`
    SELECT COUNT(*) AS c
    FROM catalog_products
    WHERE (image_url IS NULL OR image_url = '')
      AND (primary_image_url IS NULL OR primary_image_url = '')
  `).get() as DbRow).c),
  productsMissingPrice: asNumber((db.prepare("SELECT COUNT(*) AS c FROM catalog_products WHERE live_price IS NULL").get() as DbRow).c),
  productsMissingBrand: asNumber((db.prepare("SELECT COUNT(*) AS c FROM catalog_products WHERE brand IS NULL OR brand = ''").get() as DbRow).c),
  productsMissingCategoryPath: asNumber((db.prepare("SELECT COUNT(*) AS c FROM catalog_products WHERE category_path IS NULL OR category_path = '[]'").get() as DbRow).c),
  productsMissingSearchDocument: asNumber((db.prepare(`
    SELECT COUNT(*) AS c
    FROM catalog_products p
    LEFT JOIN search_documents sd ON sd.id = p.store_id || ':' || p.source_product_id
    WHERE sd.id IS NULL
  `).get() as DbRow).c),
  searchDocumentsMissingCatalogProduct: asNumber((db.prepare(`
    SELECT COUNT(*) AS c
    FROM search_documents sd
    LEFT JOIN catalog_products p ON sd.id = p.store_id || ':' || p.source_product_id
    WHERE p.source_product_id IS NULL
  `).get() as DbRow).c),
  productsUnsupportedCurrency: asNumber((db.prepare(`
    SELECT COUNT(*) AS c
    FROM catalog_products
    WHERE currency IS NOT NULL
      AND currency != ''
      AND upper(currency) NOT IN ('IQD', 'USD')
  `).get() as DbRow).c),
  productsTinyIqdPrice: asNumber((db.prepare(`
    SELECT COUNT(*) AS c
    FROM catalog_products
    WHERE upper(COALESCE(currency, 'IQD')) = 'IQD'
      AND live_price IS NOT NULL
      AND live_price > 0
      AND live_price < 1000
  `).get() as DbRow).c),
  productsBlockedOfferDomain: asNumber((db.prepare(`
    SELECT COUNT(*) AS c
    FROM catalog_products
    WHERE source_url LIKE '%almatajiralthalath.com%'
       OR source_url LIKE '%apple.com/%'
       OR source_url LIKE '%samsung.com/%'
       OR source_url LIKE '%lg.com/%'
       OR source_url LIKE '%hikvision.com/%'
  `).get() as DbRow).c),
};

const sampleBaghdadStore = db.prepare(`
  SELECT s.id, s.name
  FROM stores s
  JOIN store_size_summaries sz ON sz.store_id = s.id
  WHERE sz.indexed_product_count > 0 AND (s.city = 'Baghdad' OR s.city_ar = 'بغداد')
  ORDER BY sz.indexed_product_count DESC
  LIMIT 1
`).get() as DbRow | undefined;

const sampleBasraStore = db.prepare(`
  SELECT s.id, s.name
  FROM stores s
  JOIN store_size_summaries sz ON sz.store_id = s.id
  WHERE sz.indexed_product_count > 0 AND (s.city = 'Basra' OR s.city_ar LIKE '%بص%')
  ORDER BY sz.indexed_product_count DESC
  LIMIT 1
`).get() as DbRow | undefined;

const api = {
  bootstrap: await timeFetch(`${args.baseUrl}/public/bootstrap`),
  bootstrapLite: await timeFetch(`${args.baseUrl}/public/bootstrap-lite`),
  searchIphone: await timeFetch(`${args.baseUrl}/public/search?q=iphone`),
  storeAlNabaaSummary: await timeFetch(`${args.baseUrl}/public/stores/scraped_store_alnabaa_com/summary`),
  storeAlNabaaProducts: await timeFetch(`${args.baseUrl}/public/stores/scraped_store_alnabaa_com/products?limit=12`),
  storeAlNabaaDetail: await timeFetch(`${args.baseUrl}/public/stores/scraped_store_alnabaa_com`),
  brandAppleSummary: await timeFetch(`${args.baseUrl}/public/brands/apple/summary`),
  brandAppleProducts: await timeFetch(`${args.baseUrl}/public/brands/apple/products?limit=12`),
  brandAppleDetail: await timeFetch(`${args.baseUrl}/public/brands/apple`),
  cities: await timeFetch(`${args.baseUrl}/public/cities`),
  cityBaghdad: await timeFetch(`${args.baseUrl}/public/cities/baghdad`),
};

const report = {
  runtime: {
    generatedAt: new Date().toISOString(),
    sqlitePath: catalogConfig.database.sqlitePath,
    baseUrl: args.baseUrl,
  },
  counts,
  quality,
  supportCoverage: {
    publicCityIndex: asNumber((db.prepare("SELECT COUNT(*) AS c FROM public_city_index").get() as DbRow).c),
    publicStoreLookup: asNumber((db.prepare("SELECT COUNT(*) AS c FROM public_store_lookup").get() as DbRow).c),
    publicStreetAreaLookup: asNumber((db.prepare("SELECT COUNT(*) AS c FROM public_street_area_lookup").get() as DbRow).c),
  },
  duplicates: {
    rootDomains: topCounts(stores.map((store) => extractRootDomain(extractHostname(asOptionalString(store.website))) ?? "").filter(Boolean)),
    googleCids: topCounts(stores.map((store) => extractGoogleCid(asOptionalString(store.google_maps_url)) ?? "").filter(Boolean)),
    normalizedNames: topCounts(stores.map((store) => String(store.normalized_name ?? compactText(String(store.name ?? "")))).filter(Boolean)),
    websiteHosts: topCounts(stores.map((store) => extractHostname(asOptionalString(store.website)) ?? "").filter(Boolean)),
  },
  samples: {
    alNabaa: { id: "scraped_store_alnabaa_com", name: "Al Nabaa Store" },
    dnaIraq: { id: "scraped_www_dna_iraq_com", name: "DNA Iraq" },
    pointIraq: { id: "scraped_pointiraq_com", name: "Pointiraq" },
    miswag: { id: "manual_miswag", name: "Miswag" },
    baghdad: sampleBaghdadStore ? { id: String(sampleBaghdadStore.id), name: String(sampleBaghdadStore.name) } : null,
    basra: sampleBasraStore ? { id: String(sampleBasraStore.id), name: String(sampleBasraStore.name) } : null,
  },
  api,
};

const markdown = renderMarkdown(report);

if (args.jsonOut) {
  const target = path.resolve(args.jsonOut);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(report, null, 2));
}

if (args.markdownOut) {
  const target = path.resolve(args.markdownOut);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, markdown);
}

console.log(markdown);
