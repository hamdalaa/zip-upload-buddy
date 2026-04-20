import { load } from "cheerio";
import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts, dedupeProducts } from "./extractors.js";
import { compactText, extractDomain, nowIso, parseNumberish } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft } from "../shared/catalog/types.js";

export const threedIraqConnector: CatalogConnector = {
  type: "threed_iraq",

  async probe({ homepageHtml, homepageUrl, store }) {
    const domain = extractDomain(store.website ?? homepageUrl);
    if (!domain || !/3d-iraq\.com$/i.test(domain)) return null;

    const signals = [
      homepageHtml.includes("/products?page=") ? "products_pagination" : "",
      homepageHtml.includes("/products/") ? "products_links" : "",
      /3d-iraq|3D/i.test(homepageHtml) ? "brand_marker" : "",
    ].filter(Boolean);

    return {
      connectorType: "threed_iraq",
      confidence: signals.length >= 2 ? 0.96 : 0.82,
      signals,
      capabilities: {
        supportsStructuredApi: false,
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: false,
        supportsMarketplaceContext: true,
        fallbackToBrowser: false,
      },
      endpoints: {
        products: new URL("/products?page=1", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const baseUrl = store.website ?? profile.endpoints.products ?? "";
    const listingProducts: CatalogProductDraft[] = [];
    const productLinks = new Set<string>();
    const visitedPages: string[] = [];
    let emptyPages = 0;

    for (let page = 1; page <= 80; page++) {
      const url = new URL(`/products?page=${page}`, baseUrl).toString();
      let html = "";
      try {
        html = await client.fetchText(url);
      } catch {
        emptyPages += 1;
        if (emptyPages > 2) break;
        continue;
      }

      visitedPages.push(url);
      const pageProducts = extractThreedIraqProducts(store.id, html, url);
      const detailLinks = extractThreedIraqDetailLinks(html, url);

      if (pageProducts.length === 0 && detailLinks.length === 0) {
        emptyPages += 1;
        if (emptyPages > 2) break;
      } else {
        emptyPages = 0;
      }

      listingProducts.push(...pageProducts);
      for (const link of detailLinks) {
        productLinks.add(link);
      }
    }

    const products = dedupeProducts(listingProducts);

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: Math.max(products.length, productLinks.size),
      snapshots: [
        { label: "listing_pages", payload: visitedPages },
        { label: "detail_pages", payload: [...productLinks] },
      ],
    };
  },
};

function extractThreedIraqProducts(
  storeId: string,
  html: string,
  sourceUrl: string,
): CatalogProductDraft[] {
  const $ = load(html);
  const now = nowIso();
  const products: CatalogProductDraft[] = [];

  $(".card.product-card").each((_, element) => {
    const root = $(element);
    const title = root.find(".product-title a").first().text().trim();
    const href = root.find(".product-title a").first().attr("href") ?? root.find(".swiper-pagination").attr("href");
    if (!title || !href) return;

    const sourceUrlAbsolute = toAbsoluteUrl(href, sourceUrl);
    if (!sourceUrlAbsolute) return;

    const productId =
      root.find("[data-product-id]").first().attr("data-product-id") ??
      sourceUrlAbsolute.match(/-(\d+)(?:$|[/?#])/i)?.[1] ??
      compactText(sourceUrlAbsolute);
    const sellerName = root.find(".product-meta").first().text().trim() || undefined;
    const livePrice = parseNumberish(root.find(".product-price").first().text().trim());
    const imageUrl =
      absoluteImage(root.find("img[data-src]").first().attr("data-src"), sourceUrl) ??
      absoluteImage(root.find("img[src]").first().attr("src"), sourceUrl);

    products.push({
      storeId,
      sourceProductId: String(productId),
      normalizedTitle: compactText(title),
      title,
      brand: undefined,
      model: undefined,
      sku: undefined,
      sellerName,
      categoryPath: [],
      sourceUrl: sourceUrlAbsolute,
      imageUrl,
      availability: "unknown",
      currency: "IQD",
      livePrice,
      originalPrice: livePrice,
      onSale: false,
      sourceConnector: "threed_iraq",
      freshnessAt: now,
      lastSeenAt: now,
      offerLabel: undefined,
      offerStartsAt: undefined,
      offerEndsAt: undefined,
      brandTokens: [],
      modelTokens: [],
      skuTokens: [],
      rawPayload: {
        sellerName,
      },
    });
  });

  return dedupeProducts(products);
}

function extractThreedIraqDetailLinks(html: string, sourceUrl: string): string[] {
  const $ = load(html);
  const links = new Set<string>();

  $(".card.product-card .product-title a, .card.product-card .swiper-pagination[href]").each((_, element) => {
    const href = $(element).attr("href");
    const absolute = href ? toAbsoluteUrl(href, sourceUrl) : undefined;
    if (!absolute) return;
    links.add(absolute);
  });

  return [...links];
}

function absoluteImage(value: string | undefined, sourceUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value, sourceUrl).toString();
  } catch {
    return undefined;
  }
}

function toAbsoluteUrl(href: string, sourceUrl: string): string | undefined {
  try {
    return new URL(href, sourceUrl).toString();
  } catch {
    return undefined;
  }
}
