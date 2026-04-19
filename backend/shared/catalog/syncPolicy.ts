import type { ConnectorType, StoreSizeSummaryRecord, SyncPriorityTier } from "./types.js";

export interface SyncPriorityHint {
  indexedProductCount: number;
  activeOfferCount: number;
  coveragePct: number;
}

export function chooseSyncPriority(hint: SyncPriorityHint): SyncPriorityTier {
  if (hint.indexedProductCount >= 500 || hint.activeOfferCount >= 25) return "hourly";
  if (hint.indexedProductCount >= 100) return "six_hour";
  if (hint.indexedProductCount > 0 || hint.coveragePct >= 50) return "nightly";
  return "weekly";
}

export function connectorDefaultPriority(connectorType: ConnectorType): SyncPriorityTier {
  switch (connectorType) {
    case "masterstore_next":
    case "jibalzone_storefront":
    case "miswag_nuxt":
    case "magento_vsf":
      return "hourly";
    case "woocommerce":
    case "generic_json_catalog":
      return "six_hour";
    case "generic_sitemap_html":
      return "nightly";
    default:
      return "weekly";
  }
}

export function nextSyncDelayHours(summary?: StoreSizeSummaryRecord): number {
  const tier = summary?.syncPriorityTier ?? "weekly";
  switch (tier) {
    case "hourly":
      return 1;
    case "six_hour":
      return 6;
    case "nightly":
      return 24;
    default:
      return 24 * 7;
  }
}
