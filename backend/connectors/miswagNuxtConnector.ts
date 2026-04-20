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

  const products = dedupeProducts(
    documents
      .map((document) => normalizeMiswagTypesenseDocument(storeId, document))
      .filter((product): product is CatalogProductDraft => Boolean(product)),
  );

  return {
    found: firstPage.found,
    pageSize,
    pagesFetched: lastPage,
    products,
  };
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

function normalizeMiswagTypesenseDocument(storeId: string, document: Record<string, unknown>): CatalogProductDraft | null {
  const title =
    extractString(document, ["title_AR", "title_EN", "title", "name"]) ??
    undefined;
  const sourceUrl = extractString(document, ["url"]);
  const sourceProductId =
    extractString(document, ["id", "variation_id", "item_group_id", "alias"]) ??
    (sourceUrl ? compactText(sourceUrl) : undefined);
  if (!title || !sourceUrl || !sourceProductId) return null;

  const brand = extractString(document, ["brand"]) ?? extractFacetLabel(extractString(document, ["facet_brand"]));
  const sellerName = extractString(document, ["vendor"]) ?? extractFacetLabel(extractString(document, ["facet_merchant"]));
  const sellerId = extractString(document, ["vendor_alias"]);
  const sku = extractString(document, ["variation_id", "alias"]);
  const livePrice = readNumberish(document, ["price_numeric_value", "price_value"]);
  const originalPrice = readNumberish(document, ["price_original_value", "price_numeric_value"]) ?? livePrice;
  const onSale = readBooleanLike(document.is_on_sale) || (
    typeof livePrice === "number" &&
    typeof originalPrice === "number" &&
    originalPrice > livePrice
  );
  const lastSeenAt = nowIso();
  const freshnessAt = normalizeMiswagTimestamp(document) ?? lastSeenAt;

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
    categoryPath: extractMiswagCategoryPath(document),
    sourceUrl,
    imageUrl: extractString(document, ["image"]) ?? undefined,
    availability: extractMiswagAvailability(document),
    currency: extractString(document, ["price_currency"]) ?? "IQD",
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
    rawPayload: buildMiswagRawPayload(document),
  };
}

function extractMiswagCategoryPath(document: Record<string, unknown>): string[] {
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

function extractMiswagAvailability(document: Record<string, unknown>): CatalogProductDraft["availability"] {
  if (readBooleanLike(document.pre_order)) return "preorder";
  if ("availability" in document) {
    return readBooleanLike(document.availability) ? "in_stock" : "out_of_stock";
  }
  return "unknown";
}

function normalizeMiswagTimestamp(document: Record<string, unknown>): string | undefined {
  const published = extractString(document, ["published"]);
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

function buildMiswagRawPayload(document: Record<string, unknown>): Record<string, unknown> {
  return {
    id: extractString(document, ["id"]),
    alias: extractString(document, ["alias"]),
    item_group_id: extractString(document, ["item_group_id"]),
    variation_id: extractString(document, ["variation_id"]),
    title_AR: extractString(document, ["title_AR"]),
    title_EN: extractString(document, ["title_EN"]),
    short_description: extractString(document, ["short_description"]),
    description: extractString(document, ["description"]),
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

function readPositiveIntEnv(name: string): number | undefined {
  const raw = process.env[name];
  if (!raw) return undefined;
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : undefined;
}
