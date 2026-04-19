import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts, extractAbsoluteLinks } from "./extractors.js";
import { compactText, extractDomain, parseNumberish } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft } from "../shared/catalog/types.js";

const PRODUCT_LINK_PATTERN = /^https:\/\/www\.jibalzone\.com\/en\/product\//i;
const BRAND_LINK_PATTERN = /^https:\/\/www\.jibalzone\.com\/en\/brand\//i;

export const jibalzoneStorefrontConnector: CatalogConnector = {
  type: "jibalzone_storefront",

  async probe({ homepageHtml, homepageUrl, store }) {
    const domain = extractDomain(store.website ?? homepageUrl);
    if (!domain || !/jibalzone\.com$/i.test(domain)) return null;

    const signals = [
      homepageHtml.includes("products/search") ? "products_search_route" : "",
      homepageHtml.includes("jibal-products") ? "jibal_product_grid" : "",
      homepageHtml.includes("/en/product/") ? "product_links" : "",
    ].filter(Boolean);

    return {
      connectorType: "jibalzone_storefront",
      confidence: signals.length >= 2 ? 0.95 : 0.82,
      signals,
      capabilities: {
        supportsStructuredApi: false,
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: false,
        supportsMarketplaceContext: false,
        fallbackToBrowser: false,
      },
      endpoints: {
        products: new URL("/en", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const homeUrl = profile.endpoints.products ?? store.website ?? "";
    const homeHtml = await client.fetchText(homeUrl);
    const brandLinks = extractAbsoluteLinks(homeHtml, homeUrl, BRAND_LINK_PATTERN);
    const homeProductLinks = extractAbsoluteLinks(homeHtml, homeUrl, PRODUCT_LINK_PATTERN);

    const brandPages = await mapWithConcurrency(brandLinks, 6, async (brandUrl) => {
      try {
        const html = await client.fetchText(brandUrl);
        return extractAbsoluteLinks(html, brandUrl, PRODUCT_LINK_PATTERN);
      } catch {
        return [];
      }
    });

    const productLinks = [...new Set([...homeProductLinks, ...brandPages.flat()])];
    const detailProducts = await mapWithConcurrency(productLinks, 10, async (productUrl) => {
      const html = await client.fetchText(productUrl);
      return parseJibalzoneProductPage(store.id, productUrl, html);
    });

    const products = detailProducts.filter((product): product is CatalogProductDraft => Boolean(product));

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: productLinks.length,
      snapshots: [
        { label: "brand_links", payload: brandLinks },
        { label: "product_links", payload: productLinks.slice(0, 5000) },
      ],
    };
  },
};

function parseJibalzoneProductPage(storeId: string, productUrl: string, html: string): CatalogProductDraft | null {
  const titleMatch = html.match(/<h1[^>]*class="product_title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i);
  const title = cleanHtml(titleMatch?.[1] ?? "");
  if (!title) return null;

  const priceMatches = [...html.matchAll(/class="jibal-Price-amount amount"[^>]*>([\s\S]*?)<\/span>/gi)]
    .map((match) => parseNumberish(cleanHtml(match[1] ?? "")))
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const livePrice = priceMatches.length > 0 ? Math.min(...priceMatches) : undefined;
  const originalPrice = priceMatches.length > 1 ? Math.max(...priceMatches) : livePrice;

  const availabilityText = cleanHtml(
    (html.match(/Availability[\s\S]{0,150}?<span[^>]*>([\s\S]*?)<\/span>/i) ?? [])[1] ?? "",
  );
  const sku = cleanHtml((html.match(/SKU[\s\S]{0,150}?<span[^>]*>([\s\S]*?)<\/span>/i) ?? [])[1] ?? "");
  const categoryTrail = [...html.matchAll(/<a [^>]*href="https:\/\/www\.jibalzone\.com\/en\/brand\/[^"]+"[^>]*>([\s\S]*?)<\/a>/gi)]
    .map((match) => cleanHtml(match[1] ?? ""))
    .filter(Boolean);

  const inStock = /instock/i.test(html) || /In Stock/i.test(availabilityText);
  const outOfStock = /outofstock|out of stock|sold out|unavailable/i.test(html) || /Out of Stock/i.test(availabilityText);

  return {
    storeId,
    sourceProductId: compactText(productUrl),
    normalizedTitle: compactText(title),
    title,
    brand: categoryTrail[0],
    model: undefined,
    sku: sku || undefined,
    categoryPath: categoryTrail,
    sourceUrl: productUrl,
    imageUrl: (html.match(/class="wp-post-image"[^>]*src="([^"]+)"/i) ?? [])[1] ?? undefined,
    availability: inStock ? "in_stock" : outOfStock ? "out_of_stock" : "unknown",
    currency: "IQD",
    livePrice,
    originalPrice,
    onSale: typeof livePrice === "number" && typeof originalPrice === "number" && originalPrice > livePrice,
    sourceConnector: "jibalzone_storefront",
    freshnessAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    offerLabel: undefined,
    offerStartsAt: undefined,
    offerEndsAt: undefined,
    brandTokens: categoryTrail[0] ? [compactText(categoryTrail[0])] : [],
    modelTokens: [],
    skuTokens: sku ? [compactText(sku)] : [],
    rawPayload: {
      availabilityText,
    },
  };
}

function cleanHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
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
