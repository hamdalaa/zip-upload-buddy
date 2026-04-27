export const CATALOG_BASELINE_COUNTS = {
  stores: 3108,
  products: 166000,
} as const;

export function getPublicStoreCount(...counts: Array<number | null | undefined>) {
  return Math.max(CATALOG_BASELINE_COUNTS.stores, ...counts.map((count) => count ?? 0));
}

export function getPublicProductCount(...counts: Array<number | null | undefined>) {
  return Math.max(CATALOG_BASELINE_COUNTS.products, ...counts.map((count) => count ?? 0));
}
