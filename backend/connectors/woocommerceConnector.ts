import type { CatalogConnector } from "./base.js";
import {
  buildCommonCatalogUrls,
  buildOffersFromProducts,
  crawlCatalogFromListingPages,
  dedupeProducts,
  toCatalogProductDraft,
} from "./extractors.js";
import { connectorDefaultPriority } from "../shared/catalog/syncPolicy.js";
import type { CatalogProductDraft } from "../shared/catalog/types.js";

export const woocommerceConnector: CatalogConnector = {
  type: "woocommerce",

  async probe({ homepageHtml, homepageUrl }) {
    const signals = [
      homepageHtml.includes("woocommerce") ? "woocommerce_html" : "",
      homepageHtml.includes("wp-content") ? "wordpress_html" : "",
      homepageHtml.includes("wp-json/wc/store") ? "wc_store_api_hint" : "",
      /product_cat|add_to_cart_button|woocommerce-Price-amount/i.test(homepageHtml) ? "woocommerce_markup" : "",
    ].filter(Boolean);

    if (!signals.includes("woocommerce_html") && !signals.includes("woocommerce_markup")) return null;

    return {
      connectorType: "woocommerce",
      confidence: 0.88,
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
        products: new URL("/wp-json/wc/store/v1/products?per_page=100&page=1", homepageUrl).toString(),
        search: new URL("/?s=", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const productsEndpoint = profile.endpoints.products;
    let apiProducts: CatalogProductDraft[] = [];
    const apiPageSummaries: Array<{ url: string; count: number }> = [];
    if (productsEndpoint) {
      const pages = await fetchWooStoreApiProducts(client, productsEndpoint);
      apiPageSummaries.push(...pages.map((page) => ({ url: page.url, count: page.items.length })));
      apiProducts = pages
        .flatMap((page) => page.items)
        .map((item) => normalizeWooItem(store.id, item, productsEndpoint))
        .filter((product): product is NonNullable<typeof product> => Boolean(product));
    }

    const homepageUrl = store.website ?? productsEndpoint ?? "";
    const crawled =
      apiProducts.length > 0
        ? { products: [], listingPages: [], productPages: [] }
        : await crawlCatalogFromListingPages(
            store.id,
            "woocommerce",
            client,
            buildCommonCatalogUrls(homepageUrl),
            {
              maxListingPages: 200,
              maxProductPages: 5000,
            },
          );
    const products = dedupeProducts([...apiProducts, ...crawled.products]);

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: Math.max(products.length, apiProducts.length, crawled.productPages.length),
      snapshots: [
        { label: "products_api_pages", payload: apiPageSummaries },
        { label: "listing_pages", payload: crawled.listingPages },
        { label: "detail_pages", payload: crawled.productPages },
      ],
    };
  },
};

async function fetchWooStoreApiProducts(
  client: { fetchJson(url: string): Promise<unknown> },
  firstPageUrl: string,
): Promise<Array<{ url: string; items: unknown[] }>> {
  const pages: Array<{ url: string; items: unknown[] }> = [];

  for (let page = 1; page <= 100; page++) {
    const url = withUrlPage(firstPageUrl, page);
    let payload: unknown;
    try {
      payload = await client.fetchJson(url);
    } catch {
      break;
    }

    const items = Array.isArray(payload) ? payload : [];
    if (items.length === 0) break;
    pages.push({ url, items });
  }

  return pages;
}

function withUrlPage(url: string, page: number): string {
  const parsed = new URL(url);
  parsed.searchParams.set("page", String(page));
  if (!parsed.searchParams.has("per_page")) {
    parsed.searchParams.set("per_page", "100");
  }
  return parsed.toString();
}

function normalizeWooItem(storeId: string, item: unknown, fallbackSourceUrl: string) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;
  const raw = item as Record<string, unknown>;
  const image = Array.isArray(raw.images) && raw.images[0] && typeof raw.images[0] === "object"
    ? (raw.images[0] as Record<string, unknown>).src
    : undefined;
  const prices = typeof raw.prices === "object" && raw.prices !== null ? raw.prices as Record<string, unknown> : {};

  return toCatalogProductDraft(
    storeId,
    "woocommerce",
    {
      id: raw.id,
      name: raw.name,
      url: raw.permalink,
      image,
      sku: raw.sku,
      price: prices.price,
      regular_price: prices.regular_price,
      currency: prices.currency_code,
      categories: Array.isArray(raw.categories)
        ? raw.categories.map((category) => (typeof category === "object" && category ? (category as Record<string, unknown>).name : undefined))
        : undefined,
      in_stock: raw.is_in_stock,
    },
    fallbackSourceUrl,
  );
}

export const woocommerceDefaultPriority = connectorDefaultPriority("woocommerce");
