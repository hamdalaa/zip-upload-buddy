import { describe, expect, it } from "vitest";
import { genericJsonCatalogConnector } from "../connectors/genericJsonCatalogConnector.js";
import { genericSitemapHtmlConnector } from "../connectors/genericSitemapHtmlConnector.js";
import { magentoVsfConnector } from "../connectors/magentoVsfConnector.js";
import { miswagNuxtConnector } from "../connectors/miswagNuxtConnector.js";
import { woocommerceConnector } from "../connectors/woocommerceConnector.js";
import { createFixtureHttpClient, loadFixture } from "./helpers/fakes.js";

describe("catalog connectors", () => {
  it("detects and syncs Miswag Nuxt fixtures", async () => {
    const html = await loadFixture("miswag-home.html");
    const probe = await miswagNuxtConnector.probe({
      store: {
        id: "miswag",
        name: "Miswag",
        normalizedName: "miswag",
        slug: "miswag",
        discoverySource: "manual_seed",
        status: "probe_pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://miswag.com/",
        websiteType: "official",
      },
      homepageUrl: "https://miswag.com/",
      homepageHtml: html,
    });

    expect(probe?.connectorType).toBe("miswag_nuxt");

    const sync = await miswagNuxtConnector.sync({
      store: {
        id: "miswag",
        name: "Miswag",
        normalizedName: "miswag",
        slug: "miswag",
        discoverySource: "manual_seed",
        status: "indexable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://miswag.com/",
        websiteType: "official",
      },
      profile: probe!,
      client: createFixtureHttpClient({
        "https://miswag.com/": "miswag-home.html",
      }),
    });

    expect(sync.products).toHaveLength(2);
    expect(sync.products[0]?.sellerName).toBe("Miswag Direct");
  });

  it("detects and syncs Magento VSF fixtures", async () => {
    const html = await loadFixture("elryan-home.html");
    const probe = await magentoVsfConnector.probe({
      store: {
        id: "elryan",
        name: "ElRyan",
        normalizedName: "elryan",
        slug: "elryan",
        discoverySource: "manual_seed",
        status: "probe_pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://www.elryan.com/",
        websiteType: "official",
      },
      homepageUrl: "https://www.elryan.com/",
      homepageHtml: html,
    });

    expect(probe?.connectorType).toBe("magento_vsf");

    const sync = await magentoVsfConnector.sync({
      store: {
        id: "elryan",
        name: "ElRyan",
        normalizedName: "elryan",
        slug: "elryan",
        discoverySource: "manual_seed",
        status: "indexable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://www.elryan.com/",
        websiteType: "official",
      },
      profile: probe!,
      client: createFixtureHttpClient({
        "https://www.elryan.com/": "elryan-home.html",
      }),
    });

    expect(sync.products.some((product) => product.title.includes("iPhone 16"))).toBe(true);
  });

  it("pulls WooCommerce products from store API fixtures", async () => {
    const html = await loadFixture("icenter-home.html");
    const probe = await woocommerceConnector.probe({
      store: {
        id: "icenter",
        name: "iCenter Iraq",
        normalizedName: "icenteriraq",
        slug: "icenter-iraq",
        discoverySource: "manual_seed",
        status: "probe_pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://www.icenter-iraq.com/",
        websiteType: "official",
      },
      homepageUrl: "https://www.icenter-iraq.com/",
      homepageHtml: html,
    });

    expect(probe?.connectorType).toBe("woocommerce");

    const sync = await woocommerceConnector.sync({
      store: {
        id: "icenter",
        name: "iCenter Iraq",
        normalizedName: "icenteriraq",
        slug: "icenter-iraq",
        discoverySource: "manual_seed",
        status: "indexable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://www.icenter-iraq.com/",
        websiteType: "official",
      },
      profile: probe!,
      client: createFixtureHttpClient({
        "https://www.icenter-iraq.com/wp-json/wc/store/v1/products?per_page=100&page=1": "icenter-products.json",
      }),
    });

    expect(sync.products[0]?.title).toContain("Apple Watch");
  });

  it("parses JSON-LD and sitemap HTML fixtures", async () => {
    const homeHtml = await loadFixture("korektel-home.html");
    const jsonProbe = await genericJsonCatalogConnector.probe({
      store: {
        id: "korektel",
        name: "KorekTel",
        normalizedName: "korektel",
        slug: "korektel",
        discoverySource: "manual_seed",
        status: "probe_pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://korektel.com/",
        websiteType: "official",
      },
      homepageUrl: "https://korektel.com/",
      homepageHtml: homeHtml,
    });
    expect(jsonProbe?.connectorType).toBe("generic_json_catalog");

    const jsonSync = await genericJsonCatalogConnector.sync({
      store: {
        id: "korektel",
        name: "KorekTel",
        normalizedName: "korektel",
        slug: "korektel",
        discoverySource: "manual_seed",
        status: "indexable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://korektel.com/",
        websiteType: "official",
      },
      profile: jsonProbe!,
      client: createFixtureHttpClient({
        "https://korektel.com/": "korektel-home.html",
      }),
    });
    expect(jsonSync.products[0]?.title).toContain("ماك بوك");

    const sitemapSync = await genericSitemapHtmlConnector.sync({
      store: {
        id: "korektel",
        name: "KorekTel",
        normalizedName: "korektel",
        slug: "korektel",
        discoverySource: "manual_seed",
        status: "indexable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://korektel.com/",
        websiteType: "official",
      },
      profile: {
        connectorType: "generic_sitemap_html",
        confidence: 0.51,
        signals: ["fallback_sitemap_probe"],
        capabilities: {
          supportsStructuredApi: false,
          supportsHtmlCatalog: true,
          supportsOffers: true,
          supportsVariants: false,
          supportsMarketplaceContext: false,
          fallbackToBrowser: true,
        },
        endpoints: {
          sitemap: "https://korektel.com/sitemap.xml",
        },
      },
      client: createFixtureHttpClient({
        "https://korektel.com/sitemap.xml": "sitemap.xml",
        "https://korektel.com/product/macbook-air-m3": "korektel-home.html",
      }),
    });

    expect(sitemapSync.products.length).toBeGreaterThan(0);
  });
});
