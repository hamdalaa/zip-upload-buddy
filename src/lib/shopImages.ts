import type { Shop } from "@/lib/types";

const shopImageCache = new Map<string, string>();

function isUsableImage(url?: string | null): url is string {
  return Boolean(url && url !== "Not found");
}

function cacheShopImage(shop: Pick<Shop, "id" | "seedKey" | "googleMapsUrl">, imageUrl: string) {
  shopImageCache.set(shop.id, imageUrl);
  shopImageCache.set(shop.seedKey, imageUrl);
  if (shop.googleMapsUrl) shopImageCache.set(shop.googleMapsUrl, imageUrl);
}

export async function preloadShopImages(
  shops: Array<Pick<Shop, "id" | "seedKey" | "googleMapsUrl" | "imageUrl" | "gallery" | "citySlug">>,
) {
  shops.forEach((shop) => {
    const imageUrl = [...(shop.gallery ?? []), shop.imageUrl].filter(isUsableImage)[0];
    if (imageUrl) cacheShopImage(shop, imageUrl);
  });
}

export function getShopImage(shop: Pick<Shop, "id" | "seedKey" | "googleMapsUrl" | "imageUrl" | "gallery">) {
  const directCandidates = [...(shop.gallery ?? []), shop.imageUrl].filter(isUsableImage);
  return (
    directCandidates[0] ??
    shopImageCache.get(shop.seedKey) ??
    shopImageCache.get(shop.id) ??
    (shop.googleMapsUrl ? shopImageCache.get(shop.googleMapsUrl) : undefined)
  );
}
