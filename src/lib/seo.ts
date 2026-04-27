import type { Shop } from "@/lib/types";
import type { UnifiedOffer, UnifiedProduct } from "@/lib/unifiedSearch";
import { decodeHtmlEntities } from "@/lib/textDisplay";

export const SITE_URL = "https://hayeer.com";
export const SITE_NAME = "حاير";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-hayr.svg`;
export const DEFAULT_DESCRIPTION =
  "حاير دليل إلكترونيات عراقي يساعدك تبحث وتقارن أسعار الموبايلات، الحاسبات، قطع PC، الشواحن، والأكسسوارات داخل محلات بغداد والعراق.";

type JsonLd = Record<string, unknown>;

function normalizePath(path = "/") {
  if (!path) return "/";
  if (/^https?:\/\//i.test(path)) return path;
  return path.startsWith("/") ? path : `/${path}`;
}

export function absoluteUrl(path = "/") {
  const normalized = normalizePath(path);
  if (/^https?:\/\//i.test(normalized)) return normalized;
  return `${SITE_URL}${normalized}`;
}

export function cleanText(value?: string | null) {
  return decodeHtmlEntities(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncateMeta(value: string, max = 156) {
  const clean = cleanText(value);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trim()}…`;
}

export function makeSeoTitle(title: string) {
  const clean = cleanText(title);
  return clean.includes(SITE_NAME) ? clean : `${clean} | ${SITE_NAME}`;
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: cleanText(item.name),
      item: absoluteUrl(item.path),
    })),
  };
}

export function websiteJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: SITE_NAME,
    inLanguage: "ar-IQ",
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.ico`,
    areaServed: {
      "@type": "Country",
      name: "Iraq",
    },
  };
}

export function itemListJsonLd(
  items: Array<{ name: string; path: string; image?: string; description?: string }>,
): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(item.path),
      item: {
        "@type": "Thing",
        name: cleanText(item.name),
        url: absoluteUrl(item.path),
        ...(item.image ? { image: absoluteUrl(item.image) } : {}),
        ...(item.description ? { description: truncateMeta(item.description, 180) } : {}),
      },
    })),
  };
}

export function productJsonLd(product: UnifiedProduct, offers: UnifiedOffer[], path: string): JsonLd {
  const title = cleanText(product.title);
  const images = product.images.map(absoluteUrl).slice(0, 6);
  const offerPrices = offers
    .map((offer) => offer.price)
    .filter((price) => Number.isFinite(price) && price > 0);
  const lowPrice = product.lowestPrice ?? (offerPrices.length ? Math.min(...offerPrices) : undefined);
  const highPrice = product.highestPrice ?? (offerPrices.length ? Math.max(...offerPrices) : undefined);
  const priceCurrency = product.priceCurrency ?? offers.find((offer) => offer.price === lowPrice)?.currency ?? "IQD";
  const inStock = product.inStockCount > 0 || offers.some((offer) => offer.stock === "in_stock");

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${absoluteUrl(path)}#product`,
    name: title,
    url: absoluteUrl(path),
    ...(product.description ? { description: truncateMeta(product.description, 320) } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: cleanText(product.brand) } } : {}),
    ...(product.model ? { model: cleanText(product.model) } : {}),
    ...(product.category ? { category: cleanText(product.category) } : {}),
    ...(product.rating
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount ?? 1,
          },
        }
      : {}),
    ...(lowPrice
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency,
            lowPrice,
            ...(highPrice ? { highPrice } : {}),
            offerCount: Math.max(product.offerCount, offers.length, 1),
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: absoluteUrl(path),
          },
        }
      : {}),
  };
}

export function localBusinessJsonLd(shop: Shop, path: string, image?: string): JsonLd {
  const ratingValue = typeof shop.rating === "number" && shop.rating > 0 ? shop.rating : undefined;
  const reviewCount = typeof shop.reviewCount === "number" && shop.reviewCount > 0 ? shop.reviewCount : undefined;

  return {
    "@context": "https://schema.org",
    "@type": ["LocalBusiness", "ElectronicsStore"],
    "@id": `${absoluteUrl(path)}#local-business`,
    name: cleanText(shop.name),
    url: absoluteUrl(path),
    ...(image ? { image: absoluteUrl(image) } : {}),
    ...(shop.phone ? { telephone: shop.phone } : {}),
    ...(shop.website || shop.googleMapsUrl ? { sameAs: [shop.website, shop.googleMapsUrl].filter(Boolean) } : {}),
    ...(shop.address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: cleanText(shop.address),
            addressLocality: cleanText(shop.cityAr ?? shop.city ?? shop.area),
            addressCountry: "IQ",
          },
        }
      : {}),
    ...(typeof shop.lat === "number" && typeof shop.lng === "number"
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: shop.lat,
            longitude: shop.lng,
          },
        }
      : {}),
    ...(ratingValue
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue,
            reviewCount: reviewCount ?? 1,
          },
        }
      : {}),
    priceRange: "IQD",
    areaServed: cleanText(shop.cityAr ?? shop.city ?? "Baghdad"),
  };
}
