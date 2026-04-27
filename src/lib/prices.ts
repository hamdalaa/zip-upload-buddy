export function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function formatIQDPrice(value: unknown, fallback = "—"): string {
  return isValidPrice(value) ? `${value.toLocaleString("en-US")} د.ع` : fallback;
}

export function formatCurrencyPrice(value: unknown, currency?: string, fallback = "—"): string {
  if (!isValidPrice(value)) return fallback;
  const normalized = (currency || "IQD").toUpperCase();
  if (normalized === "USD") return `${value.toLocaleString("en-US")} USD`;
  return formatIQDPrice(value, fallback);
}

export function formatLegacyIQDPrice(value: unknown, fallback = "—"): string {
  return isValidPrice(value) ? `${value.toLocaleString("en-US")} IQD` : fallback;
}

export function getDisplayPriceText(priceText?: string, priceValue?: number, fallback?: string): string | undefined {
  if (isValidPrice(priceValue)) return priceText?.trim() || formatLegacyIQDPrice(priceValue);
  if (!priceText?.trim()) return fallback;

  const numericText = priceText.replace(/[^\d.,-]/g, "").replace(/,/g, "").trim();
  const parsed = Number(numericText);
  if (Number.isFinite(parsed) && parsed > 0) return priceText.trim();

  return fallback;
}

export function hasComparableDiscount(priceValue?: number, originalPriceValue?: number): boolean {
  return isValidPrice(priceValue) && isValidPrice(originalPriceValue) && originalPriceValue > priceValue;
}
