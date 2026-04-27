import { randomUUID } from "node:crypto";
import type { CatalogConnector } from "./base.js";
import {
  buildCommonCatalogUrls,
  buildOffersFromProducts,
  crawlCatalogFromListingPages,
  dedupeProducts,
  extractNuxtPayloads,
  extractProductCandidates,
  extractString,
  toCatalogProductDraft,
} from "./extractors.js";
import { connectorDefaultPriority } from "../shared/catalog/syncPolicy.js";
import { compactText, extractDomain, nowIso, tokenizeModel } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft } from "../shared/catalog/types.js";

const MISWAG_DEFAULT_PAGE_SIZE = 250;
const MISWAG_DEFAULT_DETAIL_CONCURRENCY = 8;
const MISWAG_CLIENT_ID = "4";
const MISWAG_BUNDLE_VERSION = "v4.6.0";
const MISWAG_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36";
const MISWAG_ANON_URL = "https://miswag.com/auth/v1/public/anonymous";
const MISWAG_PUBLIC_META_URL = "https://ganesh-lama.miswag.com/content/v1/public/meta/items";
const MISWAG_RICH_DETAIL_URL = "https://miswag.com/content/v2/items";

interface MiswagTypesenseConfig {
  host: string;
  apiKey: string;
  preset: string;
  collection: string;
  multiSearchUrl: string;
}

interface MiswagTypesenseCatalogPage {
  found: number;
  documents: Record<string, unknown>[];
}

interface MiswagTypesenseResponse {
  results?: Array<{
    found?: number;
    hits?: Array<{
      document?: Record<string, unknown>;
    }>;
  }>;
}

interface MiswagAnonTokenResponse {
  data?: {
    token?: string;
  };
}

interface MiswagMetaInfo {
  item_id?: string;
  product_id?: string;
  name?: string;
  brand?: string;
  brand_alias?: string;
  image_url?: string;
  url?: string;
  category?: string;
  description?: string;
  price?: number | string;
  original_price?: number | string;
  currency?: string;
  availability?: string;
  images?: string[];
  rating?: number | string;
  rating_count?: number;
  review_count?: number;
  keywords?: string;
  published?: string;
}

interface MiswagPublicMetaResponse {
  data?: {
    info?: MiswagMetaInfo;
    content?: unknown[];
  };
}

interface MiswagDesktopInfo {
  meta?: {
    item_id?: string;
    product_id?: string;
    name?: string;
    brand?: string;
    image_url?: string;
    url?: string;
    category?: string;
    description?: string;
    price?: number | string;
    original_price?: number | string;
    currency?: string;
    item_code?: string;
    rating?: number | string;
    rating_count?: number;
  };
  size?: {
    id?: string;
    title?: string;
    availability?: string;
    is_available?: boolean;
    is_limited?: boolean;
  };
  variation?: {
    id?: string;
    title?: string;
    image?: string;
  };
  gallery?: Array<{
    url?: string;
    type?: string;
  }>;
  main_image?: string;
  merchant?: {
    id?: string;
    title?: string;
  };
}

interface MiswagDesktopResponse {
  data?: {
    info?: MiswagDesktopInfo;
    content?: unknown[];
  };
}

export const miswagNuxtConnector: CatalogConnector = {
  type: "miswag_nuxt",

  async probe({ homepageHtml, homepageUrl }) {
    const domain = extractDomain(homepageUrl);
    if (!domain || !/miswag\.com$/i.test(domain)) return null;
    const signals = [
      homepageHtml.includes('id="__nuxt"') ? "__nuxt_root" : "",
      homepageHtml.includes("/_nuxt/") ? "nuxt_bundle" : "",
      homepageHtml.includes('typesenseHost:"') ? "typesense_search_config" : "",
      /miswag/i.test(homepageHtml) ? "miswag_brand" : "",
    ].filter(Boolean);

    if (signals.length < 2) return null;

    return {
      connectorType: "miswag_nuxt",
      confidence: 0.96,
      signals,
      capabilities: {
        supportsStructuredApi: true,
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: false,
        supportsMarketplaceContext: true,
        fallbackToBrowser: true,
      },
      endpoints: {
        search: new URL("/search?query=", homepageUrl).toString(),
        categories: new URL("/categories", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const homepageUrl = store.website ?? profile.endpoints.search ?? "";
    const homepageHtml = await client.fetchText(homepageUrl);
    const payloads = extractNuxtPayloads(homepageHtml);
    const candidates = extractProductCandidates(payloads);
    const payloadProducts = candidates
      .map((candidate) => toCatalogProductDraft(store.id, "miswag_nuxt", candidate, homepageUrl))
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
    const typesenseConfig = extractMiswagTypesenseConfig(homepageHtml);
    const snapshots: Array<{ label: string; payload: unknown }> = [
      { label: "homepage", payload: { url: homepageUrl, html: homepageHtml.slice(0, 200000) } },
    ];

    let typesenseProducts: CatalogProductDraft[] = [];
    let typesenseEstimatedSize = 0;
    let typesenseError: Error | undefined;

    if (typesenseConfig) {
      try {
        const catalog = await fetchMiswagTypesenseCatalog(store.id, client, typesenseConfig);
        typesenseProducts = catalog.products;
        typesenseEstimatedSize = catalog.found;
        snapshots.push({
          label: "typesense_catalog",
          payload: {
            host: typesenseConfig.host,
            preset: typesenseConfig.preset,
            pageSize: catalog.pageSize,
            pagesFetched: catalog.pagesFetched,
            found: catalog.found,
            products: catalog.products.length,
          },
        });
      } catch (error) {
        typesenseError = error instanceof Error ? error : new Error(String(error));
        snapshots.push({
          label: "typesense_catalog_error",
          payload: {
            host: typesenseConfig.host,
            preset: typesenseConfig.preset,
            message: typesenseError.message,
          },
        });
      }
    }

    if (typesenseProducts.length > 0) {
      const products = dedupeProducts([...payloadProducts, ...typesenseProducts]);
      return {
        products,
        variants: [],
        offers: buildOffersFromProducts(products),
        estimatedCatalogSize: Math.max(typesenseEstimatedSize, products.length),
        snapshots,
      };
    }

    const seedUrls = [
      homepageUrl,
      ...(profile.endpoints.categories ? [profile.endpoints.categories] : []),
      ...(profile.endpoints.search ? [profile.endpoints.search] : []),
      ...buildCommonCatalogUrls(homepageUrl),
    ];
    const crawled = await crawlCatalogFromListingPages(
      store.id,
      "miswag_nuxt",
      client,
      seedUrls,
      {
        maxListingPages: 200,
        maxProductPages: 5000,
      },
    );
    const products = dedupeProducts([...payloadProducts, ...crawled.products]);

    if (products.length === 0 && typesenseError) {
      throw typesenseError;
    }

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: Math.max(typesenseEstimatedSize, products.length, crawled.productPages.length),
      snapshots: [
        ...snapshots,
        { label: "listing_pages", payload: crawled.listingPages },
        { label: "detail_pages", payload: crawled.productPages },
      ],
    };
  },
};

export const miswagDefaultPriority = connectorDefaultPriority("miswag_nuxt");

function extractMiswagTypesenseConfig(html: string): MiswagTypesenseConfig | null {
  const rawHost = matchQuotedConfig(html, "typesenseHost");
  const apiKey = matchQuotedConfig(html, "typesenseSearchOnly");
  const preset = matchQuotedConfig(html, "searchPreset") ?? "miswag-items-search";
  if (!rawHost || !apiKey) return null;

  const host = /^https?:\/\//i.test(rawHost) ? rawHost : `https://${rawHost}`;
  return {
    host,
    apiKey,
    preset,
    collection: preset,
    multiSearchUrl: new URL("/multi_search", host).toString(),
  };
}

function matchQuotedConfig(html: string, key: string): string | undefined {
  const match = html.match(new RegExp(`${key}:"([^"]+)"`));
  return match?.[1]?.trim() || undefined;
}

async function fetchMiswagTypesenseCatalog(
  storeId: string,
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
  config: MiswagTypesenseConfig,
): Promise<{
  found: number;
  pageSize: number;
  pagesFetched: number;
  products: CatalogProductDraft[];
}> {
  const pageSize = readPositiveIntEnv("CATALOG_MISWAG_TYPESENSE_PAGE_SIZE") ?? MISWAG_DEFAULT_PAGE_SIZE;
  const pageLimit = readPositiveIntEnv("CATALOG_MISWAG_TYPESENSE_PAGE_LIMIT");
  const pageConcurrency = readPositiveIntEnv("CATALOG_MISWAG_TYPESENSE_PAGE_CONCURRENCY") ?? 6;
  const detailConcurrency = readPositiveIntEnv("CATALOG_MISWAG_DETAIL_CONCURRENCY") ?? MISWAG_DEFAULT_DETAIL_CONCURRENCY;
  const fetchRichDetail = readBooleanEnv("CATALOG_MISWAG_FETCH_RICH_DETAIL");
  const firstPage = await fetchMiswagTypesensePage(client, config, 1, pageSize);
  const totalPages = firstPage.found > 0 ? Math.ceil(firstPage.found / pageSize) : 1;
  const lastPage = pageLimit ? Math.min(totalPages, pageLimit) : totalPages;
  const documents = [...firstPage.documents];

  const remainingPages = Array.from({ length: Math.max(lastPage - 1, 0) }, (_, index) => index + 2);
  if (remainingPages.length > 0) {
    const pages = await mapPagesWithConcurrency(
      remainingPages,
      pageConcurrency,
      async (page) => fetchMiswagTypesensePage(client, config, page, pageSize),
    );
    for (const page of pages) {
      documents.push(...page.documents);
    }
  }

  const getAnonToken = createMiswagAnonTokenProvider(client);
  const productDetails = await mapPagesWithConcurrency(
    documents,
    detailConcurrency,
    async (document) => fetchMiswagProductDetail(client, getAnonToken, document, fetchRichDetail),
  );

  const products = dedupeProducts(
    productDetails
      .map((detail) => normalizeMiswagTypesenseDocument(storeId, detail.document, detail.meta, detail.desktop))
      .filter((product): product is CatalogProductDraft => Boolean(product)),
  );

  return {
    found: firstPage.found,
    pageSize,
    pagesFetched: lastPage,
    products,
  };
}

function createMiswagAnonTokenProvider(
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
): (forceRefresh?: boolean) => Promise<string> {
  let cachedToken: string | undefined;
  let inFlight: Promise<string> | undefined;

  return async (forceRefresh = false) => {
    if (cachedToken && !forceRefresh) return cachedToken;
    if (inFlight && !forceRefresh) return inFlight;

    inFlight = (async () => {
      const response = (await client.fetchJson(MISWAG_ANON_URL, {
        method: "POST",
        headers: {
          ...buildMiswagApiHeaders(),
          "content-type": "application/x-www-form-urlencoded",
          "device-id": buildMiswagDeviceId(),
        },
        body: "{}",
      })) as MiswagAnonTokenResponse;

      const token = response.data?.token?.trim();
      if (!token) {
        throw new Error("Miswag anonymous token response did not contain a token.");
      }
      cachedToken = token;
      return token;
    })();

    try {
      return await inFlight;
    } finally {
      inFlight = undefined;
    }
  };
}

async function fetchMiswagProductDetail(
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
  getAnonToken: (forceRefresh?: boolean) => Promise<string>,
  document: Record<string, unknown>,
  fetchRichDetail: boolean,
): Promise<{
  document: Record<string, unknown>;
  meta?: MiswagMetaInfo;
  desktop?: MiswagDesktopInfo;
}> {
  const productId =
    extractString(document, ["id", "variation_id", "item_group_id", "alias"]) ??
    undefined;
  if (!productId) {
    return { document };
  }

  try {
    const token = await getAnonToken();
    const meta = await fetchMiswagAuthorizedInfo<MiswagPublicMetaResponse>(
      client,
      `${MISWAG_PUBLIC_META_URL}/${encodeURIComponent(productId)}`,
      token,
      getAnonToken,
    );
    let desktop: MiswagDesktopInfo | undefined;

    if (fetchRichDetail) {
      const desktopResponse = await fetchMiswagAuthorizedInfo<MiswagDesktopResponse>(
        client,
        `${MISWAG_RICH_DETAIL_URL}/${encodeURIComponent(productId)}/desktop`,
        token,
        getAnonToken,
      );
      desktop = desktopResponse.data?.info;
    }

    return {
      document,
      meta: meta?.data?.info,
      desktop,
    };
  } catch {
    return { document };
  }
}

async function fetchMiswagAuthorizedInfo<T extends { data?: { info?: unknown } }>(
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
  url: string,
  token: string,
  getAnonToken: (forceRefresh?: boolean) => Promise<string>,
): Promise<T> {
  try {
    return (await client.fetchJson(url, {
      headers: {
        ...buildMiswagApiHeaders(),
        authorization: `Bearer ${token}`,
      },
    })) as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/:\s*401\b/.test(message)) throw error;

    const refreshedToken = await getAnonToken(true);
    return (await client.fetchJson(url, {
      headers: {
        ...buildMiswagApiHeaders(),
        authorization: `Bearer ${refreshedToken}`,
      },
    })) as T;
  }
}

function buildMiswagApiHeaders(): Record<string, string> {
  return {
    accept: "application/json, text/plain, */*",
    "accept-language": "ar",
    "client-id": MISWAG_CLIENT_ID,
    "bundle-version": MISWAG_BUNDLE_VERSION,
    "user-agent": MISWAG_USER_AGENT,
    "x-experiments": "[]",
  };
}

function buildMiswagDeviceId(): string {
  return Buffer.from(`${MISWAG_CLIENT_ID}|${randomUUID()}|prod`).toString("base64");
}

async function fetchMiswagTypesensePage(
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
  config: MiswagTypesenseConfig,
  page: number,
  pageSize: number,
): Promise<MiswagTypesenseCatalogPage> {
  const response = (await client.fetchJson(
    `${config.multiSearchUrl}?x-typesense-api-key=${encodeURIComponent(config.apiKey)}`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        searches: [
          {
            preset: config.preset,
            per_page: pageSize,
            enable_overrides: true,
            collection: config.collection,
            q: "*",
            page,
          },
        ],
      }),
    },
  )) as MiswagTypesenseResponse;

  const result = response.results?.[0];
  if (!result) {
    throw new Error("Miswag Typesense response did not include a search result payload.");
  }
  const hits = Array.isArray(result?.hits) ? result.hits : [];

  return {
    found: typeof result?.found === "number" && Number.isFinite(result.found) ? result.found : 0,
    documents: hits
      .map((hit) => hit.document)
      .filter((document): document is Record<string, unknown> => Boolean(document && typeof document === "object")),
  };
}

async function mapPagesWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));

  const workers = Array.from({ length: workerCount }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      const item = items[index];
      if (item === undefined) continue;
      results[index] = await handler(item, index);
    }
  });

  await Promise.all(workers);
  return results;
}

function normalizeMiswagTypesenseDocument(
  storeId: string,
  document: Record<string, unknown>,
  meta?: MiswagMetaInfo,
  desktop?: MiswagDesktopInfo,
): CatalogProductDraft | null {
  const title =
    meta?.name?.trim() ||
    desktop?.meta?.name?.trim() ||
    extractString(document, ["title_AR", "title_EN", "title", "name"]);
  const sourceUrl = meta?.url?.trim() || desktop?.meta?.url?.trim() || extractString(document, ["url"]);
  const sourceProductId =
    meta?.product_id?.trim() ||
    desktop?.meta?.product_id?.trim() ||
    extractString(document, ["id", "variation_id", "item_group_id", "alias"]) ||
    (sourceUrl ? compactText(sourceUrl) : undefined);
  if (!title || !sourceUrl || !sourceProductId) return null;

  const brand =
    meta?.brand?.trim() ||
    desktop?.meta?.brand?.trim() ||
    extractString(document, ["brand"]) ||
    extractFacetLabel(extractString(document, ["facet_brand"]));
  const sellerName =
    desktop?.merchant?.title?.trim() ||
    extractString(document, ["vendor"]) ||
    extractFacetLabel(extractString(document, ["facet_merchant"]));
  const sellerId =
    desktop?.merchant?.id?.trim() ||
    extractString(document, ["vendor_alias"]);
  const sku =
    desktop?.meta?.item_code?.trim() ||
    meta?.item_id?.trim() ||
    desktop?.size?.id?.trim() ||
    extractString(document, ["variation_id", "alias"]);
  const livePrice =
    readNumberishFromUnknown(meta?.price) ??
    readNumberishFromUnknown(desktop?.meta?.price) ??
    readNumberish(document, ["price_numeric_value", "price_value"]);
  const originalPrice =
    readNumberishFromUnknown(meta?.original_price) ??
    readNumberishFromUnknown(desktop?.meta?.original_price) ??
    readNumberish(document, ["price_original_value", "price_numeric_value"]) ??
    livePrice;
  const onSale = readBooleanLike(document.is_on_sale) || (
    typeof livePrice === "number" &&
    typeof originalPrice === "number" &&
    originalPrice > livePrice
  );
  const lastSeenAt = nowIso();
  const freshnessAt = normalizeMiswagTimestamp(document, meta) ?? lastSeenAt;

  return {
    storeId,
    sourceProductId,
    normalizedTitle: compactText(title),
    title,
    brand: brand ?? undefined,
    model: undefined,
    sku: sku ?? undefined,
    sellerName: sellerName ?? undefined,
    sellerId: sellerId ?? undefined,
    categoryPath: extractMiswagCategoryPath(document, meta, desktop),
    sourceUrl,
    imageUrl:
      meta?.image_url?.trim() ||
      desktop?.main_image?.trim() ||
      desktop?.variation?.image?.trim() ||
      extractString(document, ["image"]),
    availability: extractMiswagAvailability(document, meta, desktop),
    currency:
      meta?.currency?.trim() ||
      desktop?.meta?.currency?.trim() ||
      extractString(document, ["price_currency"]) ||
      "IQD",
    livePrice,
    originalPrice,
    onSale,
    sourceConnector: "miswag_nuxt",
    freshnessAt,
    lastSeenAt,
    offerLabel: undefined,
    offerStartsAt: undefined,
    offerEndsAt: undefined,
    brandTokens: brand ? tokenizeModel(brand) : [],
    modelTokens: [],
    skuTokens: sku ? tokenizeModel(sku) : [],
    rawPayload: buildMiswagRawPayload(document, meta, desktop),
  };
}

function extractMiswagCategoryPath(
  document: Record<string, unknown>,
  meta?: MiswagMetaInfo,
  desktop?: MiswagDesktopInfo,
): string[] {
  const metaCategory = meta?.category?.trim() || desktop?.meta?.category?.trim();
  if (metaCategory) {
    return metaCategory
      .split(">")
      .map((value) => value.trim())
      .filter(Boolean);
  }

  const direct = [
    extractString(document, ["l1_division_ar"]),
    extractString(document, ["l2_division_ar"]),
    extractString(document, ["l3_division_ar"]),
    extractString(document, ["l4_division_ar"]),
  ].filter((value): value is string => Boolean(value && value.trim()));
  if (direct.length > 0) return direct;

  const hierarchical =
    extractString(document, ["hierarchical_category_name"]) ??
    extractString(document, ["hierarchical_category_alias"]);
  if (!hierarchical) return [];
  return hierarchical
    .split(">")
    .map((value) => value.trim())
    .filter(Boolean);
}

function extractMiswagAvailability(
  document: Record<string, unknown>,
  meta?: MiswagMetaInfo,
  desktop?: MiswagDesktopInfo,
): CatalogProductDraft["availability"] {
  const explicitAvailability =
    desktop?.size?.availability ??
    meta?.availability ??
    (typeof document.availability === "string" ? document.availability : undefined);
  if (typeof explicitAvailability === "string") {
    const normalized = explicitAvailability.trim().toLowerCase();
    if (normalized.includes("pre")) return "preorder";
    if (normalized.includes("limited")) return "in_stock";
    if (normalized.includes("instock") || normalized.includes("in_stock")) return "in_stock";
    if (normalized.includes("out")) return "out_of_stock";
  }

  if (readBooleanLike(document.pre_order)) return "preorder";
  if (typeof desktop?.size?.is_available === "boolean") {
    return desktop.size.is_available ? "in_stock" : "out_of_stock";
  }
  if ("availability" in document) {
    return readBooleanLike(document.availability) ? "in_stock" : "out_of_stock";
  }
  return "unknown";
}

function normalizeMiswagTimestamp(document: Record<string, unknown>, meta?: MiswagMetaInfo): string | undefined {
  const published = meta?.published?.trim() || extractString(document, ["published"]);
  if (published) {
    const publishedAt = Date.parse(published.replace(" ", "T"));
    if (Number.isFinite(publishedAt)) return new Date(publishedAt).toISOString();
  }

  const createdAt = readNumberish(document, ["created_at"]);
  if (typeof createdAt === "number") {
    const millis = createdAt > 1_000_000_000_000 ? createdAt : createdAt * 1000;
    if (Number.isFinite(millis)) return new Date(millis).toISOString();
  }

  return undefined;
}

function buildMiswagRawPayload(
  document: Record<string, unknown>,
  meta?: MiswagMetaInfo,
  desktop?: MiswagDesktopInfo,
): Record<string, unknown> {
  return {
    id: extractString(document, ["id"]),
    alias: extractString(document, ["alias"]),
    item_group_id: extractString(document, ["item_group_id"]),
    variation_id: extractString(document, ["variation_id"]),
    title_AR: extractString(document, ["title_AR"]),
    title_EN: extractString(document, ["title_EN"]),
    short_description: extractString(document, ["short_description"]),
    listing_description: extractString(document, ["description"]),
    brand: extractString(document, ["brand"]),
    vendor: extractString(document, ["vendor"]),
    vendor_alias: extractString(document, ["vendor_alias"]),
    url: extractString(document, ["url"]),
    image: extractString(document, ["image"]),
    price_currency: extractString(document, ["price_currency"]),
    price_numeric_value: readNumberish(document, ["price_numeric_value", "price_value"]),
    price_original_value: readNumberish(document, ["price_original_value", "price_numeric_value"]),
    is_on_sale: readBooleanLike(document.is_on_sale),
    availability: document.availability,
    pre_order: readBooleanLike(document.pre_order),
    published: extractString(document, ["published"]),
    created_at: readNumberish(document, ["created_at"]),
    l1_division_ar: extractString(document, ["l1_division_ar"]),
    l2_division_ar: extractString(document, ["l2_division_ar"]),
    l3_division_ar: extractString(document, ["l3_division_ar"]),
    l4_division_ar: extractString(document, ["l4_division_ar"]),
    start_tag: extractString(document, ["start_tag"]),
    end_tag: extractString(document, ["end_tag"]),
    commercial_tag: extractString(document, ["commercial_tag"]),
    description:
      meta?.description ??
      desktop?.meta?.description ??
      extractString(document, ["description", "short_description"]),
    meta,
    desktop,
    images: meta?.images,
    gallery: desktop?.gallery?.map((entry) => entry.url).filter((value): value is string => Boolean(value)),
    merchant: desktop?.merchant,
    item_code: desktop?.meta?.item_code,
    rating: readNumberishFromUnknown(meta?.rating) ?? readNumberishFromUnknown(desktop?.meta?.rating),
    rating_count: meta?.rating_count ?? desktop?.meta?.rating_count,
  };
}

function extractFacetLabel(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const [label] = value.split("@@");
  return label?.trim() || undefined;
}

function readNumberish(document: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = document[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const normalized = value.replace(/,/g, "").trim();
      if (!normalized) continue;
      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}

function readBooleanLike(value: unknown): boolean {
  if (value === true || value === false) return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function readNumberishFromUnknown(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readPositiveIntEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}

function readBooleanEnv(name: string): boolean {
  const raw = process.env[name];
  if (!raw) return false;
  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}
