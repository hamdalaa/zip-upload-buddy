import type { CatalogProductDraft, SearchDocument, StoreRecord } from "./types.js";
import { compactText, sha256Hex } from "./normalization.js";
import { buildProductIdentityCanonicalId } from "./productIdentity.js";

export function buildLegacyCanonicalProductId(
  product: Pick<CatalogProductDraft | SearchDocument, "normalizedTitle" | "title" | "brand" | "model">,
) {
  const fingerprint = [
    compactText(product.brand ?? ""),
    compactText(product.model ?? ""),
    compactText(product.normalizedTitle || product.title),
  ].join("|");
  return `unified_${sha256Hex(fingerprint).slice(0, 24)}`;
}

export function buildCanonicalProductId(
  product: Pick<CatalogProductDraft | SearchDocument, "normalizedTitle" | "title" | "brand" | "model"> & {
    categoryPath?: string[] | string;
    sku?: string;
  },
) {
  return buildProductIdentityCanonicalId(product) ?? buildLegacyCanonicalProductId(product);
}

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
    imageUrl: product.primaryImageUrl ?? product.imageUrl,
    currency: product.currency,
    offerLabel: product.offerLabel,
    sellerName: product.sellerName,
  };
}
