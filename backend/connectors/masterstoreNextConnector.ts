import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts, extractNextPageProps } from "./extractors.js";
import { compactText, extractDomain } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft, ProductVariantDraft } from "../shared/catalog/types.js";

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
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: true,
        supportsMarketplaceContext: false,
        fallbackToBrowser: false,
      },
      endpoints: {
        products: new URL("/shop?page=1", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const baseUrl = store.website ?? profile.endpoints.products ?? "";
    const firstPageUrl = profile.endpoints.products ?? new URL("/shop?page=1", baseUrl).toString();
    const firstHtml = await client.fetchText(firstPageUrl);
    const firstPageProps = extractNextPageProps(firstHtml);
    const firstProducts = extractMasterstoreProducts(store.id, firstPageProps, baseUrl);
    const productsCount = Number(firstPageProps?.productsCount ?? firstProducts.length);
    const pageSize = Math.max(firstProducts.length, 1);
    const totalPages = Math.max(1, Math.ceil(productsCount / pageSize));

    const shopPages = Array.from({ length: totalPages }, (_, index) => index + 1);
    const shopProducts = await mapWithConcurrency(shopPages, 8, async (page) => {
      const url = new URL(`/shop?page=${page}`, baseUrl).toString();
      const html = page === 1 ? firstHtml : await client.fetchText(url);
      const pageProps = page === 1 ? firstPageProps : extractNextPageProps(html);
      return extractMasterstoreProducts(store.id, pageProps, baseUrl);
    });

    const baseProducts = dedupeCatalogProducts(shopProducts.flat());
    const detailResults = await mapWithConcurrency(baseProducts, 10, async (product) => {
      const html = await client.fetchText(product.sourceUrl);
      const pageProps = extractNextPageProps(html);
      return extractMasterstoreDetails(product, pageProps, html);
    });

    const products = dedupeCatalogProducts(detailResults.flatMap((result) => result.products));
    const variants = detailResults.flatMap((result) => result.variants);

    return {
      products,
      variants,
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: productsCount,
      snapshots: [
        { label: "shop_first_page", payload: { url: firstPageUrl, productsCount, pageSize, totalPages } },
      ],
    };
  },
};

function extractMasterstoreProducts(
  storeId: string,
  pageProps: Record<string, unknown> | null,
  baseUrl: string,
): CatalogProductDraft[] {
  const rawProducts = Array.isArray(pageProps?.products) ? pageProps.products : [];
  const now = new Date().toISOString();
  const products: CatalogProductDraft[] = [];
  for (const product of rawProducts) {
    if (typeof product !== "object" || product === null || Array.isArray(product)) continue;
    const slug = typeof product.slug === "string" ? product.slug : "";
    if (!slug) continue;
    products.push({
      storeId,
      sourceProductId: String(product.id ?? slug),
      normalizedTitle: compactText(String(product.name ?? slug)),
      title: String(product.name ?? slug),
      brand: typeof product.brand_name === "string" ? product.brand_name : undefined,
      model: undefined,
      sku: undefined,
      categoryPath: [],
      sourceUrl: new URL(`/product/${slug}`, baseUrl).toString(),
      imageUrl: typeof product.main_image === "string" ? product.main_image : undefined,
      availability: "unknown",
      currency: "IQD",
      livePrice: undefined,
      originalPrice: undefined,
      onSale: Boolean(product.discount),
      sourceConnector: "masterstore_next",
      freshnessAt: now,
      lastSeenAt: now,
      brandTokens: typeof product.brand_name === "string" ? [compactText(product.brand_name)] : [],
      modelTokens: [],
      skuTokens: [],
      rawPayload: product,
    });
  }
  return products;
}

function extractMasterstoreDetails(
  baseProduct: CatalogProductDraft,
  pageProps: Record<string, unknown> | null,
  html: string,
): { products: CatalogProductDraft[]; variants: ProductVariantDraft[] } {
  const details = pageProps?.MainProductDetails;
  if (!details || typeof details !== "object" || Array.isArray(details)) {
    return { products: [baseProduct], variants: [] };
  }

  const rawDetails = details as Record<string, unknown>;
  const colors = Array.isArray(rawDetails.colors) ? rawDetails.colors : [];
  const variantEntries = colors.flatMap((color) =>
    typeof color === "object" && color && !Array.isArray(color) && Array.isArray((color as Record<string, unknown>).entries)
      ? ((color as Record<string, unknown>).entries as unknown[])
      : [],
  );

  const variants: ProductVariantDraft[] = variantEntries
    .filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null && !Array.isArray(entry))
    .map((entry) => {
      const size = entry.product_size && typeof entry.product_size === "object" && (entry.product_size as Record<string, unknown>).size
        ? String((entry.product_size as Record<string, unknown>).size)
        : "";
      const color = entry.product_color && typeof entry.product_color === "object" && (entry.product_color as Record<string, unknown>).color
        ? String((entry.product_color as Record<string, unknown>).color)
        : "";
      const availability = String(entry.availability ?? "");
      const livePrice = Number(entry.discounted_price ?? entry.price ?? 0) || undefined;
      const originalPrice = Number(entry.price_after_discount ?? entry.price ?? 0) || livePrice;
      return {
        productSourceId: baseProduct.sourceProductId,
        sourceVariantId: String(entry.id ?? `${baseProduct.sourceProductId}:${size}:${color}`),
        title: [baseProduct.title, color, size].filter(Boolean).join(" / "),
        sku: typeof entry.sku === "string" ? entry.sku : undefined,
        availability: /out of stock|not available|unavailable/i.test(availability) ? "out_of_stock" : "in_stock",
        livePrice,
        originalPrice,
        attributes: {
          ...(color ? { color } : {}),
          ...(size ? { size } : {}),
        },
        lastSeenAt: baseProduct.lastSeenAt,
        rawPayload: entry,
      };
    });

  const inStock = variants.some((variant) => variant.availability === "in_stock");
  const outOfStockFromPage = !inStock && /out of stock|Product isn't available/i.test(html);
  const availability: CatalogProductDraft["availability"] = inStock
    ? "in_stock"
    : outOfStockFromPage
      ? "out_of_stock"
      : "unknown";

  const product: CatalogProductDraft = {
    ...baseProduct,
    storeId: baseProduct.storeId,
    sku: variants[0]?.sku,
    livePrice: minNumber(variants.map((variant) => variant.livePrice)),
    originalPrice: minNumber(variants.map((variant) => variant.originalPrice)),
    availability,
    categoryPath: inferMasterstoreCategoryPath(pageProps),
    rawPayload: rawDetails,
  };

  return { products: [product], variants };
}

function inferMasterstoreCategoryPath(pageProps: Record<string, unknown> | null): string[] {
  const list = Array.isArray(pageProps?.dropDownProductsList) ? pageProps.dropDownProductsList : [];
  return list
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    .slice(0, 1)
    .flatMap((item) => (typeof item.name === "string" ? [item.name] : []));
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
