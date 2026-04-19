import type { CatalogConnector } from "./base.js";
import {
  buildOffersFromProducts,
  crawlCatalogFromListingPages,
  extractStructuredPayloads,
  extractProductCandidates,
  extractNextDataPayloads,
  extractNuxtPayloads,
  extractJsonLdPayloads,
  toCatalogProductDraft,
} from "./extractors.js";

export const genericJsonCatalogConnector: CatalogConnector = {
  type: "generic_json_catalog",

  async probe({ homepageHtml, homepageUrl }) {
    const jsonSignals = [
      extractJsonLdPayloads(homepageHtml).length > 0 ? "json_ld" : "",
      extractNuxtPayloads(homepageHtml).length > 0 ? "embedded_json" : "",
      extractNextDataPayloads(homepageHtml).length > 0 ? "next_data" : "",
      homepageHtml.includes("application/ld+json") ? "ld_json_script" : "",
      homepageHtml.includes("__NEXT_DATA__") ? "next_data_script" : "",
    ].filter(Boolean);

    if (jsonSignals.length === 0) return null;

    return {
      connectorType: "generic_json_catalog",
      confidence: 0.74,
      signals: jsonSignals,
      capabilities: {
        supportsStructuredApi: true,
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: false,
        supportsMarketplaceContext: false,
        fallbackToBrowser: false,
      },
      endpoints: {
        sitemap: new URL("/sitemap.xml", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const homepageUrl = store.website ?? profile.endpoints.sitemap ?? "";
    const homepageHtml = await client.fetchText(homepageUrl);
    const payloadProducts = extractProductCandidates(extractStructuredPayloads(homepageHtml))
      .map((candidate) => toCatalogProductDraft(store.id, "generic_json_catalog", candidate, homepageUrl))
      .filter((product): product is NonNullable<typeof product> => Boolean(product));
    const crawled = await crawlCatalogFromListingPages(
      store.id,
      "generic_json_catalog",
      client,
      [homepageUrl],
      {
        maxListingPages: 40,
        maxProductPages: 600,
      },
    );
    const merged = new Map<string, typeof payloadProducts[number]>();
    for (const product of [...payloadProducts, ...crawled.products]) {
      merged.set(product.sourceProductId, product);
    }
    const products = [...merged.values()];

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: products.length,
      snapshots: [
        { label: "homepage", payload: { url: homepageUrl, html: homepageHtml.slice(0, 200000) } },
        { label: "listing_pages", payload: crawled.listingPages },
        { label: "detail_pages", payload: crawled.productPages },
      ],
    };
  },
};
