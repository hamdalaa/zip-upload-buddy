import type { CatalogProductDraft, SearchDocument, StoreRecord } from "./types.js";

export function buildSearchDocument(store: StoreRecord, product: CatalogProductDraft): SearchDocument {
  return {
    id: `${store.id}:${product.sourceProductId}`,
    storeId: store.id,
    storeName: store.name,
    normalizedTitle: product.normalizedTitle,
    title: product.title,
    brand: product.brand,
    model: product.model,
    sku: product.sku,
    livePrice: product.livePrice,
    originalPrice: product.originalPrice,
    onSale: product.onSale,
    availability: product.availability,
    freshnessAt: product.freshnessAt,
    sourceUrl: product.sourceUrl,
    categoryPath: product.categoryPath.join(" > "),
    sellerName: product.sellerName,
  };
}
