import { parseNumberish } from "./normalization.js";

export function normalizeCatalogPrice(value?: number): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
}

export function resolveSaleFlags(livePrice?: number, originalPrice?: number): {
  livePrice?: number;
  originalPrice?: number;
  onSale: boolean;
  discountAmount?: number;
  discountPercent?: number;
} {
  const normalizedLivePrice = normalizeCatalogPrice(livePrice);
  const normalizedOriginalPrice = normalizeCatalogPrice(originalPrice);

  if (normalizedLivePrice == null && normalizedOriginalPrice == null) return { onSale: false };
  if (
    normalizedLivePrice != null &&
    normalizedOriginalPrice != null &&
    normalizedOriginalPrice > normalizedLivePrice
  ) {
    const discountAmount = normalizedOriginalPrice - normalizedLivePrice;
    const discountPercent = Math.round((discountAmount / normalizedOriginalPrice) * 100);
    return {
      livePrice: normalizedLivePrice,
      originalPrice: normalizedOriginalPrice,
      onSale: true,
      discountAmount,
      discountPercent,
    };
  }
  return { livePrice: normalizedLivePrice, originalPrice: normalizedOriginalPrice, onSale: false };
}

export function inferPricePair(
  live: unknown,
  original: unknown,
  fallbackText?: string,
): ReturnType<typeof resolveSaleFlags> {
  const fallback = parseNumberish(fallbackText);
  const livePrice = parseNumberish(live) ?? fallback;
  const originalPrice = parseNumberish(original);
  return resolveSaleFlags(livePrice, originalPrice);
}
