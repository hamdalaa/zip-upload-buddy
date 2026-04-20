import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts } from "./extractors.js";
import { compactText, extractDomain } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft, ProductVariantDraft } from "../shared/catalog/types.js";

const SHOPIFY_MARKERS = [
  "cdn.shopify.com",
  "Shopify.theme",
  "shopify-payment-button",
  "Shopify.shop",
  "myshopify.com",
];

export const shopifyConnector: CatalogConnector = {
  type: "shopify",

  async probe({ homepageHtml, homepageUrl }) {
    const domain = extractDomain(homepageUrl);
    if (!domain) return null;

    const signals = SHOPIFY_MARKERS.filter((marker) => homepageHtml.includes(marker));
    if (signals.length === 0) return null;

    return {
      connectorType: "shopify",
      confidence: signals.length >= 2 ? 0.95 : 0.82,
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
        products: new URL("/products.json?limit=250&page=1", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const baseUrl = store.website ?? profile.endpoints.products ?? "";
    const prefixes = ["", "/en", "/ar"];
    const products: CatalogProductDraft[] = [];
    const variants: ProductVariantDraft[] = [];
    const fetchedPages: Array<{ url: string; count: number }> = [];

    for (const prefix of prefixes) {
      let foundAny = false;
      for (let page = 1; page <= 100; page++) {
        const url = buildProductsJsonUrl(baseUrl, prefix, page);
        let payload: unknown;
        try {
          payload = await client.fetchJson(url);
        } catch {
          break;
        }

        const rawProducts = extractShopifyProducts(payload);
        if (rawProducts.length === 0) break;
        foundAny = true;
        fetchedPages.push({ url, count: rawProducts.length });

        for (const rawProduct of rawProducts) {
          const normalized = normalizeShopifyProduct(store.id, rawProduct, baseUrl, prefix);
          if (!normalized) continue;
          products.push(normalized.product);
          variants.push(...normalized.variants);
        }
      }

      if (foundAny) break;
    }

    return {
      products: dedupeProducts(products),
      variants: dedupeVariants(variants),
      offers: buildOffersFromProducts(dedupeProducts(products)),
      estimatedCatalogSize: products.length,
      snapshots: [{ label: "products_api_pages", payload: fetchedPages }],
    };
  },
};

function buildProductsJsonUrl(baseUrl: string, prefix: string, page: number): string {
  const pathnamePrefix = prefix ? `${prefix.replace(/\/$/, "")}/` : "/";
  const url = new URL(`${pathnamePrefix.replace(/\/+$/, "/")}products.json`, baseUrl);
  url.searchParams.set("limit", "250");
  url.searchParams.set("page", String(page));
  return url.toString();
}

function extractShopifyProducts(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const products = (payload as { products?: unknown }).products;
  return Array.isArray(products)
    ? products.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    : [];
}

function normalizeShopifyProduct(
  storeId: string,
  rawProduct: Record<string, unknown>,
  baseUrl: string,
  prefix: string,
): { product: CatalogProductDraft; variants: ProductVariantDraft[] } | null {
  const handle = typeof rawProduct.handle === "string" ? rawProduct.handle : "";
  const title = typeof rawProduct.title === "string" ? rawProduct.title.trim() : "";
  if (!handle || !title) return null;

  const rawVariants = Array.isArray(rawProduct.variants) ? rawProduct.variants : [];
  const variants = rawVariants
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item))
    .map((variant, index) => toShopifyVariant(handle, title, variant, index))
    .filter((variant): variant is ProductVariantDraft => Boolean(variant));

  const prices = variants
    .map((variant) => variant.livePrice)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const originalPrices = variants
    .map((variant) => variant.originalPrice)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const now = new Date().toISOString();
  const prefixPath = prefix ? `${prefix.replace(/\/$/, "")}` : "";
  const sourceUrl = new URL(`${prefixPath}/products/${handle}`.replace(/\/{2,}/g, "/"), baseUrl).toString();
  const productId = String(rawProduct.id ?? handle);
  const images = Array.isArray(rawProduct.images) ? rawProduct.images : [];
  const imageUrl = images.find((image) => typeof image === "object" && image !== null && typeof (image as { src?: unknown }).src === "string") as
    | { src: string }
    | undefined;
  const brand = typeof rawProduct.vendor === "string" ? rawProduct.vendor.trim() : undefined;
  const category = typeof rawProduct.product_type === "string" ? rawProduct.product_type.trim() : undefined;
  const tags =
    typeof rawProduct.tags === "string"
      ? rawProduct.tags.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
  const inStock = variants.some((variant) => variant.availability === "in_stock");

  return {
    product: {
      storeId,
      sourceProductId: productId,
      normalizedTitle: compactText(title),
      title,
      brand,
      model: undefined,
      sku: variants[0]?.sku,
      categoryPath: category ? [category] : [],
      sourceUrl,
      imageUrl: imageUrl?.src,
      availability: inStock ? "in_stock" : variants.length > 0 ? "out_of_stock" : "unknown",
      currency: "IQD",
      livePrice: prices.length > 0 ? Math.min(...prices) : undefined,
      originalPrice: originalPrices.length > 0 ? Math.max(...originalPrices) : undefined,
      onSale: originalPrices.some((value, index) => value > (prices[index] ?? 0)),
      sourceConnector: "shopify",
      freshnessAt: now,
      lastSeenAt: now,
      offerLabel: undefined,
      offerStartsAt: undefined,
      offerEndsAt: undefined,
      brandTokens: brand ? [compactText(brand)] : [],
      modelTokens: [],
      skuTokens: variants[0]?.sku ? [compactText(variants[0].sku)] : [],
      rawPayload: {
        ...rawProduct,
        tags,
      },
    },
    variants,
  };
}

function toShopifyVariant(
  handle: string,
  productTitle: string,
  rawVariant: Record<string, unknown>,
  index: number,
): ProductVariantDraft | null {
  const sourceVariantId = String(rawVariant.id ?? `${handle}:${index}`);
  const price = parseMoney(rawVariant.price);
  const compareAt = parseMoney(rawVariant.compare_at_price);
  const title = typeof rawVariant.title === "string" && rawVariant.title.trim() ? rawVariant.title.trim() : `Variant ${index + 1}`;
  const availability = rawVariant.available === true ? "in_stock" : rawVariant.available === false ? "out_of_stock" : "unknown";
  const optionEntries = Object.entries(rawVariant)
    .filter(([key, value]) => /^option\d+$/i.test(key) && typeof value === "string" && value.trim())
    .map(([key, value]) => [key.toLowerCase(), String(value).trim()] as const);

  return {
    productSourceId: String(rawVariant.product_id ?? rawVariant.id ?? handle),
    sourceVariantId,
    title: `${productTitle} / ${title}`,
    sku: typeof rawVariant.sku === "string" && rawVariant.sku.trim() ? rawVariant.sku.trim() : undefined,
    availability,
    livePrice: price,
    originalPrice: compareAt && price && compareAt > price ? compareAt : price,
    attributes: Object.fromEntries(optionEntries),
    lastSeenAt: new Date().toISOString(),
    rawPayload: rawVariant,
  };
}

function parseMoney(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? Math.round(parsed) : undefined;
  }
  return undefined;
}

function dedupeProducts(products: CatalogProductDraft[]): CatalogProductDraft[] {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.sourceProductId)) return false;
    seen.add(product.sourceProductId);
    return true;
  });
}

function dedupeVariants(variants: ProductVariantDraft[]): ProductVariantDraft[] {
  const seen = new Set<string>();
  return variants.filter((variant) => {
    if (seen.has(variant.sourceVariantId)) return false;
    seen.add(variant.sourceVariantId);
    return true;
  });
}
