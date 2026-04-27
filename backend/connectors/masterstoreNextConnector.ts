import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts } from "./extractors.js";
import { compactText, extractDomain } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft, ProductVariantDraft } from "../shared/catalog/types.js";

interface MasterstoreListResponse {
  count?: number;
  next?: string | null;
  previous?: string | null;
  pages_number?: number;
  results?: unknown[];
}

interface MasterstoreListItem {
  id?: number;
  name?: string;
  price_type?: string;
  main_image?: string | null;
  slug?: string;
  brand?: number;
  sub_category?: number;
  video_url?: string | null;
  top_pics?: boolean;
  new?: boolean;
  is_accessory?: boolean;
  discount?: boolean;
  pre_order?: boolean;
}

interface MasterstoreDetailColor {
  id?: number;
  name?: string;
  color?: string;
  color_hex_code?: string;
}

interface MasterstoreDetailSize {
  id?: number;
  size?: string;
  order?: number;
}

interface MasterstoreDetail {
  id?: number;
  name?: string;
  price_type?: string;
  brand_name?: string;
  main_image?: string | null;
  slug?: string;
  brand?: number;
  sub_category?: number;
  new?: boolean;
  products_list?: Array<{ id?: number; name?: string; slug?: string; main_image?: string | null }>;
  product_entries?: number[];
  is_accessory?: boolean;
  order_info?: Record<string, unknown>;
  discount?: boolean;
  pre_order?: boolean;
  static_file?: Record<string, unknown> | null;
  is_comparable?: boolean;
  is_educational_discount_eligible?: boolean;
  colors?: MasterstoreDetailColor[];
  sizes?: MasterstoreDetailSize[];
}

export const masterstoreNextConnector: CatalogConnector = {
  type: "masterstore_next",

  async probe({ homepageHtml, homepageUrl, store }) {
    const domain = extractDomain(store.website ?? homepageUrl);
    if (!domain || !/masterstoreiq\.com$/i.test(domain)) return null;

    const signals = [
      homepageHtml.includes("__NEXT_DATA__") ? "next_data" : "",
      homepageHtml.includes("/_next/static/") ? "next_static" : "",
      /Master Store/i.test(homepageHtml) ? "masterstore_brand" : "",
    ].filter(Boolean);

    return {
      connectorType: "masterstore_next",
      confidence: signals.length >= 2 ? 0.97 : 0.85,
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
        products: buildMasterstoreApiListUrl(homepageUrl, 1),
      },
    };
  },

  async sync({ store, client, profile }) {
    const websiteUrl = store.website ?? "";
    const firstPageUrl = profile.endpoints.products ?? buildMasterstoreApiListUrl(websiteUrl, 1);
    const firstPage = await fetchMasterstoreListPage(client, firstPageUrl);
    const firstProducts = (firstPage.results ?? [])
      .map((item) => toMasterstoreBaseProduct(store.id, websiteUrl, item))
      .filter((product): product is CatalogProductDraft => Boolean(product));

    const totalPages =
      typeof firstPage.pages_number === "number" && Number.isFinite(firstPage.pages_number)
        ? Math.max(1, firstPage.pages_number)
        : Math.max(1, Math.ceil((firstPage.count ?? firstProducts.length) / Math.max(firstProducts.length, 1)));

    const pages = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => index + 2);
    const pagedProducts = await mapWithConcurrency(pages, 6, async (page) => {
      const response = await fetchMasterstoreListPage(client, buildMasterstoreApiListUrl(websiteUrl, page));
      return (response.results ?? [])
        .map((item) => toMasterstoreBaseProduct(store.id, websiteUrl, item))
        .filter((product): product is CatalogProductDraft => Boolean(product));
    });

    const baseProducts = dedupeCatalogProducts([...firstProducts, ...pagedProducts.flat()]);
    const detailResults = await mapWithConcurrency(baseProducts, 8, async (product) => {
      const detail = await fetchMasterstoreDetail(client, websiteUrl, product.sourceProductId);
      return extractMasterstoreDetails(product, detail);
    });

    const products = dedupeCatalogProducts(detailResults.flatMap((result) => result.products));
    const variants = detailResults.flatMap((result) => result.variants);

    return {
      products,
      variants,
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: firstPage.count ?? products.length,
      snapshots: [
        {
          label: "products_api",
          payload: {
            firstPageUrl,
            totalPages,
            count: firstPage.count ?? products.length,
            collectedProducts: baseProducts.length,
          },
        },
      ],
    };
  },
};

function fetchMasterstoreListPage(
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
  url: string,
): Promise<MasterstoreListResponse> {
  return client.fetchJson(url) as Promise<MasterstoreListResponse>;
}

function fetchMasterstoreDetail(
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
  websiteUrl: string,
  slug: string,
): Promise<MasterstoreDetail> {
  return client.fetchJson(buildMasterstoreApiDetailUrl(websiteUrl, slug)) as Promise<MasterstoreDetail>;
}

function buildMasterstoreApiBaseUrl(websiteUrl: string): string {
  return "https://backend.masterstoreiq.com/en/api";
}

function buildMasterstoreApiListUrl(websiteUrl: string, page: number): string {
  const apiBase = buildMasterstoreApiBaseUrl(websiteUrl);
  return `${apiBase}/products/?page=${page}`;
}

function buildMasterstoreApiDetailUrl(websiteUrl: string, slug: string): string {
  const apiBase = buildMasterstoreApiBaseUrl(websiteUrl);
  return `${apiBase}/products/${encodeURIComponent(slug)}/`;
}

function toMasterstoreBaseProduct(
  storeId: string,
  websiteUrl: string,
  item: unknown,
): CatalogProductDraft | null {
  const now = new Date().toISOString();
  if (typeof item !== "object" || item === null || Array.isArray(item)) return null;
  const product = item as MasterstoreListItem;
  const slug = typeof product.slug === "string" ? product.slug : "";
  if (!slug) return null;
  return {
    storeId,
    sourceProductId: slug,
    normalizedTitle: compactText(String(product.name ?? slug)),
    title: String(product.name ?? slug),
    brand: undefined,
    model: undefined,
    sku: undefined,
    categoryPath: [],
    sourceUrl: new URL(`/product/${slug}`, websiteUrl).toString(),
    imageUrl: typeof product.main_image === "string" ? product.main_image : undefined,
    availability: product.pre_order ? "preorder" : "unknown",
    currency: "IQD",
    livePrice: undefined,
    originalPrice: undefined,
    onSale: Boolean(product.discount),
    sourceConnector: "masterstore_next",
    freshnessAt: now,
    lastSeenAt: now,
    brandTokens: [],
    modelTokens: [],
    skuTokens: [],
    rawPayload: product as Record<string, unknown>,
  };
}

function extractMasterstoreDetails(
  baseProduct: CatalogProductDraft,
  detail: MasterstoreDetail,
): { products: CatalogProductDraft[]; variants: ProductVariantDraft[] } {
  if (!detail || typeof detail !== "object") {
    return { products: [baseProduct], variants: [] };
  }

  const colors = Array.isArray(detail.colors) ? detail.colors : [];
  const sizes = Array.isArray(detail.sizes) ? detail.sizes : [];
  const entryIds = Array.isArray(detail.product_entries) ? detail.product_entries : [];

  const combinations =
    colors.length > 0 && sizes.length > 0
      ? colors.flatMap((color) => sizes.map((size) => ({ color, size })))
      : colors.length > 0
        ? colors.map((color) => ({ color, size: undefined }))
        : sizes.length > 0
          ? sizes.map((size) => ({ color: undefined, size }))
          : [];

  const variants: ProductVariantDraft[] =
    combinations.length > 0
      ? combinations.map((combo, index) => {
          const color = combo.color?.color?.trim() || undefined;
          const size = combo.size?.size?.trim() || undefined;
          const sourceVariantId = String(entryIds[index] ?? `${baseProduct.sourceProductId}:${color ?? ""}:${size ?? ""}`);
          return {
            productSourceId: baseProduct.sourceProductId,
            sourceVariantId,
            title: [baseProduct.title, color, size].filter(Boolean).join(" / "),
            sku: undefined,
            availability: detail.pre_order ? "preorder" : "unknown",
            livePrice: undefined,
            originalPrice: undefined,
            attributes: {
              ...(color ? { color } : {}),
              ...(size ? { size } : {}),
            },
            lastSeenAt: baseProduct.lastSeenAt,
            rawPayload: {
              entryId: entryIds[index],
              color: combo.color,
              size: combo.size,
            },
          };
        })
      : [];

  const inStock = variants.some((variant) => variant.availability === "in_stock");
  const availability: CatalogProductDraft["availability"] = inStock
    ? "in_stock"
    : detail.pre_order
      ? "preorder"
      : "unknown";

  const product: CatalogProductDraft = {
    ...baseProduct,
    storeId: baseProduct.storeId,
    title: detail.name || baseProduct.title,
    normalizedTitle: compactText(detail.name || baseProduct.title),
    brand: detail.brand_name || baseProduct.brand,
    sku: variants[0]?.sku,
    livePrice: undefined,
    originalPrice: undefined,
    availability,
    categoryPath: inferMasterstoreCategoryPath(detail),
    imageUrl: detail.main_image ?? baseProduct.imageUrl,
    rawPayload: detail as Record<string, unknown>,
  };

  return { products: [product], variants };
}

function inferMasterstoreCategoryPath(detail: MasterstoreDetail): string[] {
  if (typeof detail.sub_category === "number") {
    return [`sub_category:${detail.sub_category}`];
  }
  return [];
}

function minNumber(values: Array<number | undefined>): number | undefined {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (filtered.length === 0) return undefined;
  return Math.min(...filtered);
}

function dedupeCatalogProducts(products: CatalogProductDraft[]): CatalogProductDraft[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.sourceProductId)) return false;
    seen.add(product.sourceProductId);
    return true;
  });
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  handler: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
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
