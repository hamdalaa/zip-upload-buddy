import { load } from "cheerio";
import { XMLParser } from "fast-xml-parser";
import type { CatalogProductDraft, ConnectorType, OfferDraft } from "../shared/catalog/types.js";
import { inferPricePair } from "../shared/catalog/pricing.js";
import { compactText, normalizeText, nowIso, parseNumberish, tokenizeModel } from "../shared/catalog/normalization.js";

const LISTING_LINK_HINTS = [
  /\/shop(?:\/|$|\?)/i,
  /\/products?(?:\/|$|\?)/i,
  /\/collections?(?:\/|$|\?)/i,
  /\/catalog(?:\/|$|\?)/i,
  /\/brand(?:\/|$|\?)/i,
  /\/category(?:\/|$|\?)/i,
  /[?&]page=\d+/i,
  /\/page\/\d+/i,
];

const PRODUCT_LINK_HINTS = [
  /\/product\//i,
  /\/products\/(?!search)/i,
  /\/item\//i,
  /\/p\//i,
];

export function extractJsonAssignments(html: string, assignmentNames: string[]): unknown[] {
  const payloads: unknown[] = [];
  for (const assignmentName of assignmentNames) {
    const pattern = new RegExp(`${assignmentName}\\s*=\\s*(\\{[\\s\\S]*?\\}|\\[[\\s\\S]*?\\])\\s*;`, "g");
    const matches = html.matchAll(pattern);
    for (const match of matches) {
      const jsonText = match[1];
      if (!jsonText) continue;
      try {
        payloads.push(JSON.parse(jsonText));
      } catch {
        // Ignore malformed inline payloads and continue.
      }
    }
  }
  return payloads;
}

export function extractJsonLdPayloads(html: string): unknown[] {
  const $ = load(html);
  const payloads: unknown[] = [];
  $('script[type="application/ld+json"]').each((_, element) => {
    try {
      const text = $(element).text();
      payloads.push(JSON.parse(text));
    } catch {
      // Ignore malformed JSON-LD blobs.
    }
  });
  return payloads;
}

export function extractNuxtPayloads(html: string): unknown[] {
  return extractJsonAssignments(html, ["window\\.__NUXT__", "__NUXT__", "window\\.__INITIAL_STATE__", "__INITIAL_STATE__"]);
}

export function extractNextDataPayloads(html: string): unknown[] {
  const $ = load(html);
  const payloads: unknown[] = [];
  $('script#__NEXT_DATA__[type="application/json"]').each((_, element) => {
    try {
      const text = $(element).text();
      payloads.push(JSON.parse(text));
    } catch {
      // Ignore malformed next-data blobs.
    }
  });
  return payloads;
}

export function extractStructuredPayloads(html: string): unknown[] {
  return [...extractJsonLdPayloads(html), ...extractNuxtPayloads(html), ...extractNextDataPayloads(html)];
}

export function extractNextPageProps(html: string): Record<string, unknown> | null {
  const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(match[1]) as { props?: { pageProps?: Record<string, unknown> } };
    return parsed.props?.pageProps ?? null;
  } catch {
    return null;
  }
}

export function extractSitemapUrls(xmlText: string): string[] {
  const parser = new XMLParser({ ignoreAttributes: false });
  const parsed = parser.parse(xmlText) as {
    urlset?: { url?: Array<{ loc?: string }> | { loc?: string } };
    sitemapindex?: { sitemap?: Array<{ loc?: string }> | { loc?: string } };
  };

  const locs: string[] = [];
  const pushLoc = (value: unknown) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) pushLoc(item);
      return;
    }
    if (typeof value === "object" && value !== null && "loc" in value && typeof value.loc === "string") {
      locs.push(value.loc);
    }
  };

  pushLoc(parsed.urlset?.url);
  pushLoc(parsed.sitemapindex?.sitemap);
  return locs;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function flattenObjects(value: unknown, out: Record<string, unknown>[] = []): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    for (const item of value) flattenObjects(item, out);
    return out;
  }
  if (!isObject(value)) return out;
  out.push(value);
  for (const nested of Object.values(value)) {
    flattenObjects(nested, out);
  }
  return out;
}

export function toCatalogProductDraft(
  storeId: string,
  connectorType: ConnectorType,
  candidate: Record<string, unknown>,
  fallbackSourceUrl: string,
): CatalogProductDraft | null {
  const title = extractString(candidate, ["title", "name", "product_name", "productName"]);
  const url = extractString(candidate, ["url", "product_url", "productUrl", "permalink"]) ?? fallbackSourceUrl;
  if (!title || !url) return null;

  const brand = extractString(candidate, ["brand", "manufacturer", "vendor"]);
  const model = extractString(candidate, ["model", "mpn"]);
  const sku = extractString(candidate, ["sku", "code", "product_code"]);
  const priceInfo = inferPricePair(
    extractUnknown(candidate, ["price", "final_price", "finalPrice", "sale_price", "salePrice"]),
    extractUnknown(candidate, ["original_price", "regular_price", "old_price", "oldPrice", "compare_at_price"]),
  );
  const availabilityRaw = extractString(candidate, ["availability", "stock_status", "stockStatus", "in_stock"]);
  const availability = normalizeAvailability(availabilityRaw, candidate);
  const now = nowIso();
  const categoryPath = extractCategoryPath(candidate);
  const sellerName = extractString(candidate, ["seller_name", "sellerName", "vendor", "merchant_name"]);
  const sellerId = extractString(candidate, ["seller_id", "sellerId", "vendor_id"]);
  const sourceProductId =
    extractString(candidate, ["id", "product_id", "productId", "entity_id", "sku"]) ??
    compactText(`${title}-${url}`);

  const livePrice = priceInfo.livePrice;
  const originalPrice = priceInfo.originalPrice;

  const offerMetadata = toOfferMetadata(priceInfo, candidate);

  return {
    storeId,
    sourceProductId,
    normalizedTitle: compactText(title),
    title,
    brand: brand ?? undefined,
    model: model ?? undefined,
    sku: sku ?? undefined,
    sellerName: sellerName ?? undefined,
    sellerId: sellerId ?? undefined,
    categoryPath,
    sourceUrl: url,
    imageUrl: extractString(candidate, ["image", "image_url", "imageUrl", "thumbnail"]) ?? undefined,
    availability,
    currency: extractString(candidate, ["currency", "currency_code"]) ?? "IQD",
    livePrice,
    originalPrice,
    onSale: priceInfo.onSale,
    sourceConnector: connectorType,
    freshnessAt: now,
    lastSeenAt: now,
    offerLabel: offerMetadata.label,
    offerStartsAt: offerMetadata.startsAt,
    offerEndsAt: offerMetadata.endsAt,
    brandTokens: brand ? tokenizeModel(brand) : [],
    modelTokens: model ? tokenizeModel(model) : [],
    skuTokens: sku ? tokenizeModel(sku) : [],
    rawPayload: candidate,
  };
}

export function extractProductCandidates(payloads: unknown[]): Record<string, unknown>[] {
  const objects = payloads.flatMap((payload) => flattenObjects(payload));
  const seen = new Set<string>();
  const candidates: Record<string, unknown>[] = [];

  for (const object of objects) {
    const title = extractString(object, ["title", "name", "product_name", "productName"]);
    const url = extractString(object, ["url", "product_url", "productUrl", "permalink"]);
    const priceCandidate = extractUnknown(object, ["price", "final_price", "finalPrice", "sale_price", "salePrice", "regular_price"]);
    if (!title || !(url || priceCandidate)) continue;
    const key = `${compactText(title)}|${url ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push(object);
  }

  return candidates;
}

export function extractProductsFromJsonLd(
  storeId: string,
  connectorType: ConnectorType,
  html: string,
  fallbackSourceUrl: string,
): CatalogProductDraft[] {
  const payloads = extractJsonLdPayloads(html);
  const products: CatalogProductDraft[] = [];
  for (const payload of payloads) {
    const objects = flattenObjects(payload).filter((candidate) => {
      const type = extractString(candidate, ["@type"]);
      return type?.toLowerCase() === "product";
    });
    for (const product of objects) {
      const normalized = normalizeJsonLdProduct(product);
      const draft = toCatalogProductDraft(storeId, connectorType, normalized, fallbackSourceUrl);
      if (draft) products.push(draft);
    }
  }
  return products;
}

export function buildOffersFromProducts(products: CatalogProductDraft[]): OfferDraft[] {
  return products
    .filter((product) => product.onSale)
    .map((product) => ({
      productSourceId: product.sourceProductId,
      label: product.offerLabel ?? "Sale",
      discountAmount:
        product.livePrice != null && product.originalPrice != null ? product.originalPrice - product.livePrice : undefined,
      discountPercent:
        product.livePrice != null && product.originalPrice != null && product.originalPrice > 0
          ? Math.round(((product.originalPrice - product.livePrice) / product.originalPrice) * 100)
          : undefined,
      startsAt: product.offerStartsAt,
      endsAt: product.offerEndsAt,
      active: true,
      lastSeenAt: product.lastSeenAt,
      metadata: {
        source: "product_snapshot",
      },
    }));
}

export function dedupeProducts<T extends { sourceProductId: string }>(products: T[]): T[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.sourceProductId)) return false;
    seen.add(product.sourceProductId);
    return true;
  });
}

export function buildCommonCatalogUrls(baseUrl: string): string[] {
  const paths = [
    "/",
    "/shop",
    "/shop/",
    "/products",
    "/products/",
    "/store",
    "/store/",
    "/catalog",
    "/catalog/",
    "/collections",
    "/collections/",
    "/en",
    "/en/shop",
    "/en/products",
    "/ar",
    "/ar/shop",
    "/ar/products",
  ];
  return dedupeStrings(
    paths.map((pathname) => {
      try {
        return new URL(pathname, baseUrl).toString();
      } catch {
        return baseUrl;
      }
    }),
  );
}

export function extractAbsoluteLinks(html: string, sourceUrl: string, pattern: RegExp): string[] {
  const $ = load(html);
  const links = new Set<string>();
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    try {
      const absolute = new URL(href, sourceUrl).toString();
      if (pattern.test(absolute)) links.add(absolute);
    } catch {
      // Ignore invalid URLs.
    }
  });
  return [...links];
}

export function extractCatalogListingLinks(html: string, sourceUrl: string): string[] {
  const $ = load(html);
  const links = new Set<string>();
  const baseHost = safeHostname(sourceUrl);
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const absolute = toAbsoluteUrl(href, sourceUrl);
    if (!absolute) return;
    if (baseHost && safeHostname(absolute) !== baseHost) return;
    if (PRODUCT_LINK_HINTS.some((pattern) => pattern.test(absolute))) return;
    if (LISTING_LINK_HINTS.some((pattern) => pattern.test(absolute))) {
      links.add(absolute);
    }
  });
  return [...links];
}

export function extractProductDetailLinks(html: string, sourceUrl: string): string[] {
  const $ = load(html);
  const links = new Set<string>();
  const baseHost = safeHostname(sourceUrl);
  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const absolute = toAbsoluteUrl(href, sourceUrl);
    if (!absolute) return;
    if (baseHost && safeHostname(absolute) !== baseHost) return;
    if (PRODUCT_LINK_HINTS.some((pattern) => pattern.test(absolute))) {
      links.add(absolute);
    }
  });
  return [...links];
}

export function buildCommonSitemapUrls(baseUrl: string): string[] {
  const paths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/product-sitemap.xml"];
  return dedupeStrings(
    paths.map((pathname) => {
      try {
        return new URL(pathname, baseUrl).toString();
      } catch {
        return baseUrl;
      }
    }),
  );
}

export function extractProductsFromHtmlSources(
  storeId: string,
  connectorType: ConnectorType,
  html: string,
  sourceUrl: string,
): CatalogProductDraft[] {
  const payloadProducts = extractProductCandidates(extractStructuredPayloads(html))
    .map((candidate) => toCatalogProductDraft(storeId, connectorType, candidate, sourceUrl))
    .filter((product): product is NonNullable<typeof product> => Boolean(product));
  const jsonLdProducts = extractProductsFromJsonLd(storeId, connectorType, html, sourceUrl);
  const htmlProducts = parseProductCardsFromHtml(storeId, connectorType, html, sourceUrl);
  return dedupeProducts([...payloadProducts, ...jsonLdProducts, ...htmlProducts]);
}

export async function collectProductsFromCandidatePages(
  storeId: string,
  connectorType: ConnectorType,
  client: { fetchText(url: string): Promise<string> },
  candidateUrls: string[],
): Promise<{ products: CatalogProductDraft[]; fetchedPages: string[] }> {
  const fetchedPages: string[] = [];
  const products: CatalogProductDraft[] = [];

  for (const url of dedupeStrings(candidateUrls)) {
    try {
      const html = await client.fetchText(url);
      fetchedPages.push(url);
      products.push(...extractProductsFromHtmlSources(storeId, connectorType, html, url));
      if (products.length >= 120) break;
    } catch {
      // Ignore missing or blocked pages and continue probing alternatives.
    }
  }

  return {
    products: dedupeProducts(products),
    fetchedPages,
  };
}

export async function crawlCatalogFromListingPages(
  storeId: string,
  connectorType: ConnectorType,
  client: { fetchText(url: string): Promise<string> },
  startUrls: string[],
  options?: {
    maxListingPages?: number;
    maxProductPages?: number;
    listingConcurrency?: number;
    detailConcurrency?: number;
  },
): Promise<{
  products: CatalogProductDraft[];
  listingPages: string[];
  productPages: string[];
}> {
  const maxListingPages = options?.maxListingPages ?? 50;
  const maxProductPages = options?.maxProductPages ?? 1200;
  const listingConcurrency = options?.listingConcurrency ?? 4;
  const detailConcurrency = options?.detailConcurrency ?? 10;

  const queue = [...dedupeStrings(startUrls)];
  const listingPages: string[] = [];
  const listingSeen = new Set<string>();
  const productLinks = new Set<string>();
  const listingDrafts: CatalogProductDraft[] = [];

  while (queue.length > 0 && listingPages.length < maxListingPages) {
    const batch = queue.splice(0, listingConcurrency);
    const fetched = await Promise.all(
      batch.map(async (url) => {
        if (listingSeen.has(url)) return null;
        listingSeen.add(url);
        try {
          const html = await client.fetchText(url);
          return { url, html };
        } catch {
          return null;
        }
      }),
    );

    for (const page of fetched) {
      if (!page) continue;
      listingPages.push(page.url);
      listingDrafts.push(...extractProductsFromHtmlSources(storeId, connectorType, page.html, page.url));
      for (const link of extractProductDetailLinks(page.html, page.url)) {
        if (productLinks.size >= maxProductPages) break;
        productLinks.add(link);
      }
      for (const link of extractCatalogListingLinks(page.html, page.url)) {
        if (listingPages.length + queue.length >= maxListingPages) break;
        if (!listingSeen.has(link) && !queue.includes(link)) queue.push(link);
      }
    }
  }

  const detailResults = await mapWithConcurrency([...productLinks].slice(0, maxProductPages), detailConcurrency, async (url) => {
    try {
      const html = await client.fetchText(url);
      return parseGenericProductDetailPage(storeId, connectorType, html, url);
    } catch {
      return null;
    }
  });

  const detailProducts = detailResults.filter((product): product is CatalogProductDraft => Boolean(product));
  const products = mergeCatalogProducts(listingDrafts, detailProducts);

  return {
    products,
    listingPages,
    productPages: [...productLinks].slice(0, maxProductPages),
  };
}

function dedupeStrings(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function parseProductCardsFromHtml(
  storeId: string,
  connectorType: ConnectorType,
  html: string,
  sourceUrl: string,
): CatalogProductDraft[] {
  const $ = load(html);
  const drafts: CatalogProductDraft[] = [];

  $("[data-product-id], .product, .product-item, .products .item").each((_, element) => {
    const root = $(element);
    const title =
      root.find("[data-product-name], .product-item-link, .product-name, h2, h3, .name").first().text().trim() ||
      root.attr("data-product-name");
    const href = root.find("a[href]").first().attr("href");
    const priceText =
      root.find(".price, .special-price, .woocommerce-Price-amount, [data-price-amount]").first().text().trim() ||
      root.attr("data-price-amount");
    if (!title || !href) return;

    const candidate: Record<string, unknown> = {
      id: root.attr("data-product-id") ?? compactText(`${title}-${href}`),
      title,
      url: href.startsWith("http") ? href : new URL(href, sourceUrl).toString(),
      price: parseNumberish(priceText),
      image: root.find("img").first().attr("src"),
      brand: root.attr("data-brand") ?? undefined,
      category: root.attr("data-category") ?? undefined,
    };

    const draft = toCatalogProductDraft(storeId, connectorType, candidate, sourceUrl);
    if (draft) drafts.push(draft);
  });

  return drafts;
}

export function parseGenericProductDetailPage(
  storeId: string,
  connectorType: ConnectorType,
  html: string,
  sourceUrl: string,
): CatalogProductDraft | null {
  const $ = load(html);
  const title =
    $("h1").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $('meta[name="twitter:title"]').attr("content")?.trim() ||
    $("title").first().text().trim();
  if (!title) return null;

  // Canonical URL — most accurate identifier; falls back to og:url then sourceUrl.
  const canonicalUrl =
    $('link[rel="canonical"]').attr("href")?.trim() ||
    $('meta[property="og:url"]').attr("content")?.trim() ||
    sourceUrl;
  const resolvedCanonical = toAbsoluteUrl(canonicalUrl, sourceUrl) ?? sourceUrl;

  // Price extraction — try microdata first, then schema.org meta, then visible price.
  const microPrice = parseNumberish(
    $('[itemprop="price"]').attr("content") ||
      $('[itemprop="price"]').first().text().trim() ||
      $('meta[itemprop="price"]').attr("content") ||
      $('meta[property="product:price:amount"]').attr("content") ||
      $('meta[property="og:price:amount"]').attr("content"),
  );
  const microOriginalPrice = parseNumberish(
    $('[itemprop="priceSpecification"] [itemprop="price"]').attr("content") ||
      $('meta[property="product:original_price:amount"]').attr("content"),
  );

  const priceRoot = $(
    ".summary .price, .product .price, p.price, span.price, .jibal-price-box, .product-info-price, .price-box, .price-final_price",
  ).first();
  const visibleLive = parseNumberish(
    priceRoot.find("ins .amount, ins, .jibal-Price-amount.amount, .special-price .price, [data-price-type='finalPrice']").first().text().trim() ||
      priceRoot.text().trim(),
  );
  const visibleOriginal = parseNumberish(
    priceRoot.find("del .amount, del, .old-price .price, [data-price-type='oldPrice']").first().text().trim(),
  );

  const livePrice = microPrice ?? visibleLive;
  const originalPrice = microOriginalPrice ?? visibleOriginal ?? (visibleOriginal == null ? livePrice : undefined);

  const currency =
    $('meta[itemprop="priceCurrency"]').attr("content")?.trim() ||
    $('meta[property="product:price:currency"]').attr("content")?.trim() ||
    $('meta[property="og:price:currency"]').attr("content")?.trim() ||
    $('[itemprop="priceCurrency"]').attr("content")?.trim() ||
    "IQD";

  const availabilityText =
    $('[itemprop="availability"]').attr("href")?.trim() ||
    $('[itemprop="availability"]').attr("content")?.trim() ||
    $('meta[property="product:availability"]').attr("content")?.trim() ||
    $('meta[property="og:availability"]').attr("content")?.trim() ||
    $(".stock, .availability, .product-stock, .stock-status").first().text().trim() ||
    extractAvailabilityText(html);
  const sku =
    $('[itemprop="sku"]').attr("content")?.trim() ||
    $('[itemprop="sku"]').first().text().trim() ||
    $(".sku .value, .product-sku, .sku").first().text().trim() ||
    cleanHtml((html.match(/SKU[\s\S]{0,150}?<span[^>]*>([\s\S]*?)<\/span>/i) ?? [])[1] ?? "");
  const brand =
    $('[itemprop="brand"] [itemprop="name"]').attr("content")?.trim() ||
    $('[itemprop="brand"] [itemprop="name"]').first().text().trim() ||
    $('[itemprop="brand"]').attr("content")?.trim() ||
    $('meta[property="product:brand"]').attr("content")?.trim() ||
    undefined;
  const breadcrumbs = $("nav.breadcrumb a, .breadcrumb a, .breadcrumbs a, [itemtype*='BreadcrumbList'] [itemprop='name']")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);
  const imageUrl =
    $('meta[property="og:image"]').attr("content")?.trim() ||
    $('[itemprop="image"]').attr("content")?.trim() ||
    $('[itemprop="image"]').attr("src")?.trim() ||
    $(".wp-post-image, .product-image img, .woocommerce-product-gallery__image img, .product-image-photo, img").first().attr("src") ||
    undefined;

  const availability = availabilityText
    ? inferAvailabilityFromTextOrHtml(availabilityText, html)
    : inferAvailabilityFromTextOrHtml("", html);
  const now = nowIso();
  const inferredBrand = brand ?? breadcrumbs[0];
  return {
    storeId,
    sourceProductId: compactText(resolvedCanonical),
    normalizedTitle: compactText(title),
    title,
    brand: inferredBrand,
    model: undefined,
    sku: sku || undefined,
    categoryPath: breadcrumbs,
    sourceUrl: resolvedCanonical,
    imageUrl,
    availability,
    currency,
    livePrice,
    originalPrice,
    onSale:
      typeof livePrice === "number" &&
      typeof originalPrice === "number" &&
      originalPrice > livePrice,
    sourceConnector: connectorType,
    freshnessAt: now,
    lastSeenAt: now,
    offerLabel: undefined,
    offerStartsAt: undefined,
    offerEndsAt: undefined,
    brandTokens: inferredBrand ? [compactText(inferredBrand)] : [],
    modelTokens: [],
    skuTokens: sku ? [compactText(sku)] : [],
    rawPayload: {
      availabilityText,
      canonicalUrl: resolvedCanonical,
    },
  };
}

function normalizeJsonLdProduct(candidate: Record<string, unknown>): Record<string, unknown> {
  const offer = isObject(candidate.offers) ? candidate.offers : Array.isArray(candidate.offers) ? candidate.offers[0] : undefined;
  const brand = isObject(candidate.brand) ? candidate.brand.name : candidate.brand;
  return {
    id: candidate.sku ?? candidate.mpn ?? candidate.name,
    name: candidate.name,
    url: candidate.url,
    image: Array.isArray(candidate.image) ? candidate.image[0] : candidate.image,
    brand,
    price: isObject(offer) ? offer.price : undefined,
    currency: isObject(offer) ? offer.priceCurrency : undefined,
    availability: isObject(offer) ? offer.availability : undefined,
    regular_price: isObject(offer) ? offer.priceSpecification : undefined,
    category: candidate.category,
  };
}

function inferAvailabilityFromTextOrHtml(
  availabilityText: string,
  html: string,
): CatalogProductDraft["availability"] {
  const normalizedText = normalizeText(availabilityText);
  // Preorder takes precedence — prevents "in stock" buttons on preorder pages.
  if (/preorder|pre[-\s]?order|pre[-\s]?sale|coming soon|طلب مسبق|قريبا/i.test(normalizedText)) {
    return "preorder";
  }
  if (/preorder|pre-order|backorder/i.test(html)) return "preorder";
  if (
    /outofstock|out of stock|sold out|unavailable|not available|غير متوفر|نفذت الكمية|نفد المخزون/i.test(normalizedText) ||
    /\boutofstock\b/i.test(html) ||
    /class="[^"]*out[-_]of[-_]stock/i.test(html)
  ) {
    return "out_of_stock";
  }
  if (
    /instock|in stock|available|متوفر|متاح/i.test(normalizedText) ||
    /\binstock\b/i.test(html) ||
    /add to cart|add[-_]to[-_]cart|اضف الى السلة|اضافة الى السلة/i.test(html)
  ) {
    return "in_stock";
  }
  return "unknown";
}

function extractAvailabilityText(html: string): string {
  return cleanHtml((html.match(/Availability[\s\S]{0,150}?<span[^>]*>([\s\S]*?)<\/span>/i) ?? [])[1] ?? "");
}

function mergeCatalogProducts(base: CatalogProductDraft[], detail: CatalogProductDraft[]): CatalogProductDraft[] {
  const byId = new Map<string, CatalogProductDraft>();
  for (const product of base) byId.set(product.sourceProductId, product);
  for (const product of detail) {
    const existing = byId.get(product.sourceProductId);
    byId.set(product.sourceProductId, {
      ...(existing ?? product),
      ...product,
      rawPayload: {
        ...(existing?.rawPayload ?? {}),
        ...(product.rawPayload ?? {}),
      },
    });
  }
  return [...byId.values()];
}

function cleanHtml(input: string): string {
  return input.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function safeHostname(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
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

function normalizeAvailability(value: string | undefined, candidate: Record<string, unknown>): CatalogProductDraft["availability"] {
  const normalized = normalizeText(value ?? "");
  // Schema.org availability URLs / strings.
  if (/preorder|pre[-\s]?order|backorder/.test(normalized)) return "preorder";
  if (
    normalized.includes("instock") ||
    normalized.includes("in stock") ||
    normalized.includes("متوفر") ||
    normalized.includes("متاح")
  ) {
    return "in_stock";
  }
  if (
    normalized.includes("outofstock") ||
    normalized.includes("out of stock") ||
    normalized.includes("soldout") ||
    normalized.includes("sold out") ||
    normalized.includes("غير متوفر") ||
    normalized.includes("نفذت")
  ) {
    return "out_of_stock";
  }
  if (typeof candidate.in_stock === "boolean") return candidate.in_stock ? "in_stock" : "out_of_stock";
  if (typeof candidate.is_in_stock === "boolean") return candidate.is_in_stock ? "in_stock" : "out_of_stock";
  if (typeof candidate.available === "boolean") return candidate.available ? "in_stock" : "out_of_stock";
  // Numeric stock counts: > 0 = in stock, 0 = out, negative = unknown.
  const stockCount = parseNumberish(candidate.stock ?? candidate.quantity ?? candidate.inventory_quantity);
  if (typeof stockCount === "number") {
    if (stockCount > 0) return "in_stock";
    if (stockCount === 0) return "out_of_stock";
  }
  return "unknown";
}

function extractCategoryPath(candidate: Record<string, unknown>): string[] {
  const raw = extractUnknown(candidate, ["category_path", "categories", "category", "breadcrumbs"]);
  if (Array.isArray(raw)) {
    return raw
      .map((value) => (typeof value === "string" ? value : isObject(value) ? extractString(value, ["name", "title"]) : undefined))
      .filter((value): value is string => Boolean(value));
  }
  if (typeof raw === "string") {
    return raw
      .split(/[>/|]+/)
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return [];
}

function toOfferMetadata(
  priceInfo: ReturnType<typeof inferPricePair>,
  candidate: Record<string, unknown>,
): { label?: string; startsAt?: string; endsAt?: string } {
  if (!priceInfo.onSale) return {};
  return {
    label: extractString(candidate, ["offer_label", "offerLabel", "badge", "promotion_label"]) ?? "Sale",
    startsAt: extractString(candidate, ["offer_starts_at", "offerStartsAt"]),
    endsAt: extractString(candidate, ["offer_ends_at", "offerEndsAt"]),
  };
}

export function extractString(candidate: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = candidate[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (isObject(value)) {
      const nested = extractString(value, ["name", "value", "label", "title"]);
      if (nested) return nested;
    }
  }
  return undefined;
}

export function extractUnknown(candidate: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in candidate) return candidate[key];
  }
  return undefined;
}
