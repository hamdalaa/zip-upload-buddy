import type { CatalogConnector } from "./base.js";

export const unknownConnector: CatalogConnector = {
  type: "unknown",

  async probe() {
    return {
      connectorType: "unknown",
      confidence: 0.1,
      signals: ["no_known_platform_signals"],
      capabilities: {
        supportsStructuredApi: false,
        supportsHtmlCatalog: false,
        supportsOffers: false,
        supportsVariants: false,
        supportsMarketplaceContext: false,
        fallbackToBrowser: true,
      },
      endpoints: {},
    };
  },

  async sync() {
    return {
      products: [],
      variants: [],
      offers: [],
      snapshots: [],
    };
  },
};
