import { describe, expect, it } from "vitest";
import { genericJsonCatalogConnector } from "../connectors/genericJsonCatalogConnector.js";
import { genericSitemapHtmlConnector } from "../connectors/genericSitemapHtmlConnector.js";
import { elryanApiConnector } from "../connectors/elryanApiConnector.js";
import { magentoVsfConnector } from "../connectors/magentoVsfConnector.js";
import { alnomoorTrpcConnector } from "../connectors/alnomoorTrpcConnector.js";
import { masterstoreNextConnector } from "../connectors/masterstoreNextConnector.js";
import { miswagNuxtConnector } from "../connectors/miswagNuxtConnector.js";
import { parseJibalzoneProductPage } from "../connectors/jibalzoneStorefrontConnector.js";
import { shopifyConnector } from "../connectors/shopifyConnector.js";
import { woocommerceConnector } from "../connectors/woocommerceConnector.js";
import { createFixtureHttpClient, loadFixture } from "./helpers/fakes.js";

describe("catalog connectors", () => {
  it("parses Jibalzone main product price and gallery without picking related products", () => {
    const html = `
      <meta property="product:price:amount" content="12.24">
      <meta property="product:price:currency" content="USD">
      <meta property="og:image" content="https://www.jibalzone.com/media/7841/conversions/product-og.jpg">
      <figure class="jibal-product-gallery__wrapper">
        <div class="jibal-product-gallery__image">
          <img src="https://www.jibalzone.com/media/7841/conversions/product-slider.jpg">
        </div>
      </figure>
      <h1 class="product_title entry-title">Romoss Charger AC30RB-H4-214H (UK, 30W)</h1>
      <p class="price" data-entity-id='main'>
        <del><span class="jibal-Price-amount amount"></span></del>
        <span class="jibal-Price-amount amount">IQD 17,993</span>
      </p>
      <p class="stock in-stock" data-entity-id='main'>Availability: <span>In Stock</span></p>
      <span class="sku" data-entity-id='main'>AC30RB-H4-214H</span>
      <div class="recent-product">
        <span class="price"><span class="jibal-Price-amount amount">IQD 6,997</span></span>
      </div>
    `;

    const product = parseJibalzoneProductPage(
      "jibalzone",
      "https://www.jibalzone.com/en/product/romoss-charger-ac30rb-h4-214h-uk-30w",
      html,
    );

    expect(product?.livePrice).toBe(17_993);
    expect(product?.imageUrl).toBe("https://www.jibalzone.com/media/7841/conversions/product-og.jpg");
    expect(product?.images).toContain("https://www.jibalzone.com/media/7841/conversions/product-slider.jpg");
  });

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
      const anonRequests: string[] = [];
      const metaRequests: string[] = [];
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
            if (url === "https://miswag.com/auth/v1/public/anonymous") {
              anonRequests.push(url);
              return JSON.parse(await loadFixture("miswag-anon-token.json"));
            }
            if (url === "https://ganesh-lama.miswag.com/content/v1/public/meta/items/1750000001") {
              metaRequests.push(url);
              return JSON.parse(await loadFixture("miswag-meta-1750000001.json"));
            }
            if (url === "https://ganesh-lama.miswag.com/content/v1/public/meta/items/1750000002") {
              metaRequests.push(url);
              return JSON.parse(await loadFixture("miswag-meta-1750000002.json"));
            }
            if (url === "https://ganesh-lama.miswag.com/content/v1/public/meta/items/1750000003") {
              metaRequests.push(url);
              return JSON.parse(await loadFixture("miswag-meta-1750000003.json"));
            }
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
      expect(anonRequests).toHaveLength(1);
      expect(metaRequests).toHaveLength(3);
      expect(requests[0]?.url).toContain("/multi_search?x-typesense-api-key=test-search-only-key");
      expect((requests[0]?.body.searches as Array<{ q?: string }>)?.[0]?.q).toBe("*");
      expect(sync.products).toHaveLength(3);
      expect(sync.estimatedCatalogSize).toBe(3);
      expect(sync.offers).toHaveLength(2);

      const iphone = sync.products.find((product) => product.sourceProductId === "1750000001");
      const charger = sync.products.find((product) => product.sourceProductId === "1750000003");

      expect(iphone?.sellerName).toBe("Miswag Direct");
      expect(iphone?.rawPayload.description).toContain("ميتا Miswag");
      expect(iphone?.categoryPath).toEqual(["ألكترونيات", "موبايلات و اجهزة يدوية", "موبايلات"]);
      expect(iphone?.onSale).toBe(true);
      expect(iphone?.imageUrl).toContain("main");
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

  it("pulls full ElRyan products from the catalog API and rewrites images through /img/", async () => {
    const html = await loadFixture("elryan-home.html");
    const probe = await elryanApiConnector.probe({
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

    expect(probe?.connectorType).toBe("elryan_api");

    const sync = await elryanApiConnector.sync({
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
      client: {
        async fetchText(url: string) {
          if (url === "https://www.elryan.com/") return html;
          throw new Error(`No text fixture mapped for ${url}`);
        },
        async fetchJson(url: string, init?: RequestInit) {
          if (url.includes("/category/_search")) {
            return JSON.parse(await loadFixture("elryan-api-categories.json"));
          }
          if (url.includes("/product/_search")) {
            if (url.includes("from=0")) {
              return JSON.parse(await loadFixture("elryan-api-products-category-42.json"));
            }
            return { hits: { total: 3, hits: [] } };
          }
          throw new Error(`No JSON fixture mapped for ${url}`);
        },
      },
    });

    expect(sync.products).toHaveLength(3);
    expect(sync.offers).toHaveLength(2);
    expect(sync.products.some((product) => product.title.includes("iPhone 16"))).toBe(true);
    expect(sync.products[0]?.imageUrl).toContain("/img/500/500/resize/catalog/product/");
    expect(sync.products.every((product) => product.images?.every((image) => image.includes("/img/500/500/resize/catalog/product/")))).toBe(true);
    expect(sync.products.every((product) => !product.imageUrl?.includes("/ar/"))).toBe(true);
    expect(sync.products.every((product) => !product.imageUrl?.includes("/web/image/"))).toBe(true);
    expect(sync.products[0]?.sourceUrl).toContain("/ar/");
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

  it("pulls Master Store products from backend API endpoints", async () => {
    const probe = await masterstoreNextConnector.probe({
      store: {
        id: "masterstore",
        name: "Master Store",
        normalizedName: "masterstore",
        slug: "master-store",
        discoverySource: "manual_seed",
        status: "probe_pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://www.masterstoreiq.com/",
        websiteType: "official",
      },
      homepageUrl: "https://www.masterstoreiq.com/",
      homepageHtml: "<html><script id=\"__NEXT_DATA__\"></script><script src=\"/_next/static/app.js\"></script><title>Master Store</title></html>",
    });

    expect(probe?.connectorType).toBe("masterstore_next");
    expect(probe?.endpoints.products).toBe("https://backend.masterstoreiq.com/en/api/products/?page=1");

    const requests: string[] = [];
    const sync = await masterstoreNextConnector.sync({
      store: {
        id: "masterstore",
        name: "Master Store",
        normalizedName: "masterstore",
        slug: "master-store",
        discoverySource: "manual_seed",
        status: "indexable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://www.masterstoreiq.com/",
        websiteType: "official",
      },
      profile: probe!,
      client: {
        async fetchText() {
          throw new Error("Master Store connector should not fetch HTML pages anymore.");
        },
        async fetchJson(url: string) {
          requests.push(url);
          if (url === "https://backend.masterstoreiq.com/en/api/products/?page=1") {
            return {
              count: 2,
              pages_number: 1,
              results: [
                {
                  id: 5391,
                  name: "iPhone 17 Pro Max",
                  slug: "iPhone-17-Pro-Max",
                  main_image: "https://cdn.example.com/iphone-main.jpg",
                  discount: false,
                  pre_order: false,
                },
                {
                  id: 9001,
                  name: "Master MagSafe Charger",
                  slug: "Master-MagSafe-Charger",
                  main_image: "https://cdn.example.com/charger-main.jpg",
                  discount: true,
                  pre_order: false,
                  is_accessory: true,
                },
              ],
            };
          }
          if (url === "https://backend.masterstoreiq.com/en/api/products/iPhone-17-Pro-Max/") {
            return {
              id: 5391,
              name: "iPhone 17 Pro Max",
              brand_name: "Apple",
              main_image: "https://cdn.example.com/iphone-main.jpg",
              slug: "iPhone-17-Pro-Max",
              sub_category: 1973,
              discount: false,
              pre_order: false,
              product_entries: [8873, 8874],
              colors: [
                { id: 1, color: "Cosmic Orange" },
              ],
              sizes: [
                { id: 7, size: "256GB" },
                { id: 8, size: "512GB" },
              ],
            };
          }
          if (url === "https://backend.masterstoreiq.com/en/api/products/Master-MagSafe-Charger/") {
            return {
              id: 9001,
              name: "Master MagSafe Charger",
              brand_name: "Master",
              main_image: "https://cdn.example.com/charger-main.jpg",
              slug: "Master-MagSafe-Charger",
              sub_category: 2001,
              discount: true,
              pre_order: false,
              product_entries: [],
              colors: [],
              sizes: [],
            };
          }
          throw new Error(`No fixture mapped for ${url}`);
        },
      },
    });

    expect(requests).toContain("https://backend.masterstoreiq.com/en/api/products/?page=1");
    expect(requests).toContain("https://backend.masterstoreiq.com/en/api/products/iPhone-17-Pro-Max/");
    expect(sync.products).toHaveLength(2);
    expect(sync.products[0]?.sourceUrl).toContain("/product/");
    expect(sync.products.find((product) => product.title.includes("iPhone"))?.brand).toBe("Apple");
    expect(sync.variants).toHaveLength(2);
    expect(sync.estimatedCatalogSize).toBe(2);
  });

  it("pulls Alnomoor products from tRPC products.list", async () => {
    const originalPageSize = process.env.CATALOG_ALNOMOOR_PAGE_SIZE;
    process.env.CATALOG_ALNOMOOR_PAGE_SIZE = "2";

    try {
    const probe = await alnomoorTrpcConnector.probe({
      store: {
        id: "alnomoor",
        name: "Alnomoor",
        normalizedName: "alnomoor",
        slug: "alnomoor",
        discoverySource: "manual_seed",
        status: "probe_pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://alnomoor.com/",
        websiteType: "official",
      },
      homepageUrl: "https://alnomoor.com/",
      homepageHtml: '<html><a href="/products"></a><script>/api/trpc api.products.list api.categories.get</script></html>',
    });

    expect(probe?.connectorType).toBe("alnomoor_trpc");

    const requests: string[] = [];
    const sync = await alnomoorTrpcConnector.sync({
      store: {
        id: "alnomoor",
        name: "Alnomoor",
        normalizedName: "alnomoor",
        slug: "alnomoor",
        discoverySource: "manual_seed",
        status: "indexable",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        website: "https://alnomoor.com/",
        websiteType: "official",
      },
      profile: probe!,
      client: {
        async fetchText() {
          throw new Error("Alnomoor connector should use tRPC JSON, not HTML scraping.");
        },
        async fetchJson(url: string) {
          requests.push(url);
          if (url.includes("/api/trpc/products.list")) {
            if (url.includes('%22page%22%3A1')) {
              return {
                result: {
                  data: {
                    json: {
                      total: 3,
                      data: [
                        {
                          id: "prod-1",
                          titleAr: "ايفون 17 برو ماكس",
                          titleEn: "iPhone 17 Pro Max",
                          descriptionAr: "وصف عربي",
                          price: 2100000,
                          comparePrice: 2300000,
                          isPublished: true,
                          categoryId: "cat-phones",
                          preview: { key: "iphone.webp" },
                          brand: { nameAr: "ابل", nameEn: "Apple" },
                          createdAt: "2026-04-21T00:00:00.000Z",
                        },
                        {
                          id: "prod-2",
                          titleAr: "شاحن انكر",
                          titleEn: "Anker Charger",
                          descriptionAr: "وصف شاحن",
                          price: 35000,
                          comparePrice: 40000,
                          isPublished: true,
                          categoryId: "cat-accessories",
                          preview: { key: "charger.webp" },
                          createdAt: "2026-04-21T00:00:00.000Z",
                        },
                      ],
                    },
                  },
                },
              };
            }
            return {
              result: {
                data: {
                  json: {
                    total: 3,
                    data: [
                      {
                        id: "prod-3",
                        titleAr: "قلم ذكي",
                        titleEn: "Smart Pen",
                        descriptionAr: "وصف قلم",
                        price: 15000,
                        comparePrice: null,
                        isPublished: true,
                        categoryId: "cat-accessories",
                        preview: { key: "pen.webp" },
                        createdAt: "2026-04-21T00:00:00.000Z",
                      },
                    ],
                  },
                },
              },
            };
          }
          if (url.includes("/api/trpc/categories.get")) {
            if (url.includes('cat-phones')) {
              return {
                result: {
                  data: {
                    json: {
                      id: "cat-phones",
                      nameEn: "Phones",
                      nameAr: "هواتف",
                      parent: { id: "parent-tech", nameEn: "Tech", nameAr: "تقنيات", parent: null },
                    },
                  },
                },
              };
            }
            return {
              result: {
                data: {
                  json: {
                    id: "cat-accessories",
                    nameEn: "Accessories",
                    nameAr: "اكسسوارات",
                    parent: null,
                  },
                },
              },
            };
          }
          throw new Error(`No fixture mapped for ${url}`);
        },
      },
    });

    expect(sync.products).toHaveLength(3);
    expect(sync.estimatedCatalogSize).toBe(3);
    expect(sync.products.find((product) => product.sourceProductId === "prod-1")?.categoryPath).toEqual(["تقنيات", "هواتف"]);
    expect(sync.products.find((product) => product.sourceProductId === "prod-1")?.imageUrl).toBe("https://alnomoor.com/api/storage/iphone.webp");
    expect(sync.products.find((product) => product.sourceProductId === "prod-2")?.onSale).toBe(true);
    expect(sync.products.find((product) => product.sourceProductId === "prod-3")?.sourceUrl).toBe("https://alnomoor.com/products/prod-3");
    expect(requests.some((url) => url.includes("/api/trpc/products.list"))).toBe(true);
    expect(requests.some((url) => url.includes("/api/trpc/categories.get"))).toBe(true);
    } finally {
      if (originalPageSize === undefined) delete process.env.CATALOG_ALNOMOOR_PAGE_SIZE;
      else process.env.CATALOG_ALNOMOOR_PAGE_SIZE = originalPageSize;
    }
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
