import { connectorDefaultPriority } from "../shared/catalog/syncPolicy.js";
import { compactText, extractDomain, nowIso } from "../shared/catalog/normalization.js";
import { loadElryanUrlMap, resolveElryanMappedUrl } from "../shared/elryan/urlMap.js";
import type { CatalogProductDraft, SyncResult } from "../shared/catalog/types.js";
import type { CatalogConnector, ConnectorSyncContext } from "./base.js";

const ELRYAN_SITE_URL = "https://www.elryan.com";
const ELRYAN_STORE_CODE = "ar";
const ELRYAN_API_INDEX = `vue_storefront_magento_${ELRYAN_STORE_CODE}`;
const ELRYAN_API_BASE = `${ELRYAN_SITE_URL}/api/catalog/${ELRYAN_API_INDEX}`;
const ELRYAN_CATEGORY_ROOT_ID = 2;
const ELRYAN_SPECIAL_OFFERS_CATEGORY_ID = 64;
const ELRYAN_REQUESTED_PAGE_SIZE = Number(process.env.CATALOG_ELRYAN_PAGE_SIZE ?? "200");
const ELRYAN_PAGE_SIZE = Math.min(Math.max(Number.isFinite(ELRYAN_REQUESTED_PAGE_SIZE) ? ELRYAN_REQUESTED_PAGE_SIZE : 200, 1), 200);
const ELRYAN_MAX_PRODUCTS = Number(process.env.CATALOG_ELRYAN_MAX_PRODUCTS ?? "0");
const ELRYAN_IMAGE_SERVICE_BASE = `${ELRYAN_SITE_URL}/img/500/500/resize/catalog/product`;
const ELRYAN_PRODUCT_SOURCE_FIELDS = [
  "id",
  "sku",
  "slug",
  "url_key",
  "url_path",
  "name",
  "description",
  "image",
  "small_image",
  "thumbnail",
  "swatch_image",
  "media_gallery.image",
  "category.category_id",
  "category.name",
  "category_ids",
  "stock.qty",
  "stock.is_in_stock",
  "stock.stock_status",
  "regular_price",
  "original_price",
  "final_price",
  "special_price",
  "updated_at",
].join(",");

interface SearchHit<T> {
  _source?: T;
}

interface SearchResponse<T> {
  hits?: {
    total?: number | { value?: number };
    hits?: Array<SearchHit<T>>;
  };
}

interface ElryanCategory {
  id: number;
  name?: string;
  parent_id?: number;
  product_count?: number;
  is_active?: boolean;
}

interface ElryanMediaGalleryEntry {
  image?: string;
}

interface ElryanProduct {
  id?: number | string;
  sku?: string;
  slug?: string;
  url_key?: string;
  url_path?: string;
  name?: string;
  description?: string;
  image?: string;
  small_image?: string;
  thumbnail?: string;
  swatch_image?: string;
  media_gallery?: ElryanMediaGalleryEntry[];
  category?: Array<{ category_id?: number; name?: string }>;
  category_ids?: number[];
  stock?: {
    qty?: number;
    is_in_stock?: boolean;
    stock_status?: number;
  };
  regular_price?: number | string;
  original_price?: number | string;
  final_price?: number | string;
  special_price?: number | string;
  updated_at?: string;
  [key: string]: unknown;
}

export const elryanApiConnector: CatalogConnector = {
  type: "elryan_api",

  async probe({ homepageHtml, homepageUrl, store }) {
    const domain = extractDomain(store.website ?? homepageUrl);
    if (!domain || !/elryan\.com$/i.test(domain)) return null;

    const signals = [
      homepageHtml.includes("__INITIAL_STATE__") ? "initial_state" : "",
      homepageHtml.includes("/dist/vsf-") ? "vsf_bundle" : "",
      homepageHtml.includes('"api":{"url":"https://www.elryan.com"}') ? "api_url_marker" : "",
      homepageHtml.includes('"images":{"useExactUrlsNoProxy":false') ? "image_service_config" : "",
      /elryan/i.test(homepageHtml) ? "brand_marker" : "",
    ].filter(Boolean);

    return {
      connectorType: "elryan_api",
      confidence: signals.length >= 4 ? 0.99 : 0.96,
      signals,
      capabilities: {
        supportsStructuredApi: true,
        supportsHtmlCatalog: false,
        supportsOffers: true,
        supportsVariants: true,
        supportsMarketplaceContext: false,
        fallbackToBrowser: false,
      },
      endpoints: {
        categories: buildElryanCategoriesUrl(),
        products: buildElryanProductsUrl(),
      },
    };
  },

  async sync({ store, client }: ConnectorSyncContext): Promise<SyncResult> {
    const categories = await fetchAllCategories(client);
    const urlMap = loadElryanUrlMap();
    const rootCategories = [...categories.values()]
      .filter((category) => category.parent_id === ELRYAN_CATEGORY_ROOT_ID)
      .filter((category) => category.id !== ELRYAN_SPECIAL_OFFERS_CATEGORY_ID)
      .sort((a, b) => (b.product_count ?? 0) - (a.product_count ?? 0));

    const productsById = new Map<string, CatalogProductDraft>();
    let fetchedRows = 0;
    let lastProductId: number | undefined;

    while (true) {
      const response = await client.fetchJson(
        buildElryanProductsUrl(lastProductId),
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "cache-control": "no-store, no-cache, max-age=0",
            pragma: "no-cache",
            referer: `${ELRYAN_SITE_URL}/${ELRYAN_STORE_CODE}/`,
          },
          body: JSON.stringify(buildElryanProductsQuery(lastProductId)),
        },
      ) as SearchResponse<ElryanProduct>;

      const rows = (response.hits?.hits ?? [])
        .map((hit) => hit._source)
        .filter((row): row is ElryanProduct => Boolean(row));

      if (rows.length === 0) break;
      fetchedRows += rows.length;

      for (const row of rows) {
        const product = mapElryanProduct(store.id, categories, row);
        if (!product) continue;
        productsById.set(product.sourceProductId, product);
      }

      const nextProductId = rows
        .map((row) => toNumber(row.id))
        .filter((id): id is number => typeof id === "number")
        .at(-1);
      if (nextProductId == null || nextProductId === lastProductId) break;
      lastProductId = nextProductId;
      if (rows.length < ELRYAN_PAGE_SIZE) break;
      if (ELRYAN_MAX_PRODUCTS > 0 && productsById.size >= ELRYAN_MAX_PRODUCTS) break;
    }

    const products = [...productsById.values()];
    const offers = products
      .filter((product) => product.onSale)
      .map((product) => ({
        productSourceId: product.sourceProductId,
        label: product.offerLabel,
        discountAmount:
          product.livePrice != null && product.originalPrice != null
            ? product.originalPrice - product.livePrice
            : undefined,
        discountPercent:
          product.livePrice != null &&
          product.originalPrice != null &&
          product.originalPrice > 0 &&
          product.originalPrice > product.livePrice
            ? Math.round(((product.originalPrice - product.livePrice) / product.originalPrice) * 100)
            : undefined,
        active: true,
        lastSeenAt: product.lastSeenAt,
        metadata: { source: "elryan_api" },
      }));

    return {
      products,
      variants: [],
      offers,
      estimatedCatalogSize: Math.max(products.length, fetchedRows),
      snapshots: [
        {
          label: "summary",
          payload: {
            source: ELRYAN_API_BASE,
            storeCode: ELRYAN_STORE_CODE,
            topLevelCategories: rootCategories.map((category) => ({
              id: category.id,
              name: category.name,
              productCount: category.product_count ?? 0,
            })),
            fetchedRows,
            uniqueProducts: products.length,
            lastProductId,
            maxProducts: ELRYAN_MAX_PRODUCTS || null,
            urlMap: urlMap
              ? {
                  path: urlMap.path,
                  urls: urlMap.size,
                }
              : null,
          },
        },
      ],
    };
  },
};

export const elryanApiDefaultPriority = connectorDefaultPriority("elryan_api");

function buildElryanCategoriesUrl() {
  return (
    `${ELRYAN_API_BASE}/category/_search` +
    "?_source_include=id,name,parent_id,product_count,is_active" +
    "&from=0&size=4000&sort=position:asc"
  );
}

function buildElryanProductsUrl(lastProductId?: number) {
  return (
    `${ELRYAN_API_BASE}/product/_search` +
    `?_source_include=${encodeURIComponent(ELRYAN_PRODUCT_SOURCE_FIELDS)}` +
    `&from=0&size=${ELRYAN_PAGE_SIZE}&sort=id:asc` +
    `&preference=hayr_v2_after_${lastProductId ?? 0}`
  );
}

function buildElryanProductsQuery(lastProductId?: number) {
  const must: unknown[] = [
    { terms: { visibility: [2, 3, 4] } },
    { terms: { status: [1] } },
  ];
  if (lastProductId != null) {
    must.push({ range: { id: { gt: lastProductId } } });
  }

  return {
    query: {
      bool: {
        filter: {
          bool: {
            must,
          },
        },
      },
    },
  };
}

async function fetchAllCategories(client: ConnectorSyncContext["client"]) {
  const response = await client.fetchJson(
    buildElryanCategoriesUrl(),
    {
      method: "POST",
      body: JSON.stringify({
        query: {
          bool: {
            filter: {
              terms: {
                is_active: [true],
              },
            },
          },
        },
      }),
    },
  ) as SearchResponse<ElryanCategory>;

  return new Map(
    (response.hits?.hits ?? [])
      .map((hit) => hit._source)
      .filter((category): category is ElryanCategory => Boolean(category && typeof category.id === "number"))
      .map((category) => [category.id, category]),
  );
}

function mapElryanProduct(
  storeId: string,
  categoriesById: Map<number, ElryanCategory>,
  row: ElryanProduct,
): CatalogProductDraft | null {
  const sourceProductId = row.id != null ? String(row.id).trim() : "";
  const title = row.name?.trim();
  if (!sourceProductId || !title) return null;

  const livePrice =
    toNumber(row.final_price) ??
    toNumber(row.special_price) ??
    toNumber(row.original_price) ??
    toNumber(row.regular_price);
  const originalPrice =
    toNumber(row.original_price) ??
    toNumber(row.regular_price);
  const images = buildElryanImageCandidates(row);
  const imageUrl = images[0];
  const timestamp = row.updated_at ? new Date(row.updated_at).toISOString() : nowIso();

  return {
    storeId,
    sourceProductId,
    normalizedTitle: compactText(title),
    title,
    brand: undefined,
    model: undefined,
    sku: row.sku?.trim() || undefined,
    sellerName: "ElRyan",
    sellerId: "elryan",
    categoryPath: mapCategoryPath(row, categoriesById),
    sourceUrl: buildElryanProductUrl(row),
    imageUrl,
    primaryImageUrl: imageUrl,
    images,
    availability: mapAvailability(row),
    currency: "IQD",
    livePrice,
    originalPrice,
    onSale: typeof livePrice === "number" && typeof originalPrice === "number" && originalPrice > livePrice,
    sourceConnector: "elryan_api",
    freshnessAt: timestamp,
    lastSeenAt: timestamp,
    offerLabel:
      typeof livePrice === "number" &&
      typeof originalPrice === "number" &&
      originalPrice > livePrice
        ? "Sale"
        : undefined,
    brandTokens: [],
    modelTokens: [],
    skuTokens: row.sku?.trim() ? [compactText(row.sku)] : [],
    rawPayload: row as Record<string, unknown>,
  };
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function mapAvailability(row: ElryanProduct): CatalogProductDraft["availability"] {
  if (row.stock?.is_in_stock === true) return "in_stock";
  if (row.stock?.is_in_stock === false) return "out_of_stock";
  if (row.stock?.stock_status === 1) return "in_stock";
  if (row.stock?.stock_status === 0) return "out_of_stock";
  return "unknown";
}

function buildElryanProductUrl(row: ElryanProduct) {
  const mappedUrl = resolveElryanMappedUrl([
    row.url_path,
    row.slug,
    row.url_key,
    row.url_path?.replace(/^\/+/, ""),
    row.slug ? `${row.slug}.html` : undefined,
    row.url_key ? `${row.url_key}.html` : undefined,
  ]);
  if (mappedUrl) return mappedUrl;

  const path = String(row.url_path ?? row.slug ?? row.url_key ?? "").trim().replace(/^\/+/, "");
  if (!path) return `${ELRYAN_SITE_URL}/${ELRYAN_STORE_CODE}/`;
  return new URL(path, `${ELRYAN_SITE_URL}/${ELRYAN_STORE_CODE}/`).toString();
}

function buildElryanImageCandidates(row: ElryanProduct) {
  return [...new Set(
    [
      row.image,
      row.small_image,
      row.thumbnail,
      row.swatch_image,
      ...(row.media_gallery ?? []).map((entry) => entry.image),
    ]
      .map(toElryanRenderableImageUrl)
      .filter((url): url is string => Boolean(url)),
  )];
}

function toElryanRenderableImageUrl(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed === "no_selection" || trimmed === "Not found" || trimmed === "Image not found") return undefined;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      if (host === "s3.elryan.com") return undefined;
      if (host === "elryan.com") {
        if (parsed.pathname.startsWith("/img/")) return parsed.toString();
        const marker = "/catalog/product/";
        const index = parsed.pathname.indexOf(marker);
        if (index >= 0) return `${ELRYAN_IMAGE_SERVICE_BASE}/${parsed.pathname.slice(index + marker.length).replace(/^\/+/, "")}`;
        return undefined;
      }
      return parsed.toString();
    } catch {
      return undefined;
    }
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${ELRYAN_IMAGE_SERVICE_BASE}${normalized}`;
}

function mapCategoryPath(row: ElryanProduct, categoriesById: Map<number, ElryanCategory>) {
  const inline = (row.category ?? [])
    .map((entry) => entry.name?.trim())
    .filter((value): value is string => Boolean(value));
  if (inline.length > 0) return inline;

  const names = (row.category_ids ?? [])
    .map((id) => categoriesById.get(Number(id))?.name?.trim())
    .filter((value): value is string => Boolean(value));
  return names.length > 0 ? names : ["Uncategorized"];
}
