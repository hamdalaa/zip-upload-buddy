import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts, dedupeProducts } from "./extractors.js";
import { compactText, extractDomain, nowIso, tokenizeModel } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft } from "../shared/catalog/types.js";

const ALNOMOOR_DEFAULT_PAGE_SIZE = 200;

interface AlnomoorProduct {
  id?: string;
  titleAr?: string;
  titleEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  price?: number | string | null;
  comparePrice?: number | string | null;
  wholesalePrice?: number | string | null;
  isInstallmentAvailable?: boolean;
  keywords?: string[];
  points?: number;
  isPublished?: boolean;
  isFeatured?: boolean;
  isDownPaymentRequired?: boolean;
  isWarrantyAvailable?: boolean;
  warrantyMonths?: number;
  warrantyNote?: string;
  previewId?: string;
  categoryId?: string | null;
  brandId?: string | null;
  orderCount?: number;
  createdAt?: string;
  preview?: {
    key?: string;
  } | null;
  brand?: {
    id?: string;
    nameEn?: string;
    nameAr?: string;
  } | null;
}

interface AlnomoorProductsListPayload {
  total?: number;
  data?: AlnomoorProduct[];
}

interface AlnomoorTrpcResponse<T> {
  result?: {
    data?: {
      json?: T;
    };
  };
}

interface AlnomoorCategory {
  id?: string;
  nameEn?: string;
  nameAr?: string;
  parentId?: string | null;
  parent?: AlnomoorCategory | null;
}

export const alnomoorTrpcConnector: CatalogConnector = {
  type: "alnomoor_trpc",

  async probe({ homepageHtml, homepageUrl, store }) {
    const domain = extractDomain(store.website ?? homepageUrl);
    if (!domain || !/alnomoor\.com$/i.test(domain)) return null;

    const signals = [
      homepageHtml.includes("/api/trpc") ? "trpc_client" : "",
      homepageHtml.includes("api.products.list") ? "products_list_procedure" : "",
      homepageHtml.includes("api.categories.get") ? "categories_get_procedure" : "",
      homepageHtml.includes('href="/products"') ? "products_route" : "",
    ].filter(Boolean);

    return {
      connectorType: "alnomoor_trpc",
      confidence: signals.length >= 2 ? 0.98 : 0.86,
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
        products: buildAlnomoorProductsListUrl(1, ALNOMOOR_DEFAULT_PAGE_SIZE),
      },
    };
  },

  async sync({ store, client }) {
    const pageSize = readPositiveIntEnv("CATALOG_ALNOMOOR_PAGE_SIZE") ?? ALNOMOOR_DEFAULT_PAGE_SIZE;
    const firstPage = await fetchAlnomoorProductsPage(client, 1, pageSize);
    const total = firstPage.total ?? firstPage.data.length;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    const pages = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, index) => index + 2);
    const pageResults = await mapWithConcurrency(pages, 6, async (page) => fetchAlnomoorProductsPage(client, page, pageSize));
    const items = [...firstPage.data, ...pageResults.flatMap((page) => page.data)];

    const uniqueCategoryIds = [...new Set(items.map((item) => item.categoryId).filter((value): value is string => Boolean(value)))];
    const categoryMap = new Map<string, AlnomoorCategory>();
    const categories = await mapWithConcurrency(uniqueCategoryIds, 8, async (categoryId) => {
      try {
        const category = await fetchAlnomoorCategory(client, categoryId);
        return category ? [categoryId, category] as const : null;
      } catch {
        return null;
      }
    });
    for (const entry of categories) {
      if (!entry) continue;
      categoryMap.set(entry[0], entry[1]);
    }

    const products = dedupeProducts(
      items
        .map((item) => normalizeAlnomoorProduct(store.id, item, categoryMap.get(item.categoryId ?? "")))
        .filter((product): product is CatalogProductDraft => Boolean(product)),
    );

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: total,
      snapshots: [
        {
          label: "trpc_products_list",
          payload: {
            total,
            pageSize,
            totalPages,
            collectedItems: items.length,
            uniqueCategories: uniqueCategoryIds.length,
          },
        },
      ],
    };
  },
};

async function fetchAlnomoorProductsPage(
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
  page: number,
  pageSize: number,
): Promise<Required<AlnomoorProductsListPayload>> {
  const url = buildAlnomoorProductsListUrl(page, pageSize);
  const response = (await client.fetchJson(url)) as AlnomoorTrpcResponse<AlnomoorProductsListPayload>;
  const payload = response.result?.data?.json;
  return {
    total: typeof payload?.total === "number" ? payload.total : 0,
    data: Array.isArray(payload?.data) ? payload.data : [],
  };
}

function buildAlnomoorProductsListUrl(page: number, pageSize: number): string {
  const input = {
    json: {
      pagination: {
        page,
        pageSize,
      },
      sorting: {
        column: "orderCount",
        direction: "desc",
      },
      filters: {},
    },
  };
  return `https://alnomoor.com/api/trpc/products.list?input=${encodeURIComponent(JSON.stringify(input))}`;
}

async function fetchAlnomoorCategory(
  client: { fetchJson(url: string, init?: RequestInit): Promise<unknown> },
  categoryId: string,
): Promise<AlnomoorCategory | undefined> {
  const input = {
    json: {
      id: categoryId,
    },
  };
  const url = `https://alnomoor.com/api/trpc/categories.get?input=${encodeURIComponent(JSON.stringify(input))}`;
  const response = (await client.fetchJson(url)) as AlnomoorTrpcResponse<AlnomoorCategory>;
  return response.result?.data?.json;
}

function normalizeAlnomoorProduct(
  storeId: string,
  item: AlnomoorProduct,
  category?: AlnomoorCategory,
): CatalogProductDraft | null {
  const id = item.id?.trim();
  const title = item.titleAr?.trim() || item.titleEn?.trim();
  if (!id || !title) return null;

  const livePrice = readNumberish(item.price);
  const originalPrice = readNumberish(item.comparePrice) ?? livePrice;
  const brand = item.brand?.nameAr?.trim() || item.brand?.nameEn?.trim() || undefined;
  const categoryPath = buildCategoryPath(category);
  const imageUrl = item.preview?.key ? `https://alnomoor.com/api/storage/${item.preview.key}` : undefined;
  const description =
    item.descriptionAr?.trim() ||
    item.descriptionEn?.trim() ||
    undefined;
  const now = nowIso();

  return {
    storeId,
    sourceProductId: id,
    normalizedTitle: compactText(title),
    title,
    brand,
    model: undefined,
    sku: undefined,
    categoryPath,
    sourceUrl: `https://alnomoor.com/products/${id}`,
    imageUrl,
    availability: item.isPublished === false ? "out_of_stock" : "unknown",
    currency: "IQD",
    livePrice,
    originalPrice,
    onSale: typeof livePrice === "number" && typeof originalPrice === "number" && originalPrice > livePrice,
    sourceConnector: "alnomoor_trpc",
    freshnessAt: item.createdAt || now,
    lastSeenAt: now,
    offerLabel: undefined,
    offerStartsAt: undefined,
    offerEndsAt: undefined,
    brandTokens: brand ? tokenizeModel(brand) : [],
    modelTokens: [],
    skuTokens: [],
    rawPayload: {
      ...item,
      description,
      category,
    },
  };
}

function buildCategoryPath(category?: AlnomoorCategory): string[] {
  if (!category) return [];
  const path: string[] = [];
  let cursor: AlnomoorCategory | null | undefined = category;
  while (cursor) {
    const label = cursor.nameAr?.trim() || cursor.nameEn?.trim();
    if (label) path.unshift(label);
    cursor = cursor.parent;
  }
  return path;
}

function readNumberish(value: unknown): number | undefined {
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
