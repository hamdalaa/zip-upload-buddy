import type { CatalogConnector } from "./base.js";
import { buildOffersFromProducts, extractNuxtPayloads, extractProductCandidates, toCatalogProductDraft } from "./extractors.js";
import { connectorDefaultPriority } from "../shared/catalog/syncPolicy.js";
import { extractDomain } from "../shared/catalog/normalization.js";

export const miswagNuxtConnector: CatalogConnector = {
  type: "miswag_nuxt",

  async probe({ homepageHtml, homepageUrl }) {
    const domain = extractDomain(homepageUrl);
    if (!domain || !/miswag\.com$/i.test(domain)) return null;
    const signals = [
      homepageHtml.includes('id="__nuxt"') ? "__nuxt_root" : "",
      homepageHtml.includes("/_nuxt/") ? "nuxt_bundle" : "",
      /miswag/i.test(homepageHtml) ? "miswag_brand" : "",
    ].filter(Boolean);

    if (signals.length < 2) return null;

    return {
      connectorType: "miswag_nuxt",
      confidence: 0.96,
      signals,
      capabilities: {
        supportsStructuredApi: true,
        supportsHtmlCatalog: true,
        supportsOffers: true,
        supportsVariants: false,
        supportsMarketplaceContext: true,
        fallbackToBrowser: true,
      },
      endpoints: {
        search: new URL("/search?query=", homepageUrl).toString(),
        categories: new URL("/categories", homepageUrl).toString(),
      },
    };
  },

  async sync({ store, client, profile }) {
    const homepageUrl = store.website ?? profile.endpoints.search ?? "";
    const homepageHtml = await client.fetchText(homepageUrl);
    const payloads = extractNuxtPayloads(homepageHtml);
    const candidates = extractProductCandidates(payloads);
    const products = candidates
      .map((candidate) => toCatalogProductDraft(store.id, "miswag_nuxt", candidate, homepageUrl))
      .filter((product): product is NonNullable<typeof product> => Boolean(product));

    return {
      products,
      variants: [],
      offers: buildOffersFromProducts(products),
      estimatedCatalogSize: products.length,
      snapshots: [{ label: "homepage", payload: { url: homepageUrl, html: homepageHtml.slice(0, 200000) } }],
    };
  },
};

export const miswagDefaultPriority = connectorDefaultPriority("miswag_nuxt");
