import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts } from "./extractors.js";
import { compactText, extractDomain, nowIso, parseNumberish } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft } from "../shared/catalog/types.js";

interface AlwafiPagination {
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  limit?: number;
}

const API_BASE_URL = "https://www.api.alwafi.net";
const DEFAULT_PAGE_SIZE = 100;

export const alwafiApiConnector: CatalogConnector = {
  type: "alwafi_api",

  async probe({ homepageHtml, homepageUrl, store }) {
    const domain = extractDomain(store.website ?? homepageUrl);
    if (!domain || !/alwafi\.net$/i.test(domain)) return null;

    const signals = [
      /<script[^>]+src="\/assets\/index-[^"]+\.js"/i.test(homepageHtml) ? "vite_bundle" : "",
      /Alwafi for Computers/i.test(homepageHtml) ? "brand_marker" : "",
      homepageHtml.includes("Noto Sans Arabic") ? "spa_fonts" : "",
    ].filter(Boolean);

    return {
      connectorType: "alwafi_api",
      confidence: signals.length >= 2 ? 0.95 : 0.84,
      signals,
      capabilities: {
        supportsStructuredApi: true,
        supportsHtmlCatalog: false,
        supportsOffers: true,
        supportsVariants: false,
        supportsMarketplaceContext: false,
        fallbackToBrowser: false,
      },
      endpoints: {
        products: `${API_BASE_URL}/api/products?page=1&limit=${DEFAULT_PAGE_SIZE}`,
      },
    };
  },

  async sync({ store, client, profile }) {
    const productsEndpoint = profile.endpoints.products ?? `${API_BASE_URL}/api/products?page=1&limit=${DEFAULT_PAGE_SIZE}`;
    const pageSize = DEFAULT_PAGE_SIZE;
    const pageSummaries: Array<{ page: number; count: number }> = [];
    const drafts: CatalogProductDraft[] = [];

    let totalPages = 1;
    let totalItems = 0;

    for (let page = 1; page <= totalPages; page++) {
      const url = buildProductsUrl(productsEndpoint, page, pageSize);
      const payload = await client.fetchJson(url);
      const { items, pagination } = extractAlwafiPage(payload);
      pageSummaries.push({ page, count: items.length });
      totalPages = pagination.totalPages ?? totalPages;
      totalItems = pagination.totalItems ?? totalItems;

      for (const item of items) {
        const product = normalizeAlwafiProduct(store.id, store.website ?? homepageUrlFallback(productsEndpoint), item);
        if (product) drafts.push(product);
      }

      if (items.length === 0) break;
    }

    const products = dedupeProducts(drafts);

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: Math.max(products.length, totalItems),
      snapshots: [
        {
          label: "products_api_pages",
          payload: pageSummaries,
        },
      ],
    };
  },
};

function buildProductsUrl(baseUrl: string, page: number, limit: number): string {
  const url = new URL(baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(limit));
  return url.toString();
}

function extractAlwafiPage(payload: unknown): {
  items: Record<string, unknown>[];
  pagination: AlwafiPagination;
} {
  if (!isRecord(payload)) {
    return { items: [], pagination: {} };
  }

  const items = Array.isArray(payload.products)
    ? payload.products.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
  const pagination = isRecord(payload.pagination) ? (payload.pagination as AlwafiPagination) : {};

  return { items, pagination };
}

function normalizeAlwafiProduct(
  storeId: string,
  baseUrl: string,
  item: Record<string, unknown>,
): CatalogProductDraft | null {
  if (item.hidden === true || item.approved === false) return null;

  const id = stringify(item._id);
  const title = stringify(item.name);
  if (!id || !title) return null;

  const price = parseNumberish(item.price);
  const discountAmount = parseNumberish(item.discountPrice) ?? 0;
  const livePrice = typeof price === "number" ? Math.max(price - discountAmount, 0) : undefined;
  const originalPrice = typeof price === "number" ? price : undefined;
  const imageUrl = firstAbsoluteImage(item.images, baseUrl);
  const now = nowIso();

  return {
    storeId,
    sourceProductId: id,
    normalizedTitle: compactText(title),
    title,
    brand: stringify(item.brand) ?? undefined,
    model: undefined,
    sku: stringify(item.sku) ?? undefined,
    categoryPath: stringify(item.category) ? [String(item.category)] : [],
    sourceUrl: new URL(`/product/${id}`, baseUrl).toString(),
    imageUrl,
    availability: (parseNumberish(item.countInStock) ?? 0) > 0 ? "in_stock" : "out_of_stock",
    currency: "IQD",
    livePrice,
    originalPrice,
    onSale: discountAmount > 0,
    sourceConnector: "alwafi_api",
    freshnessAt: now,
    lastSeenAt: now,
    offerLabel: discountAmount > 0 ? "Sale" : undefined,
    offerStartsAt: undefined,
    offerEndsAt: undefined,
    brandTokens: stringify(item.brand) ? [compactText(String(item.brand))] : [],
    modelTokens: [],
    skuTokens: stringify(item.sku) ? [compactText(String(item.sku))] : [],
    rawPayload: item,
  };
}

function firstAbsoluteImage(value: unknown, baseUrl: string): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const first = value.find((item) => typeof item === "string" && item.trim());
  if (typeof first !== "string") return undefined;
  try {
    return new URL(first, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function dedupeProducts(products: CatalogProductDraft[]): CatalogProductDraft[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.sourceProductId)) return false;
    seen.add(product.sourceProductId);
    return true;
  });
}

function homepageUrlFallback(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}/`;
  } catch {
    return "https://alwafi.net/";
  }
}

function stringify(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
