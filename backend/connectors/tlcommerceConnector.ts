import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts } from "./extractors.js";
import { compactText, extractDomain, nowIso, parseNumberish } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft } from "../shared/catalog/types.js";

interface TlcommerceMeta {
  current_page?: number;
  last_page?: number;
  total?: number;
  per_page?: number;
  path?: string;
}

const DEFAULT_PAGE_SIZE = 1000;

export const tlcommerceConnector: CatalogConnector = {
  type: "tlcommerce_api",

  async probe({ homepageHtml, homepageUrl }) {
    const domain = extractDomain(homepageUrl);
    if (!domain) return null;

    const signals = [
      homepageHtml.includes("/api/theme/tlcommerce/") ? "tlcommerce_theme_api" : "",
      homepageHtml.includes("themes/tlcommerce/public/js/main.js") ? "tlcommerce_theme_bundle" : "",
      homepageHtml.includes("/api/v1/ecommerce-core/site-properties") ? "ecommerce_core_api" : "",
    ].filter(Boolean);

    if (signals.length === 0) return null;

    return {
      connectorType: "tlcommerce_api",
      confidence: signals.length >= 2 ? 0.95 : 0.84,
      signals,
      capabilities: {
        supportsStructuredApi: true,
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: false,
        supportsMarketplaceContext: false,
        fallbackToBrowser: false,
      },
      endpoints: {
        products: new URL("/api/v1/ecommerce-core/products", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const endpoint = profile.endpoints.products ?? new URL("/api/v1/ecommerce-core/products", store.website ?? "https://example.com/").toString();
    const baseUrl = store.website ?? homepageUrlFallback(endpoint);
    const pageSummaries: Array<{ page: number; count: number }> = [];
    const drafts: CatalogProductDraft[] = [];

    let totalPages = 1;
    let totalItems = 0;

    for (let page = 1; page <= totalPages; page++) {
      const payload = await client.fetchJson(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json,text/plain,*/*",
        },
        body: JSON.stringify({
          perPage: DEFAULT_PAGE_SIZE,
          page,
          rating: null,
          sorting: "newest",
        }),
      });

      const { items, meta } = extractTlcommercePage(payload);
      pageSummaries.push({ page, count: items.length });
      totalPages = meta.last_page ?? totalPages;
      totalItems = meta.total ?? totalItems;

      for (const item of items) {
        const product = normalizeTlcommerceProduct(store.id, baseUrl, item);
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

function extractTlcommercePage(payload: unknown): {
  items: Record<string, unknown>[];
  meta: TlcommerceMeta;
} {
  if (!isRecord(payload)) {
    return { items: [], meta: {} };
  }

  const items = Array.isArray(payload.data)
    ? payload.data.filter((item): item is Record<string, unknown> => isRecord(item))
    : [];
  const meta = isRecord(payload.meta) ? (payload.meta as TlcommerceMeta) : {};

  return { items, meta };
}

function normalizeTlcommerceProduct(
  storeId: string,
  baseUrl: string,
  item: Record<string, unknown>,
): CatalogProductDraft | null {
  const id = stringify(item.id);
  const title = stringify(item.name);
  const slug = stringify(item.slug);
  if (!id || !title || !slug) return null;

  const price = parseNumberish(item.price) ?? parseNumberish(item.base_price);
  const discount = isRecord(item.discount) ? item.discount : {};
  const discountAmount = parseNumberish(discount.discount_amount) ?? 0;
  const discountType = parseNumberish(discount.discountType ?? discount.discount_type) ?? 0;
  const livePrice = applyDiscount(price, discountAmount, discountType);
  const originalPrice = typeof price === "number" ? price : undefined;
  const quantity = parseNumberish(item.quantity) ?? 0;
  const preOrder = item.pre_order === true || item.pre_order === 1 || item.pre_order === "1";
  const now = nowIso();
  const images = collectTlcommerceImages(item, baseUrl);

  return {
    storeId,
    sourceProductId: id,
    normalizedTitle: compactText(title),
    title,
    brand: stringify(item.brand_name) ?? undefined,
    model: undefined,
    sku: undefined,
    sellerId: stringify(item.seller) ?? undefined,
    categoryPath: [],
    sourceUrl: new URL(`/products/${slug}`, baseUrl).toString(),
    imageUrl: images[0],
    primaryImageUrl: images[0],
    images,
    availability: preOrder ? "preorder" : quantity > 0 ? "in_stock" : "out_of_stock",
    currency: "IQD",
    livePrice,
    originalPrice,
    onSale: discountAmount > 0 && typeof price === "number" && typeof livePrice === "number" && livePrice < price,
    sourceConnector: "tlcommerce_api",
    freshnessAt: now,
    lastSeenAt: now,
    offerLabel: discountAmount > 0 ? "Sale" : undefined,
    offerStartsAt: undefined,
    offerEndsAt: undefined,
    brandTokens: stringify(item.brand_name) ? [compactText(String(item.brand_name))] : [],
    modelTokens: [],
    skuTokens: [],
    rawPayload: item,
  };
}

function collectTlcommerceImages(item: Record<string, unknown>, baseUrl: string): string[] {
  const gallery = Array.isArray(item.gallery) ? item.gallery : Array.isArray(item.images) ? item.images : [];
  const values = [
    item.image_from_gallery,
    item.main_image,
    item.thumbnail_image,
    ...gallery,
  ];

  return [...new Set(
    values
      .map((value) => absolutize(value, baseUrl))
      .filter((value): value is string => typeof value === "string" && value.length > 0),
  )];
}

function applyDiscount(
  price: number | undefined,
  discountAmount: number,
  discountType: number,
): number | undefined {
  if (typeof price !== "number") return undefined;
  if (discountAmount <= 0) return price;

  if (discountType === 1) {
    return Math.max(0, Math.round(price - (price * discountAmount) / 100));
  }

  return Math.max(0, price - discountAmount);
}

function absolutize(value: unknown, baseUrl: string): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    return new URL(value, baseUrl).toString();
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
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.host}/`;
}

function stringify(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
