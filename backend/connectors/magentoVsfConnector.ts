import type { CatalogConnector } from "./base.js";
import {
  buildCommonCatalogUrls,
  buildOffersFromProducts,
  crawlCatalogFromListingPages,
  dedupeProducts,
  extractNuxtPayloads,
  extractProductCandidates,
  parseProductCardsFromHtml,
  toCatalogProductDraft,
} from "./extractors.js";

export const magentoVsfConnector: CatalogConnector = {
  type: "magento_vsf",

  async probe({ homepageHtml, homepageUrl }) {
    const signals = [
      homepageHtml.includes("window.__INITIAL_STATE__") ? "initial_state" : "",
      homepageHtml.includes("/dist/vsf-") ? "vsf_bundle" : "",
      homepageHtml.includes("Vue Storefront") ? "vuestorefront_brand" : "",
      /elryan/i.test(homepageUrl) ? "elryan_domain" : "",
    ].filter(Boolean);

    if (signals.length < 2) return null;

    return {
      connectorType: "magento_vsf",
      confidence: 0.93,
      signals,
      capabilities: {
        supportsStructuredApi: true,
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: true,
        supportsMarketplaceContext: true,
        fallbackToBrowser: true,
      },
      endpoints: {
        categories: new URL("/categories", homepageUrl).toString(),
        search: new URL("/search", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const homepageUrl = store.website ?? profile.endpoints.search ?? "";
    const homepageHtml = await client.fetchText(homepageUrl);
    const payloads = extractNuxtPayloads(homepageHtml);
    const payloadProducts = extractProductCandidates(payloads)
      .map((candidate) => toCatalogProductDraft(store.id, "magento_vsf", candidate, homepageUrl))
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
    const htmlProducts = parseProductCardsFromHtml(store.id, "magento_vsf", homepageHtml, homepageUrl);
    const seedUrls = [
      homepageUrl,
      ...(profile.endpoints.categories ? [profile.endpoints.categories] : []),
      ...(profile.endpoints.search ? [profile.endpoints.search] : []),
      ...buildCommonCatalogUrls(homepageUrl),
    ];
    const crawled = await crawlCatalogFromListingPages(
      store.id,
      "magento_vsf",
      client,
      seedUrls,
      {
        maxListingPages: 200,
        maxProductPages: 5000,
      },
    );
    const products = dedupeProducts([...payloadProducts, ...htmlProducts, ...crawled.products]);

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: Math.max(products.length, crawled.productPages.length),
      snapshots: [
        { label: "homepage", payload: { url: homepageUrl, html: homepageHtml.slice(0, 200000) } },
        { label: "listing_pages", payload: crawled.listingPages },
        { label: "detail_pages", payload: crawled.productPages },
      ],
    };
  },
};
