import type { CatalogConnector } from "./base.js";
import {
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
    let payload: unknown = [];
    let apiProducts: CatalogProductDraft[] = [];
    if (productsEndpoint) {
      try {
        payload = await client.fetchJson(productsEndpoint);
        const rawItems = Array.isArray(payload) ? payload : [];
        apiProducts = rawItems
          .map((item) => normalizeWooItem(store.id, item, productsEndpoint))
          .filter((product): product is NonNullable<typeof product> => Boolean(product));
      } catch {
        payload = [];
      }
    }

    const homepageUrl = store.website ?? productsEndpoint ?? "";
    const crawled = await crawlCatalogFromListingPages(
      store.id,
      "woocommerce",
      client,
      [homepageUrl],
      {
        maxListingPages: 40,
        maxProductPages: 800,
      },
    );
    const products = dedupeProducts([...apiProducts, ...crawled.products]);

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: products.length,
      snapshots: [
        { label: "products_api", payload },
        { label: "listing_pages", payload: crawled.listingPages },
        { label: "detail_pages", payload: crawled.productPages },
      ],
    };
  },
};

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
