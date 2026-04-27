import type { CatalogConnector } from "./base.js";
import {
  buildCommonSitemapUrls,
  buildOffersFromProducts,
  crawlCatalogFromListingPages,
  dedupeProducts,
  extractSitemapUrls,
  parseGenericProductDetailPage,
} from "./extractors.js";

const PRODUCT_URL_HINTS = [
  /\/product(?:\/|$|\?)/i,
  /\/item(?:\/|$|\?)/i,
  /\/p\//i,
  /\/shop\/[^/?#]+/i,
];
const LISTING_URL_HINTS = [
  /\/shop(?:\/|$|\?)/i,
  /\/products?(?:\/|$|\?)/i,
  /\/collections?(?:\/|$|\?)/i,
  /\/catalog(?:\/|$|\?)/i,
  /\/category/i,
  /\/brand/i,
];

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
    const sitemapDiscovery = await discoverCatalogUrlsFromSitemaps(client, sitemapCandidates);
    const directProductLinks = sitemapDiscovery.productUrls.slice(0, 5000);
    const directProducts = await mapWithConcurrency(directProductLinks, 8, async (url) => {
      try {
        const html = await client.fetchText(url);
        return parseGenericProductDetailPage(store.id, "generic_sitemap_html", html, url);
      } catch {
        return null;
      }
    });
    const listingSeeds =
      sitemapDiscovery.listingUrls.length > 0
        ? sitemapDiscovery.listingUrls
        : sitemapDiscovery.productUrls.length > 0
          ? sitemapDiscovery.productUrls.slice(0, 50)
          : [baseUrl];
    const collected = await crawlCatalogFromListingPages(
      store.id,
      "generic_sitemap_html",
      client,
      listingSeeds,
      {
        maxListingPages: 200,
        maxProductPages: 5000,
      },
    );
    const products = dedupeProducts([
      ...directProducts.filter((product): product is NonNullable<typeof product> => Boolean(product)),
      ...collected.products,
    ]);

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: Math.max(products.length, sitemapDiscovery.productUrls.length, collected.productPages.length),
      snapshots: [
        { label: "sitemaps", payload: sitemapDiscovery.fetchedSitemaps },
        { label: "product_urls", payload: sitemapDiscovery.productUrls },
        { label: "listing_urls", payload: sitemapDiscovery.listingUrls },
        { label: "listing_pages", payload: collected.listingPages },
        { label: "detail_pages", payload: collected.productPages },
      ],
    };
  },
};

async function discoverCatalogUrlsFromSitemaps(
  client: { fetchText(url: string): Promise<string> },
  initialUrls: string[],
): Promise<{
  fetchedSitemaps: string[];
  productUrls: string[];
  listingUrls: string[];
}> {
  const queue = [...new Set(initialUrls)];
  const seen = new Set<string>();
  const fetchedSitemaps: string[] = [];
  const productUrls = new Set<string>();
  const listingUrls = new Set<string>();

  while (queue.length > 0 && fetchedSitemaps.length < 50) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || seen.has(sitemapUrl)) continue;
    seen.add(sitemapUrl);

    let sitemapXml = "";
    try {
      sitemapXml = await client.fetchText(sitemapUrl);
    } catch {
      continue;
    }

    fetchedSitemaps.push(sitemapUrl);
    for (const url of extractSitemapUrls(sitemapXml)) {
      if (/sitemap/i.test(url) || /\.xml(?:$|\?)/i.test(url)) {
        if (!seen.has(url)) queue.push(url);
        continue;
      }
      if (PRODUCT_URL_HINTS.some((pattern) => pattern.test(url))) {
        productUrls.add(url);
        continue;
      }
      if (LISTING_URL_HINTS.some((pattern) => pattern.test(url))) {
        listingUrls.add(url);
      }
    }
  }

  return {
    fetchedSitemaps,
    productUrls: [...productUrls],
    listingUrls: [...listingUrls],
  };
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
