import type { Shop } from "./types";
import type { CityShop } from "./cityData";

export function getShopReviewCount(shop: Pick<Shop, "googleMapsUrl" | "reviewCount">): number {
  return typeof shop.reviewCount === "number" ? shop.reviewCount : 0;
}

export function getShopRatingValue(shop: Pick<Shop, "googleMapsUrl" | "rating">): number {
  return typeof shop.rating === "number" ? shop.rating : 0;
}

export function compareShopsByPopularity(a: Shop, b: Shop) {
  return (
    getShopReviewCount(b) - getShopReviewCount(a) ||
    getShopRatingValue(b) - getShopRatingValue(a) ||
    Number(b.verified) - Number(a.verified) ||
    Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
    a.name.localeCompare(b.name, "ar")
  );
}

export function compareCatalogShopsByPriority(a: Shop, b: Shop) {
  return (
    Number((b.productCount ?? 0) > 0) - Number((a.productCount ?? 0) > 0) ||
    (b.productCount ?? 0) - (a.productCount ?? 0) ||
    (b.offerCount ?? 0) - (a.offerCount ?? 0) ||
    Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
    compareShopsByPopularity(a, b)
  );
}

export function compareCityShopsByPopularity(a: CityShop, b: CityShop) {
  return (
    (b.reviewCount ?? 0) - (a.reviewCount ?? 0) ||
    (b.rating ?? 0) - (a.rating ?? 0) ||
    Number(Boolean(b.quickSignals?.has_website)) - Number(Boolean(a.quickSignals?.has_website)) ||
    a.name.localeCompare(b.name, "ar")
  );
}
