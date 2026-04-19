import type { CatalogConnector } from "./base.js";

export const socialOnlyConnector: CatalogConnector = {
  type: "social_only",

  async probe({ store }) {
    if (store.websiteType !== "social") return null;
    return {
      connectorType: "social_only",
      confidence: 1,
      signals: ["social_only_website"],
      capabilities: {
        supportsStructuredApi: false,
        supportsHtmlCatalog: false,
        supportsOffers: false,
        supportsVariants: false,
        supportsMarketplaceContext: false,
        fallbackToBrowser: false,
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
