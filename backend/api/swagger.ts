import fs from "node:fs/promises";
import swagger from "@fastify/swagger";
import path from "node:path";
import { createRequire } from "node:module";
import type { FastifyInstance, preHandlerHookHandler } from "fastify";
import { catalogConfig } from "../shared/config.js";

const require = createRequire(import.meta.url);
const swaggerUiPackageDir = path.dirname(require.resolve("@fastify/swagger-ui/package.json"));
const swaggerUiStaticDir = path.join(swaggerUiPackageDir, "static");

const genericObjectSchema = {
  type: "object",
  additionalProperties: true,
} as const;

const genericArraySchema = {
  type: "array",
  items: genericObjectSchema,
} as const;

const errorResponseSchema = {
  type: "object",
  properties: {
    error: { type: "string" },
    bucket: { type: "string" },
    requiredScopes: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["error"],
} as const;

const idParamSchema = {
  type: "object",
  properties: {
    id: { type: "string" },
  },
  required: ["id"],
} as const;

const slugParamSchema = {
  type: "object",
  properties: {
    slug: { type: "string" },
  },
  required: ["slug"],
} as const;

const urlSchema = {
  type: "string",
  format: "uri",
  example: "https://example.com/",
} as const;

const dateTimeSchema = {
  type: "string",
  format: "date-time",
  example: "2026-04-21T00:00:00.000Z",
} as const;

const stringArraySchema = {
  type: "array",
  items: { type: "string" },
} as const;

const stringMapSchema = {
  type: "object",
  additionalProperties: { type: "string" },
} as const;

const stockStateSchema = {
  type: "string",
  enum: ["in_stock", "out_of_stock", "preorder", "unknown"],
  example: "in_stock",
} as const;

const verificationStatusSchema = {
  type: "string",
  enum: ["verified", "pending", "unverified"],
  example: "verified",
} as const;

const websiteTypeSchema = {
  type: "string",
  enum: ["official", "social", "missing"],
  example: "official",
} as const;

const storeStatusSchema = {
  type: "string",
  enum: ["discovered", "probe_pending", "indexable", "indexed", "social_only", "blocked", "failed"],
  example: "indexed",
} as const;

const connectorTypeSchema = {
  type: "string",
  enum: [
    "shopify",
    "threed_iraq",
    "tlcommerce_api",
    "alwafi_api",
    "masterstore_next",
    "jibalzone_storefront",
    "miswag_nuxt",
    "magento_vsf",
    "woocommerce",
    "generic_json_catalog",
    "generic_sitemap_html",
    "social_only",
    "unknown",
  ],
  example: "woocommerce",
} as const;

const runtimeModeSchema = {
  type: "string",
  enum: ["full_sqlite_api", "full_postgres_api", "memory_api", "memory_subset_api"],
  example: "full_sqlite_api",
} as const;

const runtimeHealthSchema = {
  type: "object",
  properties: {
    mode: runtimeModeSchema,
    scope: { type: "string", enum: ["all", "subset"], example: "all" },
    scopedStoreCount: { type: "integer", example: 0 },
  },
  required: ["mode", "scope", "scopedStoreCount"],
} as const;

const reviewSampleSchema = {
  type: "object",
  properties: {
    rating: { type: "number", example: 4.7 },
    relativePublishTime: { type: "string", example: "قبل أسبوع" },
    publishTime: dateTimeSchema,
    text: { type: "string", example: "خدمة ممتازة وتعامل راقٍ." },
    authorName: { type: "string", example: "Ali Ahmed" },
    authorPhotoUrl: urlSchema,
    reviewGoogleMapsUrl: urlSchema,
  },
} as const;

const quickSignalsSchema = {
  type: "object",
  properties: {
    has_website: { type: "boolean", example: true },
    website_type: websiteTypeSchema,
    has_google_maps: { type: "boolean", example: true },
    has_rating: { type: "boolean", example: true },
    has_reviews: { type: "boolean", example: true },
    has_photos: { type: "boolean", example: true },
    open_now: { type: "boolean", example: true },
    business_status: { type: "string", example: "OPERATIONAL" },
  },
} as const;

const publicStoreSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "manual_icenter" },
    slug: { type: "string", example: "icenter-iraq" },
    seedKey: { type: "string", example: "manual_icenter" },
    name: { type: "string", example: "iCenter Iraq" },
    city: { type: "string", example: "Erbil" },
    cityAr: { type: "string", example: "أربيل" },
    citySlug: { type: "string", example: "erbil" },
    area: { type: "string", example: "Ankawa" },
    category: { type: "string", example: "Electronics" },
    categories: stringArraySchema,
    address: { type: "string", example: "Ankawa, Erbil, Iraq" },
    lat: { type: "number", example: 36.2081 },
    lng: { type: "number", example: 43.9981 },
    googleMapsUrl: urlSchema,
    website: urlSchema,
    phone: { type: "string", example: "0750 894 2096" },
    whatsapp: { type: "string", example: "https://wa.me/9647508942096" },
    discoverySource: { type: "string", example: "city_seed" },
    verified: { type: "boolean", example: true },
    verificationStatus: verificationStatusSchema,
    notes: { type: "string", example: "manual intake" },
    imageUrl: urlSchema,
    gallery: {
      type: "array",
      items: urlSchema,
    },
    rating: { type: "number", example: 4.6 },
    reviewCount: { type: "integer", example: 128 },
    editorialSummary: { type: "string", example: "محل معروف للأجهزة الأصلية." },
    reviewSummary: { type: "string", example: "الزبائن يذكرون جودة الخدمة والأسعار." },
    reviewsSample: {
      type: "array",
      items: reviewSampleSchema,
    },
    quickSignals: quickSignalsSchema,
    openNow: { type: "boolean", example: true },
    businessStatus: { type: "string", example: "OPERATIONAL" },
    workingHours: stringArraySchema,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
    archivedAt: dateTimeSchema,
    duplicateOf: { type: "string", example: "store_other_branch" },
    featured: { type: "boolean", example: true },
    productCount: { type: "integer", example: 248 },
    offerCount: { type: "integer", example: 14 },
    lastSyncAt: dateTimeSchema,
    lastProbeAt: dateTimeSchema,
    sourceStatus: storeStatusSchema,
  },
  required: ["id", "slug", "seedKey", "name", "area", "category", "categories", "discoverySource", "verified", "verificationStatus", "createdAt", "updatedAt"],
  example: {
    id: "manual_icenter",
    slug: "icenter-iraq",
    seedKey: "manual_icenter",
    name: "iCenter Iraq",
    city: "Erbil",
    cityAr: "أربيل",
    citySlug: "erbil",
    area: "Ankawa",
    category: "Electronics",
    categories: ["Electronics", "Computing"],
    website: "https://www.icenter-iraq.com/",
    discoverySource: "city_seed",
    verified: true,
    verificationStatus: "verified",
    createdAt: "2026-04-21T00:00:00.000Z",
    updatedAt: "2026-04-21T00:00:00.000Z",
    featured: true,
    productCount: 248,
    offerCount: 14,
    sourceStatus: "indexed",
  },
} as const;

const publicProductIndexSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "manual_icenter:iphone-16-pro" },
    canonicalProductId: { type: "string", example: "unified_d91ab3c22b06e76b4ee9cb0c" },
    shopId: { type: "string", example: "manual_icenter" },
    shopName: { type: "string", example: "iCenter Iraq" },
    city: { type: "string", example: "Erbil" },
    cityAr: { type: "string", example: "أربيل" },
    citySlug: { type: "string", example: "erbil" },
    area: { type: "string", example: "Ankawa" },
    category: { type: "string", example: "Phones" },
    categoryPath: stringArraySchema,
    name: { type: "string", example: "iPhone 16 Pro 256GB" },
    slug: { type: "string", example: "iphone-16-pro-256gb" },
    sku: { type: "string", example: "IP16P-256" },
    brand: { type: "string", example: "Apple" },
    model: { type: "string", example: "iPhone 16 Pro" },
    priceValue: { type: "number", example: 1850000 },
    priceText: { type: "string", example: "1,850,000 IQD" },
    originalPriceValue: { type: "number", example: 1925000 },
    productUrl: urlSchema,
    imageUrl: urlSchema,
    rating: { type: "number", example: 4.6 },
    reviewCount: { type: "integer", example: 128 },
    inStock: { type: "boolean", example: true },
    stockState: stockStateSchema,
    currency: { type: "string", example: "IQD" },
    offerLabel: { type: "string", example: "Sale" },
    crawledAt: dateTimeSchema,
  },
  required: ["id", "canonicalProductId", "shopId", "shopName", "area", "category", "categoryPath", "name", "slug", "stockState", "currency", "crawledAt"],
} as const;

const publicBrandSummarySchema = {
  type: "object",
  properties: {
    slug: { type: "string", example: "apple" },
    brandName: { type: "string", example: "Apple" },
    dealerName: { type: "string", example: "أبرز ظهور: iCenter Iraq" },
    contactPhones: stringArraySchema,
    cities: stringArraySchema,
    coverage: { type: "string", example: "١٢٤ منتج عبر ٦ محلات" },
    verificationStatus: verificationStatusSchema,
    storeCount: { type: "integer", example: 6 },
    productCount: { type: "integer", example: 124 },
  },
  required: ["slug", "brandName", "dealerName", "contactPhones", "cities", "coverage", "verificationStatus", "storeCount", "productCount"],
} as const;

const cityIndexEntrySchema = {
  type: "object",
  properties: {
    slug: { type: "string", example: "baghdad" },
    city: { type: "string", example: "Baghdad" },
    cityAr: { type: "string", example: "بغداد" },
    count: { type: "integer", example: 842 },
  },
  required: ["slug", "city", "cityAr", "count"],
} as const;

const cityStoreSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "city_baghdad_abc123" },
    place_id: { type: "string", example: "ChIJ..." },
    name: { type: "string", example: "iCenter Iraq" },
    city: { type: "string", example: "Baghdad" },
    area: { type: "string", example: "Karrada" },
    category: { type: "string", example: "Electronics" },
    suggested_category: { type: "string", example: "Computing" },
    address: { type: "string", example: "Baghdad, Iraq" },
    phone: { type: "string", example: "0750 894 2096" },
    whatsapp: { type: "string", example: "https://wa.me/9647508942096" },
    website: urlSchema,
    websiteType: websiteTypeSchema,
    googleMapsUrl: urlSchema,
    lat: { type: "number", example: 33.3152 },
    lng: { type: "number", example: 44.3661 },
    rating: { type: "number", example: 4.5 },
    reviewCount: { type: "integer", example: 95 },
    imageUrl: urlSchema,
    gallery: {
      type: "array",
      items: urlSchema,
    },
    openNow: { type: "boolean", example: true },
    businessStatus: { type: "string", example: "OPERATIONAL" },
    workingHours: stringArraySchema,
    trustBadges: stringArraySchema,
    primaryType: { type: "string", example: "electronics_store" },
    editorialSummary: { type: "string" },
    reviewSummary: { type: "string" },
    reviewsSample: {
      type: "array",
      items: reviewSampleSchema,
    },
    quickSignals: quickSignalsSchema,
    lastUpdatedAt: dateTimeSchema,
  },
  required: ["id", "name", "city"],
} as const;

const cityFileSchema = {
  type: "object",
  properties: {
    city: { type: "string", example: "Baghdad" },
    cityAr: { type: "string", example: "بغداد" },
    slug: { type: "string", example: "baghdad" },
    count: { type: "integer", example: 842 },
    stores: {
      type: "array",
      items: cityStoreSchema,
    },
  },
  required: ["city", "cityAr", "slug", "count", "stores"],
} as const;

const connectorCapabilitiesSchema = {
  type: "object",
  properties: {
    supportsStructuredApi: { type: "boolean", example: true },
    supportsHtmlCatalog: { type: "boolean", example: true },
    supportsOffers: { type: "boolean", example: true },
    supportsVariants: { type: "boolean", example: true },
    supportsMarketplaceContext: { type: "boolean", example: false },
    fallbackToBrowser: { type: "boolean", example: false },
  },
  required: ["supportsStructuredApi", "supportsHtmlCatalog", "supportsOffers", "supportsVariants", "supportsMarketplaceContext", "fallbackToBrowser"],
} as const;

const connectorProfileSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "prof_123" },
    storeId: { type: "string", example: "manual_icenter" },
    connectorType: connectorTypeSchema,
    platformConfidence: { type: "number", example: 0.99 },
    platformSignals: stringArraySchema,
    capabilities: connectorCapabilitiesSchema,
    syncStrategy: {
      type: "object",
      properties: {
        priorityTier: { type: "string", enum: ["hourly", "six_hour", "nightly", "weekly"], example: "six_hour" },
        probeFirst: { type: "boolean", example: true },
        deltaHours: { type: "integer", example: 6 },
        fullSyncHours: { type: "integer", example: 24 },
      },
      required: ["priorityTier", "probeFirst", "deltaHours", "fullSyncHours"],
    },
    endpoints: {
      type: "object",
      properties: {
        products: urlSchema,
        search: urlSchema,
        categories: urlSchema,
        sitemap: urlSchema,
      },
    },
    lastProbeStatus: { type: "string", enum: ["ok", "failed"], example: "ok" },
    lastProbeAt: dateTimeSchema,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  },
  required: ["id", "storeId", "connectorType", "platformConfidence", "platformSignals", "capabilities", "syncStrategy", "endpoints", "lastProbeStatus", "lastProbeAt", "createdAt", "updatedAt"],
} as const;

const storeSizeSummarySchema = {
  type: "object",
  properties: {
    storeId: { type: "string", example: "manual_icenter" },
    indexedProductCount: { type: "integer", example: 248 },
    indexedVariantCount: { type: "integer", example: 51 },
    activeOfferCount: { type: "integer", example: 14 },
    categoryCount: { type: "integer", example: 9 },
    lastSuccessfulSyncAt: dateTimeSchema,
    estimatedCatalogSize: { type: "integer", example: 248 },
    coveragePct: { type: "number", example: 100 },
    syncPriorityTier: { type: "string", enum: ["hourly", "six_hour", "nightly", "weekly"], example: "six_hour" },
    computedAt: dateTimeSchema,
  },
  required: ["storeId", "indexedProductCount", "indexedVariantCount", "activeOfferCount", "categoryCount", "estimatedCatalogSize", "coveragePct", "syncPriorityTier", "computedAt"],
} as const;

const storeSourceSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "src:manual_icenter:website" },
    shopId: { type: "string", example: "manual_icenter" },
    sourceType: { type: "string", enum: ["website", "google_maps", "manual"], example: "website" },
    sourceUrl: urlSchema,
    status: { type: "string", enum: ["ok", "failed", "pending"], example: "ok" },
    lastCrawledAt: dateTimeSchema,
    pagesVisited: { type: "integer", example: 248 },
  },
  required: ["id", "shopId", "sourceType", "sourceUrl", "status", "pagesVisited"],
} as const;

const publicBootstrapResponseSchema = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        totalStores: { type: "integer", example: 3113 },
        indexedStores: { type: "integer", example: 12 },
        totalProducts: { type: "integer", example: 87038 },
        lastSyncAt: dateTimeSchema,
      },
      required: ["totalStores", "indexedStores", "totalProducts"],
    },
    stores: {
      type: "array",
      items: publicStoreSchema,
    },
    brands: {
      type: "array",
      items: publicBrandSummarySchema,
    },
    home: {
      type: "object",
      properties: {
        deals: { type: "array", items: publicProductIndexSchema },
        trending: { type: "array", items: publicProductIndexSchema },
        latest: { type: "array", items: publicProductIndexSchema },
      },
      required: ["deals", "trending", "latest"],
    },
  },
  required: ["summary", "stores", "brands", "home"],
} as const;

const publicCatalogProductsResponseSchema = {
  type: "object",
  properties: {
    total: { type: "integer", example: 87038 },
    limit: { type: "integer", example: 2000 },
    offset: { type: "integer", example: 0 },
    items: {
      type: "array",
      items: publicProductIndexSchema,
    },
  },
  required: ["total", "limit", "offset", "items"],
} as const;

const publicProductsByIdsResponseSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: publicProductIndexSchema,
    },
  },
  required: ["items"],
} as const;

const publicStoreDetailResponseSchema = {
  type: "object",
  properties: {
    store: publicStoreSchema,
    products: {
      type: "array",
      items: publicProductIndexSchema,
    },
    sources: {
      type: "array",
      items: storeSourceSchema,
    },
    size: storeSizeSummarySchema,
    connectorProfile: connectorProfileSchema,
  },
  required: ["store", "products", "sources"],
} as const;

const publicBrandDetailResponseSchema = {
  type: "object",
  properties: {
    brand: publicBrandSummarySchema,
    stores: {
      type: "array",
      items: publicStoreSchema,
    },
    products: {
      type: "array",
      items: publicProductIndexSchema,
    },
  },
  required: ["brand", "stores", "products"],
} as const;

const publicBootstrapLiteResponseSchema = {
  type: "object",
  properties: {
    summary: publicBootstrapResponseSchema.properties.summary,
    featuredShops: {
      type: "array",
      items: publicStoreSchema,
    },
    topRatedShops: {
      type: "array",
      items: publicStoreSchema,
    },
    brands: {
      type: "array",
      items: publicBrandSummarySchema,
    },
    home: publicBootstrapResponseSchema.properties.home,
  },
  required: ["summary", "featuredShops", "topRatedShops", "brands", "home"],
} as const;

const publicStoreSummaryResponseSchema = {
  type: "object",
  properties: {
    store: publicStoreSchema,
    size: storeSizeSummarySchema,
    sourceCount: { type: "integer", example: 2 },
    connectorProfile: connectorProfileSchema,
  },
  required: ["store", "sourceCount"],
} as const;

const publicBrandSummaryResponseSchema = {
  type: "object",
  properties: {
    brand: publicBrandSummarySchema,
    topStores: {
      type: "array",
      items: publicStoreSchema,
    },
    totalStores: { type: "integer", example: 12 },
    totalProducts: { type: "integer", example: 1240 },
  },
  required: ["brand", "topStores", "totalStores", "totalProducts"],
} as const;

const publicUnifiedOfferSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "manual_icenter:iphone-16-pro" },
    productId: { type: "string", example: "unified_d91ab3c22b06e76b4ee9cb0c" },
    storeId: { type: "string", example: "manual_icenter" },
    storeName: { type: "string", example: "iCenter Iraq" },
    storeCity: { type: "string", example: "أربيل" },
    storeRating: { type: "number", example: 4.6 },
    verified: { type: "boolean", example: true },
    officialDealer: { type: "boolean", example: false },
    price: { type: "number", example: 1850000 },
    originalPrice: { type: "number", example: 1925000 },
    currency: { type: "string", enum: ["IQD", "USD"], example: "IQD" },
    stock: stockStateSchema,
    productUrl: urlSchema,
    lastSeenAt: dateTimeSchema,
    freshnessLabel: { type: "string", example: "Updated 2 hours ago" },
  },
  required: ["id", "productId", "storeId", "storeName", "price", "currency", "stock", "productUrl", "lastSeenAt"],
} as const;

const publicUnifiedProductSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "unified_d91ab3c22b06e76b4ee9cb0c" },
    title: { type: "string", example: "iPhone 16 Pro 256GB" },
    brand: { type: "string", example: "Apple" },
    model: { type: "string", example: "iPhone 16 Pro" },
    category: { type: "string", example: "Phones" },
    description: { type: "string", example: "Latest Apple flagship available across multiple Iraqi stores." },
    images: {
      type: "array",
      items: urlSchema,
    },
    specs: {
      type: "object",
      additionalProperties: { type: "string" },
    },
    rating: { type: "number", example: 4.6 },
    reviewCount: { type: "integer", example: 128 },
    lowestPrice: { type: "number", example: 1850000 },
    highestPrice: { type: "number", example: 1995000 },
    priceCurrency: { type: "string", enum: ["IQD", "USD"], example: "IQD" },
    offerCount: { type: "integer", example: 4 },
    inStockCount: { type: "integer", example: 3 },
    bestOfferId: { type: "string", example: "manual_icenter:iphone-16-pro" },
  },
  required: ["id", "title", "images", "offerCount", "inStockCount"],
} as const;

const publicSearchFacetSchema = {
  type: "object",
  properties: {
    key: { type: "string", example: "apple" },
    label: { type: "string", example: "Apple" },
    count: { type: "integer", example: 24 },
  },
  required: ["key", "label", "count"],
} as const;

const publicSearchResponseSchema = {
  type: "object",
  properties: {
    query: { type: "string", example: "iphone" },
    totalProducts: { type: "integer", example: 24 },
    totalOffers: { type: "integer", example: 31 },
    storesCovered: { type: "integer", example: 6 },
    storesScanned: { type: "integer", example: 31 },
    durationMs: { type: "integer", example: 18 },
    products: {
      type: "array",
      items: publicUnifiedProductSchema,
    },
    facets: {
      type: "object",
      properties: {
        brands: { type: "array", items: publicSearchFacetSchema },
        categories: { type: "array", items: publicSearchFacetSchema },
        stores: { type: "array", items: publicSearchFacetSchema },
        cities: { type: "array", items: publicSearchFacetSchema },
        priceRange: {
          type: "object",
          properties: {
            min: { type: "number", example: 1850000 },
            max: { type: "number", example: 1995000 },
          },
          required: ["min", "max"],
        },
      },
      required: ["brands", "categories", "stores", "cities", "priceRange"],
    },
  },
  required: ["query", "totalProducts", "totalOffers", "storesCovered", "storesScanned", "durationMs", "products", "facets"],
} as const;

const publicProductFullResponseSchema = {
  type: "object",
  properties: {
    product: publicUnifiedProductSchema,
    offers: {
      type: "array",
      items: publicUnifiedOfferSchema,
    },
  },
  required: ["product", "offers"],
} as const;

const internalStoresResponseSchema = {
  type: "object",
  properties: {
    total: { type: "integer", example: 3113 },
    limit: { type: "integer", example: 100 },
    offset: { type: "integer", example: 0 },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          store: {
            type: "object",
            additionalProperties: true,
          },
          connectorProfile: connectorProfileSchema,
          size: storeSizeSummarySchema,
        },
        required: ["store"],
      },
    },
  },
  required: ["total", "limit", "offset", "items"],
} as const;

const enqueueResponseSchema = {
  type: "object",
  properties: {
    enqueued: { type: "boolean", example: true },
    queue: { type: "string", example: "sync" },
    storeId: { type: "string", example: "manual_icenter" },
  },
  required: ["enqueued", "queue"],
} as const;

const storeDomainSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "dom_123" },
    storeId: { type: "string", example: "manual_icenter" },
    sourceUrl: urlSchema,
    domain: { type: "string", example: "www.icenter-iraq.com" },
    rootDomain: { type: "string", example: "icenter-iraq.com" },
    classification: websiteTypeSchema,
    isPrimary: { type: "boolean", example: true },
    createdAt: dateTimeSchema,
  },
  required: ["id", "storeId", "sourceUrl", "domain", "rootDomain", "classification", "isPrimary", "createdAt"],
} as const;

const refreshItemResultSchema = {
  type: "object",
  properties: {
    storeId: { type: "string", example: "manual_icenter" },
    storeName: { type: "string", example: "iCenter Iraq" },
    website: urlSchema,
    rootDomain: { type: "string", example: "icenter-iraq.com" },
    probeConnector: connectorTypeSchema,
    status: { type: "string", enum: ["synced", "probed_only", "skipped", "failed"], example: "synced" },
    productsIndexed: { type: "integer", example: 248 },
    offersIndexed: { type: "integer", example: 14 },
    reason: { type: "string", example: "no_supported_catalog_connector" },
  },
  required: ["storeId", "storeName", "status"],
} as const;

const manualStoreIntakeResponseSchema = {
  type: "object",
  properties: {
    existed: { type: "boolean", example: true },
    store: {
      type: "object",
      additionalProperties: true,
    },
    domain: storeDomainSchema,
    refresh: refreshItemResultSchema,
    connectorProfile: connectorProfileSchema,
    size: storeSizeSummarySchema,
  },
  required: ["existed", "store", "domain"],
} as const;

const catalogRefreshResponseSchema = {
  type: "object",
  properties: {
    startedAt: dateTimeSchema,
    finishedAt: dateTimeSchema,
    discovery: {
      type: "object",
      properties: {
        storesImported: { type: "integer", example: 3113 },
        domainsImported: { type: "integer", example: 414 },
      },
    },
    scannedStores: { type: "integer", example: 3113 },
    candidateStores: { type: "integer", example: 1 },
    dedupedDomains: { type: "integer", example: 1 },
    syncedStores: { type: "integer", example: 1 },
    probedOnlyStores: { type: "integer", example: 0 },
    failedStores: { type: "integer", example: 0 },
    skippedStores: { type: "integer", example: 3112 },
    results: {
      type: "array",
      items: refreshItemResultSchema,
    },
  },
  required: ["startedAt", "finishedAt", "scannedStores", "candidateStores", "dedupedDomains", "syncedStores", "probedOnlyStores", "failedStores", "skippedStores", "results"],
} as const;

const currentCatalogSyncResponseSchema = {
  type: "object",
  properties: {
    selectedStores: { type: "integer", example: 12 },
    selectedStoreIds: {
      type: "array",
      items: { type: "string" },
    },
    refresh: catalogRefreshResponseSchema,
  },
  required: ["selectedStores", "selectedStoreIds", "refresh"],
} as const;

const internalHealthResponseSchema = {
  type: "object",
  properties: {
    ok: { type: "boolean", example: true },
    runtime: {
      type: "object",
      properties: {
        apiMode: runtimeModeSchema,
        scope: { type: "string", enum: ["all", "subset"], example: "all" },
        scopedStoreCount: { type: "integer", example: 0 },
      },
      required: ["apiMode", "scope", "scopedStoreCount"],
    },
    database: {
      type: "object",
      properties: {
        driver: { type: "string", enum: ["sqlite", "postgres"], example: "sqlite" },
        configured: { type: "boolean", example: true },
      },
      required: ["driver", "configured"],
    },
    redis: {
      type: "object",
      properties: {
        configured: { type: "boolean", example: true },
      },
      required: ["configured"],
    },
    publicApi: {
      type: "object",
      properties: {
        ok: { type: "boolean", example: true },
      },
      required: ["ok"],
    },
    flags: {
      type: "object",
      properties: {
        docsEnabled: { type: "boolean", example: false },
        trustProxy: { type: "boolean", example: true },
      },
      required: ["docsEnabled", "trustProxy"],
    },
    counts: {
      type: "object",
      properties: {
        stores: { type: "integer", example: 3114 },
        storesWithWebsite: { type: "integer", example: 852 },
        storesWithProducts: { type: "integer", example: 174 },
        zeroProductStores: { type: "integer", example: 688 },
        totalProducts: { type: "integer", example: 160849 },
        totalVariants: { type: "integer", example: 33782 },
        totalOffers: { type: "integer", example: 21390 },
      },
      required: ["stores", "storesWithWebsite", "storesWithProducts", "zeroProductStores", "totalProducts", "totalVariants", "totalOffers"],
    },
  },
  required: ["ok", "runtime", "database", "redis", "publicApi", "flags", "counts"],
} as const;

const internalCatalogStatsResponseSchema = {
  type: "object",
  properties: {
    totalStores: { type: "integer", example: 3114 },
    storesWithWebsite: { type: "integer", example: 852 },
    indexedStores: { type: "integer", example: 174 },
    zeroProductStores: { type: "integer", example: 688 },
    totalProducts: { type: "integer", example: 160849 },
    totalVariants: { type: "integer", example: 33782 },
    totalOffers: { type: "integer", example: 21390 },
    latestSyncAt: dateTimeSchema,
    latestProbeAt: dateTimeSchema,
  },
  required: ["totalStores", "storesWithWebsite", "indexedStores", "zeroProductStores", "totalProducts", "totalVariants", "totalOffers"],
} as const;

const internalStoreListItemSchema = {
  type: "object",
  properties: {
    store: {
      type: "object",
      additionalProperties: true,
    },
    connectorProfile: connectorProfileSchema,
    size: storeSizeSummarySchema,
    acquisitionProfile: {
      type: "object",
      additionalProperties: true,
    },
  },
  required: ["store"],
} as const;

const internalStoresPagedResponseSchema = {
  type: "object",
  properties: {
    total: { type: "integer", example: 174 },
    limit: { type: "integer", example: 100 },
    offset: { type: "integer", example: 0 },
    items: {
      type: "array",
      items: internalStoreListItemSchema,
    },
  },
  required: ["total", "limit", "offset", "items"],
} as const;

const internalCatalogPullProductsAcceptedSchema = {
  type: "object",
  properties: {
    jobId: { type: "string", example: "job_m8wx2t" },
    status: { type: "string", enum: ["queued", "running", "completed", "failed"], example: "queued" },
    createdAt: dateTimeSchema,
  },
  required: ["jobId", "status", "createdAt"],
} as const;

const internalCatalogPullProductsJobSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "job_m8wx2t" },
    kind: { type: "string", enum: ["product-pull", "store-url-pull", "store-by-store-update"], example: "store-by-store-update" },
    status: { type: "string", enum: ["queued", "running", "completed", "failed"], example: "completed" },
    createdAt: dateTimeSchema,
    startedAt: dateTimeSchema,
    finishedAt: dateTimeSchema,
    args: genericObjectSchema,
    progress: {
      type: "object",
      properties: {
        completedStores: { type: "integer", example: 18 },
        totalStores: { type: "integer", example: 200 },
        lastStoreId: { type: "string", example: "manual_icenter" },
        lastStoreName: { type: "string", example: "iCenter Iraq" },
        lastStatus: { type: "string", example: "synced" },
      },
    },
    result: genericObjectSchema,
    error: { type: "string", example: "unknown_pull_products_error" },
  },
  required: ["id", "kind", "status", "createdAt", "args"],
} as const;

const coverageSummarySchema = {
  type: "object",
  properties: {
    generatedAt: dateTimeSchema,
    totalStores: { type: "integer", example: 3113 },
    officialStores: { type: "integer", example: 414 },
    indexedStores: { type: "integer", example: 12 },
    zeroProductStores: { type: "integer", example: 1 },
    blockedStores: { type: "integer", example: 0 },
    nonCatalogStores: { type: "integer", example: 0 },
    duplicateStores: { type: "integer", example: 0 },
    deadStores: { type: "integer", example: 0 },
    partnerFeedRequiredStores: { type: "integer", example: 0 },
    topFailureReasons: {
      type: "array",
      items: {
        type: "object",
        properties: {
          reason: { type: "string", example: "rate_limited" },
          count: { type: "integer", example: 3 },
        },
        required: ["reason", "count"],
      },
    },
  },
  required: ["generatedAt", "totalStores", "officialStores", "indexedStores", "zeroProductStores", "blockedStores", "nonCatalogStores", "duplicateStores", "deadStores", "partnerFeedRequiredStores", "topFailureReasons"],
} as const;

const domainAcquisitionProfileSchema = {
  type: "object",
  properties: {
    storeId: { type: "string", example: "manual_icenter" },
    rootDomain: { type: "string", example: "icenter-iraq.com" },
    websiteType: websiteTypeSchema,
    connectorType: connectorTypeSchema,
    strategy: { type: "string", example: "structured_api" },
    lifecycleState: { type: "string", example: "indexed" },
    publicCatalogDetected: { type: "boolean", example: true },
    requiresSession: { type: "boolean", example: false },
    requiresFeed: { type: "boolean", example: false },
    duplicateOfStoreId: { type: "string", example: "store_primary" },
    notes: { type: "string" },
    lastClassifiedAt: dateTimeSchema,
    details: genericObjectSchema,
  },
  required: ["storeId", "rootDomain", "websiteType", "strategy", "lifecycleState", "publicCatalogDetected", "requiresSession", "requiresFeed", "lastClassifiedAt", "details"],
} as const;

const domainBlockerEvidenceSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "evidence_123" },
    storeId: { type: "string", example: "manual_icenter" },
    blockerType: { type: "string", example: "rate_limited" },
    reason: { type: "string", example: "429 Too Many Requests" },
    httpStatus: { type: "integer", example: 429 },
    observedUrl: urlSchema,
    observedAt: dateTimeSchema,
    retryAfterHours: { type: "integer", example: 6 },
    details: genericObjectSchema,
  },
  required: ["id", "storeId", "blockerType", "reason", "observedAt", "details"],
} as const;

const sessionWorkflowSchema = {
  type: "object",
  properties: {
    storeId: { type: "string", example: "manual_icenter" },
    status: { type: "string", enum: ["missing", "ready", "expired"], example: "ready" },
    cookiesJson: { type: "string", example: "sid=abc123" },
    headers: stringMapSchema,
    notes: { type: "string", example: "manual session" },
    expiresAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  },
  required: ["storeId", "status", "updatedAt"],
} as const;

const partnerFeedSchema = {
  type: "object",
  properties: {
    storeId: { type: "string", example: "manual_icenter" },
    status: { type: "string", enum: ["missing", "ready", "syncing", "failed"], example: "ready" },
    feedType: { type: "string", enum: ["json"], example: "json" },
    sourceUrl: urlSchema,
    authHeaders: stringMapSchema,
    fieldMap: stringMapSchema,
    updatedAt: dateTimeSchema,
    lastSyncAt: dateTimeSchema,
    lastError: { type: "string" },
  },
  required: ["storeId", "status", "feedType", "sourceUrl", "updatedAt"],
} as const;

const domainEvidenceViewSchema = {
  type: "object",
  properties: {
    store: {
      type: "object",
      additionalProperties: true,
    },
    size: storeSizeSummarySchema,
    acquisitionProfile: domainAcquisitionProfileSchema,
    blockerEvidence: {
      type: "array",
      items: domainBlockerEvidenceSchema,
    },
    sessionWorkflow: sessionWorkflowSchema,
    partnerFeed: partnerFeedSchema,
  },
  required: ["store", "acquisitionProfile", "blockerEvidence"],
} as const;

const searchDocumentSchema = {
  type: "object",
  properties: {
    id: { type: "string", example: "manual_icenter:iphone-16-pro" },
    storeId: { type: "string", example: "manual_icenter" },
    storeName: { type: "string", example: "iCenter Iraq" },
    normalizedTitle: { type: "string", example: "iphone16pro256gb" },
    title: { type: "string", example: "iPhone 16 Pro 256GB" },
    brand: { type: "string", example: "Apple" },
    model: { type: "string", example: "iPhone 16 Pro" },
    sku: { type: "string", example: "IP16P-256" },
    livePrice: { type: "number", example: 1850000 },
    originalPrice: { type: "number", example: 1925000 },
    onSale: { type: "boolean", example: true },
    availability: stockStateSchema,
    freshnessAt: dateTimeSchema,
    sourceUrl: urlSchema,
    categoryPath: { type: "string", example: "Phones > Apple" },
    imageUrl: urlSchema,
    currency: { type: "string", example: "IQD" },
    offerLabel: { type: "string", example: "Sale" },
    sellerName: { type: "string", example: "iCenter Iraq" },
  },
  required: ["id", "storeId", "storeName", "normalizedTitle", "title", "onSale", "availability", "freshnessAt", "sourceUrl", "categoryPath"],
} as const;

const internalSearchResponseSchema = {
  type: "object",
  properties: {
    total: { type: "integer", example: 24 },
    hits: {
      type: "array",
      items: searchDocumentSchema,
    },
  },
  required: ["total", "hits"],
} as const;

const rootInfoResponseSchema = {
  type: "object",
  properties: {
    ok: { type: "boolean", example: true },
    service: { type: "string", example: "iraq-catalog-backend" },
    publicApiBase: { type: "string", example: "/public" },
    health: { type: "string", example: "/public/healthz" },
    runtime: runtimeHealthSchema,
    docs: { type: "string", example: "/docs" },
  },
  required: ["ok", "service", "publicApiBase", "health", "runtime"],
} as const;

const internalDescription =
  "Private endpoint. Requires either a signed service token request or an authenticated admin session cookie. Browser write requests also require `x-admin-csrf`.";

export async function registerCatalogSwagger(app: FastifyInstance) {
  if (!catalogConfig.docs.enabled) return;
  await registerSwaggerInternal(app);
}

export async function registerSwaggerInternal(
  app: FastifyInstance,
  options?: { docsPreHandler?: preHandlerHookHandler },
) {
  const docsBaseUrl = `http://${catalogConfig.bindHost}:${catalogConfig.port}`;

  await app.register(swagger, {
    openapi: {
      openapi: "3.0.3",
      info: {
        title: "Zip Hayer API",
        description:
          "Swagger documentation for the public catalog API and the private internal catalog operations.",
        version: "1.0.0",
      },
      servers: [
        {
          url: docsBaseUrl,
          description: "Local runtime",
        },
      ],
      tags: [
        {
          name: "System",
          description: "Health and operational endpoints.",
        },
        {
          name: "Public",
          description: "Public catalog endpoints consumed by the site.",
        },
        {
          name: "Internal",
          description: internalDescription,
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "Token",
            description:
              "Service token for `/internal/*` routes. Signed headers are also required on every request.",
          },
        },
      },
    },
  });

  const docsHooks = options?.docsPreHandler
    ? {
        preHandler: options.docsPreHandler,
      }
    : undefined;

  const assetContentTypeByName: Record<string, string> = {
    "swagger-ui.css": "text/css; charset=utf-8",
    "index.css": "text/css; charset=utf-8",
    "swagger-ui-bundle.js": "application/javascript; charset=utf-8",
    "swagger-ui-standalone-preset.js": "application/javascript; charset=utf-8",
    "favicon-32x32.png": "image/png",
    "favicon-16x16.png": "image/png",
    "oauth2-redirect.html": "text/html; charset=utf-8",
  };

  app.get("/docs", { schema: { hide: true }, ...docsHooks }, async (_request, reply) => {
    reply.type("text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="/docs/assets/swagger-ui.css" />
    <link rel="stylesheet" type="text/css" href="/docs/assets/index.css" />
    <link rel="icon" type="image/png" href="/docs/assets/favicon-32x32.png" sizes="32x32" />
    <link rel="icon" type="image/png" href="/docs/assets/favicon-16x16.png" sizes="16x16" />
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="/docs/assets/swagger-ui-bundle.js" charset="UTF-8"></script>
    <script src="/docs/assets/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
    <script src="/docs/assets/init.js" charset="UTF-8"></script>
  </body>
</html>`);
  });

  app.get("/docs/json", { schema: { hide: true }, ...docsHooks }, async (_request, reply) => {
    reply.send(app.swagger());
  });

  app.get("/docs/yaml", { schema: { hide: true }, ...docsHooks }, async (_request, reply) => {
    reply.type("application/x-yaml").send(app.swagger({ yaml: true }));
  });

  app.get<{ Params: { file: string } }>("/docs/assets/:file", { schema: { hide: true }, ...docsHooks }, async (request, reply) => {
    const { file } = request.params;
    if (file === "init.js") {
      reply.type("application/javascript; charset=utf-8").send(`window.onload = function () {
  SwaggerUIBundle({
    url: '/docs/json',
    dom_id: '#swagger-ui',
    deepLinking: true,
    docExpansion: 'list',
    persistAuthorization: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: 'StandaloneLayout',
    validatorUrl: null
  });
};`);
      return;
    }

    const contentType = assetContentTypeByName[file];
    if (!contentType) {
      reply.code(404).send({ error: "not_found" });
      return;
    }

    try {
      const filePath = path.join(swaggerUiStaticDir, file);
      const payload = await fs.readFile(filePath);
      reply.type(contentType).send(payload);
    } catch {
      reply.code(404).send({ error: "not_found" });
    }
  });
}

function withErrorResponses<T extends Record<string, unknown>>(schema: T): T & {
  response: Record<string | number, unknown>;
} {
  return {
    ...schema,
    response: {
      400: errorResponseSchema,
      401: errorResponseSchema,
      403: errorResponseSchema,
      404: errorResponseSchema,
      409: errorResponseSchema,
      429: errorResponseSchema,
      ...((schema.response as Record<string, unknown> | undefined) ?? {}),
    },
  } as T & {
    response: Record<string | number, unknown>;
  };
}

function internalRouteSchema<T extends Record<string, unknown>>(schema: T): T & Record<string, unknown> {
  return withErrorResponses({
    security: [{ bearerAuth: [] }],
    description: internalDescription,
    ...schema,
  }) as T & Record<string, unknown>;
}

export const catalogRouteSchemas = {
  rootInfo: {
    tags: ["System"],
    summary: "API root information",
    response: {
      200: rootInfoResponseSchema,
    },
  },
  healthz: {
    tags: ["System"],
    summary: "API health check",
    response: {
      200: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          runtime: runtimeHealthSchema,
        },
        required: ["ok", "runtime"],
      },
    },
  },
  publicHealthz: {
    tags: ["System"],
    summary: "Public API health check",
    response: {
      200: {
        type: "object",
        properties: {
          ok: { type: "boolean" },
          runtime: runtimeHealthSchema,
        },
        required: ["ok", "runtime"],
      },
    },
  },
  publicBootstrapLite: {
    tags: ["Public"],
    summary: "Get lightweight catalog bootstrap payload",
    response: {
      200: publicBootstrapLiteResponseSchema,
    },
  },
  publicBootstrap: {
    tags: ["Public"],
    summary: "Get catalog bootstrap payload",
    response: {
      200: publicBootstrapResponseSchema,
    },
  },
  publicCatalogProducts: {
    tags: ["Public"],
    summary: "List catalog products",
    querystring: {
      type: "object",
      properties: {
        limit: { type: "string" },
        offset: { type: "string" },
      },
    },
    response: {
      200: publicCatalogProductsResponseSchema,
    },
  },
  publicCities: {
    tags: ["Public"],
    summary: "List cities",
    response: {
      200: {
        type: "array",
        items: cityIndexEntrySchema,
      },
    },
  },
  publicCityDetail: withErrorResponses({
    tags: ["Public"],
    summary: "Get city detail",
    params: slugParamSchema,
    response: {
      200: cityFileSchema,
    },
  }),
  publicStoreDetail: withErrorResponses({
    tags: ["Public"],
    summary: "Get public store detail",
    params: idParamSchema,
    response: {
      200: publicStoreDetailResponseSchema,
    },
  }),
  publicStoreSummary: withErrorResponses({
    tags: ["Public"],
    summary: "Get public store summary",
    params: idParamSchema,
    response: {
      200: publicStoreSummaryResponseSchema,
    },
  }),
  publicStoreProducts: withErrorResponses({
    tags: ["Public"],
    summary: "List public store products",
    params: idParamSchema,
    querystring: {
      type: "object",
      properties: {
        limit: { type: "string" },
        offset: { type: "string" },
      },
    },
    response: {
      200: publicCatalogProductsResponseSchema,
    },
  }),
  publicProductsByIds: {
    tags: ["Public"],
    summary: "Get products by IDs",
    description: "Pass one or more `id` query values. Repeating `?id=...` is supported.",
    querystring: {
      type: "object",
      properties: {
        id: {
          anyOf: [
            { type: "string" },
            {
              type: "array",
              items: { type: "string" },
            },
          ],
        },
      },
    },
    response: {
      200: publicProductsByIdsResponseSchema,
    },
  },
  publicProductDetail: withErrorResponses({
    tags: ["Public"],
    summary: "Get unified product detail",
    params: idParamSchema,
    response: {
      200: publicUnifiedProductSchema,
    },
  }),
  publicProductFull: withErrorResponses({
    tags: ["Public"],
    summary: "Get unified product detail and offers",
    params: idParamSchema,
    response: {
      200: publicProductFullResponseSchema,
    },
  }),
  publicProductOffers: withErrorResponses({
    tags: ["Public"],
    summary: "List product offers",
    params: idParamSchema,
    response: {
      200: {
        type: "array",
        items: publicUnifiedOfferSchema,
      },
    },
  }),
  publicBrandDetail: withErrorResponses({
    tags: ["Public"],
    summary: "Get brand detail",
    params: slugParamSchema,
    response: {
      200: publicBrandDetailResponseSchema,
    },
  }),
  publicBrandSummary: withErrorResponses({
    tags: ["Public"],
    summary: "Get brand summary",
    params: slugParamSchema,
    response: {
      200: publicBrandSummaryResponseSchema,
    },
  }),
  publicBrandProducts: withErrorResponses({
    tags: ["Public"],
    summary: "List brand products",
    params: slugParamSchema,
    querystring: {
      type: "object",
      properties: {
        limit: { type: "string" },
        offset: { type: "string" },
      },
    },
    response: {
      200: publicCatalogProductsResponseSchema,
    },
  }),
  publicSearch: {
    tags: ["Public"],
    summary: "Search the public catalog",
    querystring: {
      type: "object",
      properties: {
        q: { type: "string" },
        brands: { type: "string", description: "Comma-separated brand list." },
        categories: { type: "string", description: "Comma-separated category list." },
        stores: { type: "string", description: "Comma-separated store IDs." },
        cities: { type: "string", description: "Comma-separated city labels." },
        priceMin: { type: "string" },
        priceMax: { type: "string" },
        inStockOnly: { type: "string", enum: ["true", "false"] },
        onSaleOnly: { type: "string", enum: ["true", "false"] },
        verifiedOnly: { type: "string", enum: ["true", "false"] },
        officialDealerOnly: { type: "string", enum: ["true", "false"] },
        sort: {
          type: "string",
          enum: ["relevance", "price_asc", "price_desc", "rating_desc", "freshness_desc", "offers_desc"],
        },
      },
    },
    response: {
      200: publicSearchResponseSchema,
    },
  },
  internalStores: internalRouteSchema({
    tags: ["Internal"],
    summary: "List internal stores",
    querystring: {
      type: "object",
      properties: {
        limit: { type: "string" },
        offset: { type: "string" },
      },
    },
    response: {
      200: internalStoresResponseSchema,
    },
  }),
  internalHealth: internalRouteSchema({
    tags: ["Internal"],
    summary: "Get backend health and runtime info",
    response: {
      200: internalHealthResponseSchema,
    },
  }),
  internalCatalogStats: internalRouteSchema({
    tags: ["Internal"],
    summary: "Get aggregate catalog stats",
    response: {
      200: internalCatalogStatsResponseSchema,
    },
  }),
  internalStoresMissingProducts: internalRouteSchema({
    tags: ["Internal"],
    summary: "List website-backed stores with zero products",
    querystring: {
      type: "object",
      properties: {
        limit: { type: "string" },
        offset: { type: "string" },
        q: { type: "string" },
        status: { type: "string" },
      },
    },
    response: {
      200: internalStoresPagedResponseSchema,
    },
  }),
  internalStoresWithProducts: internalRouteSchema({
    tags: ["Internal"],
    summary: "List indexed stores with products",
    querystring: {
      type: "object",
      properties: {
        limit: { type: "string" },
        offset: { type: "string" },
        q: { type: "string" },
      },
    },
    response: {
      200: internalStoresPagedResponseSchema,
    },
  }),
  internalStoreDetail: internalRouteSchema({
    tags: ["Internal"],
    summary: "Get internal store detail",
    params: idParamSchema,
    response: {
      200: publicStoreDetailResponseSchema,
    },
  }),
  internalStoreSize: internalRouteSchema({
    tags: ["Internal"],
    summary: "Get store size summary",
    params: idParamSchema,
    response: {
      200: storeSizeSummarySchema,
    },
  }),
  internalProbe: internalRouteSchema({
    tags: ["Internal"],
    summary: "Enqueue store probe",
    params: idParamSchema,
    response: {
      202: enqueueResponseSchema,
    },
  }),
  internalSync: internalRouteSchema({
    tags: ["Internal"],
    summary: "Enqueue store sync",
    params: idParamSchema,
    response: {
      202: enqueueResponseSchema,
    },
  }),
  internalStoreIntake: internalRouteSchema({
    tags: ["Internal"],
    summary: "Create or update a store from a website and pull its catalog",
    body: {
      type: "object",
      properties: {
        website: { type: "string" },
        name: { type: "string" },
        city: { type: "string" },
        cityAr: { type: "string" },
        area: { type: "string" },
        primaryCategory: { type: "string" },
        sourceFile: { type: "string" },
        note: { type: "string" },
        highPriority: { type: "boolean" },
        syncNow: { type: "boolean" },
      },
      required: ["website"],
    },
    response: {
      200: manualStoreIntakeResponseSchema,
    },
  }),
  internalDiscoveryRescan: internalRouteSchema({
    tags: ["Internal"],
    summary: "Enqueue discovery rescan",
    response: {
      202: enqueueResponseSchema,
    },
  }),
  internalCatalogRefresh: internalRouteSchema({
    tags: ["Internal"],
    summary: "Run catalog refresh",
    body: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        includeDiscovery: { type: "boolean" },
        officialOnly: { type: "boolean" },
        dedupeByDomain: { type: "boolean" },
        concurrency: { type: "integer" },
      },
    },
    response: {
      200: catalogRefreshResponseSchema,
    },
  }),
  internalCatalogSyncCurrent: internalRouteSchema({
    tags: ["Internal"],
    summary: "Sync current indexed sites with one action",
    body: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        concurrency: { type: "integer" },
        dedupeByDomain: { type: "boolean" },
        officialOnly: { type: "boolean" },
      },
    },
    response: {
      200: currentCatalogSyncResponseSchema,
    },
  }),
  internalCatalogRetryFailed: internalRouteSchema({
    tags: ["Internal"],
    summary: "Retry failed catalog stores",
    body: {
      type: "object",
      properties: {
        includeZeroProducts: { type: "boolean" },
        limit: { type: "integer" },
        concurrency: { type: "integer" },
      },
    },
    response: {
      200: catalogRefreshResponseSchema,
    },
  }),
  internalCatalogPullProducts: internalRouteSchema({
    tags: ["Internal"],
    summary: "Enqueue product pull workflow",
    body: {
      type: "object",
      properties: {
        concurrency: { type: "integer" },
        currentLimit: { type: "integer" },
        zeroLimit: { type: "integer" },
        includeZeroProducts: { type: "boolean" },
        includeUnofficial: { type: "boolean" },
      },
    },
    response: {
      202: internalCatalogPullProductsAcceptedSchema,
    },
  }),
  internalCatalogPullStoreUrl: internalRouteSchema({
    tags: ["Internal"],
    summary: "Create/update one store from a URL and enqueue product sync",
    body: {
      type: "object",
      properties: {
        website: { type: "string" },
        name: { type: "string" },
        city: { type: "string" },
        cityAr: { type: "string" },
        area: { type: "string" },
        primaryCategory: { type: "string" },
        note: { type: "string" },
        highPriority: { type: "boolean" },
      },
      required: ["website"],
    },
    response: {
      202: internalCatalogPullProductsAcceptedSchema,
    },
  }),
  internalCatalogUpdateStores: internalRouteSchema({
    tags: ["Internal"],
    summary: "Enqueue store-by-store updates to catch newly added products",
    body: {
      type: "object",
      properties: {
        limit: { type: "integer" },
        concurrency: { type: "integer" },
        dedupeByDomain: { type: "boolean" },
        officialOnly: { type: "boolean" },
        includeZeroProducts: { type: "boolean" },
        zeroLimit: { type: "integer" },
        includeUnofficial: { type: "boolean" },
      },
    },
    response: {
      202: internalCatalogPullProductsAcceptedSchema,
    },
  }),
  internalCatalogPullProductsJob: internalRouteSchema({
    tags: ["Internal"],
    summary: "Get product pull job status",
    params: {
      type: "object",
      properties: {
        jobId: { type: "string" },
      },
      required: ["jobId"],
    },
    response: {
      200: internalCatalogPullProductsJobSchema,
    },
  }),
  internalCatalogJob: internalRouteSchema({
    tags: ["Internal"],
    summary: "Get catalog background job status",
    params: {
      type: "object",
      properties: {
        jobId: { type: "string" },
      },
      required: ["jobId"],
    },
    response: {
      200: internalCatalogPullProductsJobSchema,
    },
  }),
  internalCoverageSummary: internalRouteSchema({
    tags: ["Internal"],
    summary: "Get coverage summary",
    response: {
      200: coverageSummarySchema,
    },
  }),
  internalDomainsBacklog: internalRouteSchema({
    tags: ["Internal"],
    summary: "List domain backlog",
    response: {
      200: {
        type: "array",
        items: domainEvidenceViewSchema,
      },
    },
  }),
  internalDomainEvidence: internalRouteSchema({
    tags: ["Internal"],
    summary: "Get domain evidence",
    params: idParamSchema,
    response: {
      200: domainEvidenceViewSchema,
    },
  }),
  internalDomainSession: internalRouteSchema({
    tags: ["Internal"],
    summary: "Register a session for a domain",
    params: idParamSchema,
    body: {
      type: "object",
      properties: {
        cookiesJson: { type: "string" },
        headers: {
          type: "object",
          additionalProperties: { type: "string" },
        },
        notes: { type: "string" },
        expiresAt: { type: "string", format: "date-time" },
      },
    },
    response: {
      200: sessionWorkflowSchema,
    },
  }),
  internalDomainFeedSync: internalRouteSchema({
    tags: ["Internal"],
    summary: "Save and sync a partner feed",
    params: idParamSchema,
    body: {
      type: "object",
      properties: {
        sourceUrl: { type: "string", format: "uri" },
        authHeaders: {
          type: "object",
          additionalProperties: { type: "string" },
        },
        fieldMap: {
          type: "object",
          additionalProperties: { type: "string" },
        },
      },
      required: ["sourceUrl"],
    },
    response: {
      200: partnerFeedSchema,
    },
  }),
  internalSearch: internalRouteSchema({
    tags: ["Internal"],
    summary: "Search the internal catalog index",
    querystring: {
      type: "object",
      properties: {
        q: { type: "string" },
        storeId: { type: "string" },
        minPrice: { type: "string" },
        maxPrice: { type: "string" },
        onSale: { type: "string", enum: ["true", "false"] },
        availability: { type: "string" },
        limit: { type: "string" },
      },
    },
    response: {
      200: internalSearchResponseSchema,
    },
  }),
} as const;
