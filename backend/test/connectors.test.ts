import { describe, expect, it } from "vitest";
import { genericJsonCatalogConnector } from "../connectors/genericJsonCatalogConnector.js";
import { genericSitemapHtmlConnector } from "../connectors/genericSitemapHtmlConnector.js";
import { magentoVsfConnector } from "../connectors/magentoVsfConnector.js";
import { miswagNuxtConnector } from "../connectors/miswagNuxtConnector.js";
import { shopifyConnector } from "../connectors/shopifyConnector.js";
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

  it("syncs Miswag from the live Typesense-backed catalog feed", async () => {
    const html = await loadFixture("miswag-home-live.html");
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

    const originalPageSize = process.env.CATALOG_MISWAG_TYPESENSE_PAGE_SIZE;
    process.env.CATALOG_MISWAG_TYPESENSE_PAGE_SIZE = "2";

    try {
      const requests: Array<{ url: string; body: Record<string, unknown> }> = [];
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
        client: {
          async fetchText(url: string) {
            if (url === "https://miswag.com/" || url === "https://miswag.com") return html;
            throw new Error(`No text fixture mapped for ${url}`);
          },
          async fetchJson(url: string, init?: RequestInit) {
            const body = JSON.parse(String(init?.body ?? "{}")) as { searches?: Array<{ page?: number; q?: string }> };
            requests.push({ url, body: body as Record<string, unknown> });
            const page = body.searches?.[0]?.page;
            if (page === 1) return JSON.parse(await loadFixture("miswag-typesense-page1.json"));
            if (page === 2) return JSON.parse(await loadFixture("miswag-typesense-page2.json"));
            throw new Error(`No JSON fixture mapped for page ${page ?? "unknown"}`);
          },
        },
      });

      expect(requests).toHaveLength(2);
      expect(requests[0]?.url).toContain("/multi_search?x-typesense-api-key=test-search-only-key");
      expect((requests[0]?.body.searches as Array<{ q?: string }>)?.[0]?.q).toBe("*");
      expect(sync.products).toHaveLength(3);
      expect(sync.estimatedCatalogSize).toBe(3);
      expect(sync.offers).toHaveLength(2);

      const iphone = sync.products.find((product) => product.sourceProductId === "1750000001");
      const charger = sync.products.find((product) => product.sourceProductId === "1750000003");

      expect(iphone?.sellerName).toBe("Miswag Direct");
      expect(iphone?.categoryPath).toEqual(["ألكترونيات", "موبايلات و اجهزة يدوية", "موبايلات"]);
      expect(iphone?.onSale).toBe(true);
      expect(charger?.brand).toBe("Anker");
      expect(charger?.sellerName).toBe("Karada Store");
      expect(charger?.availability).toBe("out_of_stock");
    } finally {
      if (originalPageSize === undefined) delete process.env.CATALOG_MISWAG_TYPESENSE_PAGE_SIZE;
      else process.env.CATALOG_MISWAG_TYPESENSE_PAGE_SIZE = originalPageSize;
    }
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
        "https://www.icenter-iraq.com/wp-json/wc/store/v1/products?per_page=100&page=2": "icenter-products-page2.json",
      }),
    });

    expect(sync.products.some((product) => product.title.includes("Apple Watch"))).toBe(true);
    expect(sync.products.some((product) => product.title.includes("Apple Pencil"))).toBe(true);
  });

  it("pulls Shopify products from products.json fixtures", async () => {
    const html = await loadFixture("shopify-home.html");
    const probe = await shopifyConnector.probe({
      store: {
        id: "shopify",
        name: "Shopify Test",
        normalizedName: "shopifytest",
        slug: "shopify-test",
        discoverySource: "manual_seed",
        status: "probe_pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://shop.example.com/",
        websiteType: "official",
      },
      homepageUrl: "https://shop.example.com/",
      homepageHtml: html,
    });

    expect(probe?.connectorType).toBe("shopify");

    const sync = await shopifyConnector.sync({
      store: {
        id: "shopify",
        name: "Shopify Test",
        normalizedName: "shopifytest",
        slug: "shopify-test",
        discoverySource: "manual_seed",
        status: "indexable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://shop.example.com/",
        websiteType: "official",
      },
      profile: probe!,
      client: createFixtureHttpClient({
        "https://shop.example.com/products.json?limit=250&page=1": "shopify-products-page1.json",
        "https://shop.example.com/products.json?limit=250&page=2": "shopify-products-page2.json",
      }),
    });

    expect(sync.products.some((product) => product.title.includes("Test Phone"))).toBe(true);
    expect(sync.variants).toHaveLength(2);
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
