import { parseNumberish } from "./normalization.js";

export function resolveSaleFlags(livePrice?: number, originalPrice?: number): {
  livePrice?: number;
  originalPrice?: number;
  onSale: boolean;
  discountAmount?: number;
  discountPercent?: number;
} {
  if (livePrice == null && originalPrice == null) return { onSale: false };
  if (livePrice != null && originalPrice != null && originalPrice > livePrice) {
    const discountAmount = originalPrice - livePrice;
    const discountPercent = Math.round((discountAmount / originalPrice) * 100);
    return { livePrice, originalPrice, onSale: true, discountAmount, discountPercent };
  }
  return { livePrice, originalPrice, onSale: false };
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
