import type { CatalogConnector } from "./base.js";
import {
  buildCommonSitemapUrls,
  buildOffersFromProducts,
  crawlCatalogFromListingPages,
  extractSitemapUrls,
} from "./extractors.js";

const PRODUCT_URL_HINTS = [/product/i, /shop/i, /item/i];

export const genericSitemapHtmlConnector: CatalogConnector = {
  type: "generic_sitemap_html",

  async probe({ homepageUrl }) {
    return {
      connectorType: "generic_sitemap_html",
      confidence: 0.51,
      signals: ["fallback_sitemap_probe"],
      capabilities: {
        supportsStructuredApi: false,
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: false,
        supportsMarketplaceContext: false,
        fallbackToBrowser: true,
      },
      endpoints: {
        sitemap: buildCommonSitemapUrls(homepageUrl)[0],
      },
    };
  },

  async sync({ store, client, profile }) {
    const baseUrl = store.website ?? profile.endpoints.sitemap ?? "";
    const sitemapCandidates = buildCommonSitemapUrls(baseUrl);
    let discoveredUrls: string[] = [];
    let fetchedSitemapUrl: string | undefined;
    let sitemapXml = "";

    for (const sitemapUrl of sitemapCandidates) {
      try {
        sitemapXml = await client.fetchText(sitemapUrl);
        fetchedSitemapUrl = sitemapUrl;
        discoveredUrls = extractSitemapUrls(sitemapXml)
          .filter((url) => PRODUCT_URL_HINTS.some((pattern) => pattern.test(url)))
          .slice(0, 20);
        if (discoveredUrls.length > 0) break;
      } catch {
        // Ignore missing sitemap variants.
      }
    }

    const listingSeeds =
      discoveredUrls.length > 0 ? discoveredUrls : [baseUrl];
    const collected = await crawlCatalogFromListingPages(
      store.id,
      "generic_sitemap_html",
      client,
      listingSeeds,
      {
        maxListingPages: 40,
        maxProductPages: 600,
      },
    );

    return {
      products: collected.products,
      variants: [],
      offers: buildOffersFromProducts(collected.products),
      estimatedCatalogSize: collected.products.length,
      snapshots: [
        { label: "sitemap", payload: { url: fetchedSitemapUrl, xml: sitemapXml.slice(0, 200000) } },
        { label: "product_urls", payload: discoveredUrls },
        { label: "listing_pages", payload: collected.listingPages },
        { label: "detail_pages", payload: collected.productPages },
      ],
    };
  },
};
