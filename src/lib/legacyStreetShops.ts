import type { Shop } from "./types";
import { SINAA_REAL_SHOPS } from "./sinaaRealShops";
import { SINAA_SHOP_PAGES } from "./sinaaShopPages";

function compactText(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىئ]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ـ/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function getGoogleCid(url?: string) {
  return url?.match(/[?&]cid=(\d+)/)?.[1];
}

function verificationStatus(verified: boolean): Shop["verificationStatus"] {
  return verified ? "verified" : "pending";
}

export const LEGACY_SINAA_SHOPS: Shop[] = SINAA_REAL_SHOPS.map((record) => {
  const pageData = SINAA_SHOP_PAGES[record.id];
  const now = pageData?.lastUpdatedAt ?? "2026-04-17T03:39:38.653Z";

  return {
    id: record.id,
    slug: record.slug,
    seedKey: record.id,
    name: record.name,
    city: "Baghdad",
    cityAr: "بغداد",
    citySlug: "baghdad",
    area: "شارع الصناعة",
    category: record.categories[0] ?? "Computing",
    categories: record.categories,
    address: record.address,
    lat: record.lat,
    lng: record.lng,
    googleMapsUrl: record.googleMapsUrl,
    website: record.website,
    phone: record.phone,
    discoverySource: "seed",
    verified: record.verified,
    verificationStatus: verificationStatus(record.verified),
    notes: "Supplemental Sinaa street dataset",
    imageUrl: record.mainImage && record.mainImage !== "Not found" ? record.mainImage : undefined,
    gallery: pageData?.gallery,
    quickSignals: pageData
      ? {
          has_website: pageData.quickDecision.has_website,
          has_google_maps: pageData.quickDecision.has_google_maps,
          has_photos: pageData.quickDecision.has_photos,
          has_rating: undefined,
          has_reviews: undefined,
          open_now: pageData.openNow,
          business_status: pageData.businessStatus ?? undefined,
        }
      : { has_website: Boolean(record.website), has_google_maps: Boolean(record.googleMapsUrl) },
    openNow: pageData?.openNow ?? null,
    businessStatus: pageData?.businessStatus ?? undefined,
    workingHours: pageData?.workingHours,
    createdAt: now,
    updatedAt: now,
  };
});

export function getLegacySinaaShopById(id: string) {
  return LEGACY_SINAA_SHOPS.find((shop) => shop.id === id) ?? null;
}

export function mergeWithLegacySinaaShops(shops: Shop[]) {
  const seen = new Set<string>();
  const merged: Shop[] = [];

  function keyFor(shop: Pick<Shop, "name" | "googleMapsUrl">) {
    return getGoogleCid(shop.googleMapsUrl) ?? compactText(shop.name);
  }

  for (const shop of shops) {
    const key = keyFor(shop);
    seen.add(key);
    merged.push(shop);
  }

  for (const shop of LEGACY_SINAA_SHOPS) {
    const key = keyFor(shop);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(shop);
  }

  return merged;
}
