import { describe, expect, it } from "vitest";
import type { CatalogContext } from "../shared/bootstrap.js";
import { buildPublicProductFull, buildPublicUnifiedSearch } from "../api/publicCatalog.js";
import { buildLegacyCanonicalProductId, buildSearchDocument } from "../shared/catalog/searchDocuments.js";
import { nowIso, compactText } from "../shared/catalog/normalization.js";
import type { CatalogProductDraft, StoreRecord } from "../shared/catalog/types.js";
import { catalogConfig } from "../shared/config.js";
import { MemoryCatalogRepository } from "../shared/repositories/memoryCatalogRepository.js";
import { MemorySearchEngine } from "../shared/search/memorySearchEngine.js";

function makeStore(id: string, name: string, category: string, website?: string): StoreRecord {
  const timestamp = nowIso();
  return {
    id,
    name,
    normalizedName: compactText(name),
    slug: compactText(name),
    discoverySource: "manual_seed",
    status: "indexed",
    createdAt: timestamp,
    updatedAt: timestamp,
    website: website ?? `https://${id}.example.com`,
    websiteType: "official",
    area: "شارع الصناعة",
    primaryCategory: category,
  };
}

function makeProduct(input: {
  storeId: string;
  sourceProductId: string;
  title: string;
  brand?: string;
  model?: string;
  categoryPath: string[];
  price: number;
  currency?: string;
  sourceUrl?: string;
  sourceConnector?: CatalogProductDraft["sourceConnector"];
}): CatalogProductDraft {
  const timestamp = nowIso();
  return {
    storeId: input.storeId,
    sourceProductId: input.sourceProductId,
    normalizedTitle: compactText(input.title),
    title: input.title,
    brand: input.brand,
    model: input.model,
    sku: input.sourceProductId.toUpperCase(),
    categoryPath: input.categoryPath,
    sourceUrl: input.sourceUrl ?? `https://${input.storeId}.example.com/p/${input.sourceProductId}`,
    availability: "in_stock",
    currency: input.currency ?? "IQD",
    livePrice: input.price,
    onSale: false,
    sourceConnector: input.sourceConnector ?? "shopify",
    freshnessAt: timestamp,
    lastSeenAt: timestamp,
    brandTokens: input.brand ? [input.brand.toLowerCase()] : [],
    modelTokens: input.model ? [input.model.toLowerCase()] : [],
    skuTokens: [input.sourceProductId.toLowerCase()],
    rawPayload: {},
  };
}

async function withNonSqliteCatalog<T>(run: () => Promise<T>): Promise<T> {
  const database = catalogConfig.database as { driver: "sqlite" | "postgres" };
  const originalDriver = database.driver;
  database.driver = "postgres";
  try {
    return await run();
  } finally {
    database.driver = originalDriver;
  }
}

describe("search relevance", () => {
  it("keeps direct mac matches ahead of unrelated partial substrings", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const stores = [
      makeStore("apple-house", "Apple House", "Computing"),
      makeStore("pc-hub", "PC Hub", "Accessories"),
      makeStore("apple-corner", "Apple Corner", "Smart Devices"),
    ];

    const products = [
      makeProduct({
        storeId: "apple-house",
        sourceProductId: "macbook-air-m3",
        title: "MacBook Air M3",
        brand: "Apple",
        model: "M3",
        categoryPath: ["Computing", "Laptops"],
        price: 1_450_000,
      }),
      makeProduct({
        storeId: "pc-hub",
        sourceProductId: "machine-mouse",
        title: "Machine Gaming Mouse",
        brand: "Generic",
        categoryPath: ["Accessories", "Mouse"],
        price: 45_000,
      }),
      makeProduct({
        storeId: "apple-corner",
        sourceProductId: "watch-series-10",
        title: "Apple Watch Series 10",
        brand: "Apple",
        categoryPath: ["Wearables", "Smartwatch"],
        price: 520_000,
      }),
    ];

    for (const store of stores) {
      await repository.upsertStore(store);
      const storeProducts = products.filter((product) => product.storeId === store.id);
      await repository.replaceCatalogSnapshot(store.id, storeProducts, [], []);
      await searchEngine.replaceStoreDocuments(store.id, storeProducts.map((product) => buildSearchDocument(store, product)));
    }

    const searchResult = await searchEngine.search({ q: "mac", limit: 10 });
    expect(searchResult.hits[0]?.title).toBe("MacBook Air M3");

    const publicResult = await buildPublicUnifiedSearch(
      { repository, searchEngine } as unknown as CatalogContext,
      { q: "mac", sort: "relevance" },
    );
    expect(publicResult.products[0]?.title).toBe("MacBook Air M3");
  });

  it("puts phone devices before cases and unrelated model-code products", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const stores = [
      makeStore("phone-store", "Phone Store", "Phones"),
      makeStore("accessory-store", "Accessory Store", "Accessories"),
      makeStore("appliance-store", "Appliance Store", "Appliances"),
    ];

    const products = [
      makeProduct({
        storeId: "accessory-store",
        sourceProductId: "case-s24-ultra",
        title: "CASE FOR SAMSUNG S24 ULTRA",
        brand: "Generic",
        categoryPath: ["Accessories", "Cases"],
        price: 1_500_000,
      }),
      makeProduct({
        storeId: "accessory-store",
        sourceProductId: "s24-ultra-pen",
        title: "S24 Ultra Pen",
        categoryPath: ["Cameras"],
        price: 35_000,
      }),
      makeProduct({
        storeId: "appliance-store",
        sourceProductId: "split-s241",
        title: "S241YHI split air conditioner",
        categoryPath: ["Appliances", "Split"],
        price: 2_000_000,
      }),
      makeProduct({
        storeId: "phone-store",
        sourceProductId: "galaxy-s24-ultra",
        title: "Samsung Galaxy S24 Ultra 256GB",
        brand: "Samsung",
        model: "S24 Ultra",
        categoryPath: ["Phones", "Smartphones"],
        price: 950_000,
      }),
      makeProduct({
        storeId: "phone-store",
        sourceProductId: "galaxy-s24-fe",
        title: "سامسونج كلاكسي S24 FE",
        brand: "Samsung",
        model: "S24 FE",
        categoryPath: ["موبايل"],
        price: 640_000,
      }),
    ];

    for (const store of stores) {
      await repository.upsertStore(store);
      const storeProducts = products.filter((product) => product.storeId === store.id);
      await repository.replaceCatalogSnapshot(store.id, storeProducts, [], []);
      await searchEngine.replaceStoreDocuments(store.id, storeProducts.map((product) => buildSearchDocument(store, product)));
    }

    const searchResult = await searchEngine.search({ q: "s24", limit: 10 });
    expect(searchResult.hits[0]?.title).toContain("Galaxy S24");
    expect(searchResult.hits[1]?.title).toContain("كلاكسي S24");

    const publicResult = await buildPublicUnifiedSearch(
      { repository, searchEngine } as unknown as CatalogContext,
      { q: "s24", sort: "price_desc" },
    );
    expect(publicResult.products[0]?.title).toContain("Galaxy S24");
    expect(publicResult.products[1]?.title).toContain("كلاكسي S24");
    expect(publicResult.products.findIndex((product) => /case/i.test(product.title))).toBeGreaterThan(1);
    expect(publicResult.products.findIndex((product) => /pen/i.test(product.title))).toBeGreaterThan(1);
  });

  it("merges ADATA SC735 2TB offers across stores without mixing the 1TB variant", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const stores = [
      makeStore("miswag", "Miswag", "Electronics"),
      makeStore("alnabaa", "Al Nabaa", "Computing"),
    ];

    const miswag2tb = makeProduct({
      storeId: "miswag",
      sourceProductId: "sc735-2tb-miswag",
      title: "ADATA SC735 قرص SSD خارجي محمول - سعة 2 تيرابايت، موصل USB-C منزلق",
      brand: "ADATA",
      model: "SC735",
      categoryPath: ["external-hard-drives"],
      price: 335_000,
      sourceUrl: "https://miswag.com/product/adata-sc735-2tb",
    });
    const alNabaa2tb = makeProduct({
      storeId: "alnabaa",
      sourceProductId: "sc735-2tb-nabaa",
      title: "ADATA SC735 Portable External SSD – 2TB, Retractable USB-C, MIL-STD Drop Resistance",
      brand: "ADATA",
      model: "SC735",
      categoryPath: ["Drives & Storage", "External SSD"],
      price: 510_000,
      sourceUrl: "https://store.alnabaa.com/products/adata-sc735-2tb",
    });
    const alNabaa1tb = makeProduct({
      storeId: "alnabaa",
      sourceProductId: "sc735-1tb-nabaa",
      title: "ADATA SC735 Portable External SSD – 1TB, Retractable USB-C, MIL-STD Drop Resistance",
      brand: "ADATA",
      model: "SC735",
      categoryPath: ["Drives & Storage", "External SSD"],
      price: 335_000,
      sourceUrl: "https://store.alnabaa.com/products/adata-sc735-1tb",
    });

    for (const store of stores) {
      await repository.upsertStore(store);
      const storeProducts = [miswag2tb, alNabaa2tb, alNabaa1tb].filter((product) => product.storeId === store.id);
      await repository.replaceCatalogSnapshot(store.id, storeProducts, [], []);
      await searchEngine.replaceStoreDocuments(store.id, storeProducts.map((product) => buildSearchDocument(store, product)));
    }

    const publicResult = await buildPublicUnifiedSearch(
      { repository, searchEngine } as unknown as CatalogContext,
      { q: "ADATA SC735 2TB", sort: "relevance" },
    );
    const twoTb = publicResult.products.find((product) => product.title.includes("2TB") || product.title.includes("2 تيرابايت"));
    const oneTb = publicResult.products.find((product) => product.title.includes("1TB"));

    expect(twoTb?.offerCount).toBe(2);
    expect(twoTb?.lowestPrice).toBe(335_000);
    expect(oneTb?.id).not.toBe(twoTb?.id);

    const payload = await withNonSqliteCatalog(() =>
      buildPublicProductFull(
        { repository, searchEngine } as unknown as CatalogContext,
        buildLegacyCanonicalProductId(miswag2tb),
      ),
    );
    expect(payload?.offers.map((offer) => offer.storeName).sort()).toEqual(["Al Nabaa", "Miswag"]);
    expect(payload?.offers.every((offer) => !offer.productUrl.includes("1tb"))).toBe(true);
  });

  it("merges Redmi Watch 5 offers across stores without mixing the Lite variant", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const stores = [
      makeStore("qalaa", "عالم القلعة", "Wearables"),
      makeStore("jibal", "Jibal", "Wearables"),
      makeStore("elryan", "ElRyan", "Electronics"),
    ];

    const qalaaWatch = makeProduct({
      storeId: "qalaa",
      sourceProductId: "redmi-watch-5-qalaa",
      title: "Redmi Watch 5",
      brand: "Redmi",
      model: "Watch 5",
      categoryPath: ["Wearables", "Smart Watches"],
      price: 45_000,
      sourceUrl: "https://qalaa-iq.com/redmi-watch-5",
    });
    const jibalWatch = makeProduct({
      storeId: "jibal",
      sourceProductId: "redmi-watch-5-jibal",
      title: "Xiaomi Redmi Watch 5 - 2.07 Inch - Square AMOLED - Battery lasts up to 24 days",
      brand: "Xiaomi",
      categoryPath: ["Smart watches & Wearable Devices", "Smart Watches"],
      price: 130_207,
      sourceUrl: "https://jibalzone.com/xiaomi-redmi-watch-5",
    });
    const elryanWatch = makeProduct({
      storeId: "elryan",
      sourceProductId: "redmi-watch-5-elryan",
      title: "ساعة شاومي ريدمي Watch 5 شاشة AMOLED",
      brand: "Xiaomi",
      categoryPath: ["ساعات ذكية"],
      price: 124_994,
      sourceUrl: "https://www.elryan.com/redmi-watch-5",
    });
    const lite = makeProduct({
      storeId: "elryan",
      sourceProductId: "redmi-watch-5-lite-elryan",
      title: "Xiaomi Redmi Watch 5 Lite",
      brand: "Xiaomi",
      categoryPath: ["Wearables", "Smart Watches"],
      price: 80_000,
      sourceUrl: "https://www.elryan.com/redmi-watch-5-lite",
    });

    for (const store of stores) {
      await repository.upsertStore(store);
      const storeProducts = [qalaaWatch, jibalWatch, elryanWatch, lite].filter((product) => product.storeId === store.id);
      await repository.replaceCatalogSnapshot(store.id, storeProducts, [], []);
      await searchEngine.replaceStoreDocuments(store.id, storeProducts.map((product) => buildSearchDocument(store, product)));
    }

    const publicResult = await buildPublicUnifiedSearch(
      { repository, searchEngine } as unknown as CatalogContext,
      { q: "readmi watch 5", sort: "relevance" },
    );
    const watch5 = publicResult.products.find((product) => product.title === "Redmi Watch 5");
    const watch5Lite = publicResult.products.find((product) => product.title.includes("Lite"));

    expect(publicResult.products[0]?.id).toBe(watch5?.id);
    expect(watch5?.offerCount).toBe(3);
    expect(watch5?.lowestPrice).toBe(45_000);
    expect(watch5Lite?.id).not.toBe(watch5?.id);

    const payload = await withNonSqliteCatalog(() =>
      buildPublicProductFull(
        { repository, searchEngine } as unknown as CatalogContext,
        buildLegacyCanonicalProductId(qalaaWatch),
      ),
    );
    expect(payload?.offers.map((offer) => offer.storeName).sort()).toEqual(["ElRyan", "Jibal", "عالم القلعة"]);
  });

  it("expands search result offers beyond the stores returned by the first search hits", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const stores = [
      makeStore("qalaa", "عالم القلعة", "Wearables"),
      makeStore("jibal", "Jibal", "Wearables"),
      makeStore("elryan", "ElRyan", "Electronics"),
    ];

    const qalaaWatch = makeProduct({
      storeId: "qalaa",
      sourceProductId: "redmi-watch-5-qalaa",
      title: "Redmi Watch 5",
      brand: "Redmi",
      model: "Watch 5",
      categoryPath: ["Wearables", "Smart Watches"],
      price: 45_000,
      sourceUrl: "https://qalaa-iq.com/redmi-watch-5",
    });
    const jibalWatch = makeProduct({
      storeId: "jibal",
      sourceProductId: "redmi-watch-5-jibal",
      title: "Xiaomi Redmi Watch 5 - 2.07 Inch - Square AMOLED - Battery lasts up to 24 days",
      brand: "Xiaomi",
      categoryPath: ["Smart watches & Wearable Devices", "Smart Watches"],
      price: 130_207,
      sourceUrl: "https://jibalzone.com/xiaomi-redmi-watch-5",
    });
    const elryanWatch = makeProduct({
      storeId: "elryan",
      sourceProductId: "redmi-watch-5-elryan",
      title: "ساعة شاومي ريدمي Watch 5 شاشة AMOLED",
      brand: "Xiaomi",
      categoryPath: ["ساعات ذكية"],
      price: 124_994,
      sourceUrl: "https://www.elryan.com/redmi-watch-5",
    });

    for (const store of stores) {
      await repository.upsertStore(store);
      const storeProducts = [qalaaWatch, jibalWatch, elryanWatch].filter((product) => product.storeId === store.id);
      await repository.replaceCatalogSnapshot(store.id, storeProducts, [], []);
      await searchEngine.replaceStoreDocuments(store.id, storeProducts.map((product) => buildSearchDocument(store, product)));
    }

    const qalaaOnlySearchEngine = {
      ensureReady: async () => {},
      replaceStoreDocuments: async () => {},
      search: async () => ({
        total: 1,
        hits: [buildSearchDocument(stores[0]!, qalaaWatch)],
      }),
    };

    const publicResult = await buildPublicUnifiedSearch(
      { repository, searchEngine: qalaaOnlySearchEngine } as unknown as CatalogContext,
      { q: "readmi watch 5", sort: "relevance" },
    );

    expect(publicResult.products).toHaveLength(1);
    expect(publicResult.products[0]?.offerCount).toBe(3);
    expect(publicResult.totalOffers).toBe(3);
  });

  it("deduplicates repeated URLs from the same merchant for one product", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const store = makeStore("alnabaa", "Al Nabaa", "Computing");
    const products = [
      makeProduct({
        storeId: "alnabaa",
        sourceProductId: "sc735-2tb-primary",
        title: "ADATA SC735 Portable External SSD – 2TB, Retractable USB-C",
        brand: "ADATA",
        model: "SC735",
        categoryPath: ["Drives & Storage", "External SSD"],
        price: 510_000,
        sourceUrl: "https://store.alnabaa.com/products/adata-sc735-2tb",
      }),
      makeProduct({
        storeId: "alnabaa",
        sourceProductId: "sc735-2tb-duplicate",
        title: "ADATA SC735 Portable External SSD 2TB USB-C",
        brand: "ADATA",
        model: "SC735",
        categoryPath: ["External SSD"],
        price: 490_000,
        sourceUrl: "https://store.alnabaa.com/products/adata-sc735-2tb?variant=blue",
      }),
    ];

    await repository.upsertStore(store);
    await repository.replaceCatalogSnapshot(store.id, products, [], []);
    await searchEngine.replaceStoreDocuments(store.id, products.map((product) => buildSearchDocument(store, product)));

    const payload = await withNonSqliteCatalog(() =>
      buildPublicProductFull(
        { repository, searchEngine } as unknown as CatalogContext,
        buildLegacyCanonicalProductId(products[0]!),
      ),
    );

    expect(payload?.offers).toHaveLength(1);
    expect(payload?.offers[0]?.price).toBe(490_000);
  });

  it("normalizes ElRyan decimal IQD source prices before exposing offers", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const stores = [
      makeStore("scraped_www_elryan_com", "ElRyan", "Electronics", "https://www.elryan.com/"),
      makeStore("jibal", "Jibal", "Wearables", "https://jibalzone.com/"),
    ];

    const elryanWatch = makeProduct({
      storeId: "scraped_www_elryan_com",
      sourceProductId: "redmi-watch-5-elryan-decimal",
      title: "ساعة شاومي ريدمي واتش 5 - 2.07 انج - سوير اموليد",
      brand: "Xiaomi",
      model: "Redmi Watch 5",
      categoryPath: ["ساعات ذكية"],
      price: 82.4675,
      currency: "IQD",
      sourceConnector: "elryan_api",
      sourceUrl: "https://www.elryan.com/ar/xiaomi-redmi-watch-5.html",
    });
    const jibalWatch = makeProduct({
      storeId: "jibal",
      sourceProductId: "redmi-watch-5-jibal",
      title: "Xiaomi Redmi Watch 5 - 2.07 Inch - Square AMOLED",
      brand: "Xiaomi",
      model: "Redmi Watch 5",
      categoryPath: ["Smart watches & Wearable Devices", "Smart Watches"],
      price: 124_994,
      sourceUrl: "https://jibalzone.com/xiaomi-redmi-watch-5",
    });

    for (const store of stores) {
      await repository.upsertStore(store);
      const storeProducts = [elryanWatch, jibalWatch].filter((product) => product.storeId === store.id);
      await repository.replaceCatalogSnapshot(store.id, storeProducts, [], []);
      await searchEngine.replaceStoreDocuments(store.id, storeProducts.map((product) => buildSearchDocument(store, product)));
    }

    const payload = await withNonSqliteCatalog(() =>
      buildPublicProductFull(
        { repository, searchEngine } as unknown as CatalogContext,
        buildLegacyCanonicalProductId(elryanWatch),
      ),
    );

    expect(payload?.offers.map((offer) => [offer.storeName, offer.price])).toEqual([
      ["ElRyan", 124_994],
      ["Jibal", 124_994],
    ]);
  });

  it("applies source-wide price quality rules instead of leaking tiny or foreign prices", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const stores = [
      makeStore("scraped_www_3d_iraq_com", "3d Iraq", "Gaming", "https://3d-iraq.com/"),
      makeStore("canon-erbil", "Canon Erbil", "Cameras", "https://store.canon-erbil.com/"),
      makeStore("bad-tiny", "Bad Tiny", "Accessories", "https://bad-tiny.example.com/"),
      makeStore("manufacturer", "Apple", "Phones", "https://www.apple.com/"),
    ];

    const usdMarkedIqd = makeProduct({
      storeId: "scraped_www_3d_iraq_com",
      sourceProductId: "redragon-mouse",
      title: "Redragon M693 RGB Wireless Mouse",
      brand: "Redragon",
      model: "M693",
      categoryPath: ["Gaming", "Mouse"],
      price: 40,
      currency: "IQD",
      sourceUrl: "https://3d-iraq.com/3475-redragon-m693-rgb-wireless-mouse",
    });
    const explicitUsd = makeProduct({
      storeId: "canon-erbil",
      sourceProductId: "canon-r50",
      title: "Canon EOS R50 Mirrorless Camera",
      brand: "Canon",
      model: "EOS R50",
      categoryPath: ["Cameras"],
      price: 650,
      currency: "USD",
      sourceUrl: "https://store.canon-erbil.com/products/canon-eos-r50",
    });
    const tinyUnknown = makeProduct({
      storeId: "bad-tiny",
      sourceProductId: "bad-mouse",
      title: "Redragon M693 RGB Wireless Mouse",
      brand: "Redragon",
      model: "M693",
      categoryPath: ["Gaming", "Mouse"],
      price: 40,
      currency: "IQD",
      sourceUrl: "https://bad-tiny.example.com/products/redragon-m693",
    });
    const manufacturerSpec = makeProduct({
      storeId: "manufacturer",
      sourceProductId: "iphone-spec",
      title: "Apple iPhone 15",
      brand: "Apple",
      model: "iPhone 15",
      categoryPath: ["Phones"],
      price: 799,
      currency: "USD",
      sourceUrl: "https://www.apple.com/iphone-15/",
    });

    for (const store of stores) {
      await repository.upsertStore(store);
      const storeProducts = [usdMarkedIqd, explicitUsd, tinyUnknown, manufacturerSpec].filter((product) => product.storeId === store.id);
      await repository.replaceCatalogSnapshot(store.id, storeProducts, [], []);
      await searchEngine.replaceStoreDocuments(store.id, storeProducts.map((product) => buildSearchDocument(store, product)));
    }

    const mousePayload = await withNonSqliteCatalog(() =>
      buildPublicProductFull(
        { repository, searchEngine } as unknown as CatalogContext,
        buildLegacyCanonicalProductId(usdMarkedIqd),
      ),
    );
    expect(mousePayload?.offers.map((offer) => [offer.storeName, offer.price, offer.currency])).toEqual([
      ["3d Iraq", 60_627, "IQD"],
    ]);

    const cameraPayload = await withNonSqliteCatalog(() =>
      buildPublicProductFull(
        { repository, searchEngine } as unknown as CatalogContext,
        buildLegacyCanonicalProductId(explicitUsd),
      ),
    );
    expect(cameraPayload?.offers[0]?.price).toBe(985_192);
    expect(cameraPayload?.offers[0]?.currency).toBe("IQD");

    const specPayload = await withNonSqliteCatalog(() =>
      buildPublicProductFull(
        { repository, searchEngine } as unknown as CatalogContext,
        buildLegacyCanonicalProductId(manufacturerSpec),
      ),
    );
    expect(specPayload).toBeNull();
  });

  it("rejects foreign-currency or blocked-domain offers instead of showing them as IQD", async () => {
    const repository = new MemoryCatalogRepository();
    const searchEngine = new MemorySearchEngine();

    const stores = [
      makeStore("wiwu-bad", "WIWU Iraq", "Cameras", "https://www.almatajiralthalath.com/"),
      makeStore("iraqi-camera", "Iraqi Camera", "Cameras", "https://iraqi-camera.example.com/"),
    ];

    const badForeignOffer = makeProduct({
      storeId: "wiwu-bad",
      sourceProductId: "canon-90d-aed",
      title: "Canon EOS 90D DSLR Camera Black + EFS 18-135mm Lens",
      brand: "Canon",
      model: "EOS 90D",
      categoryPath: ["Cameras", "DSLR"],
      price: 499_900,
      currency: "AED",
      sourceUrl: "https://www.almatajiralthalath.com/product/canon-eos-90d-dslr-camera-black-efs-18-135mm-lens/",
    });
    const goodIraqiOffer = makeProduct({
      storeId: "iraqi-camera",
      sourceProductId: "canon-90d-iqd",
      title: "Canon EOS 90D DSLR Camera Black + EFS 18-135mm Lens",
      brand: "Canon",
      model: "EOS 90D",
      categoryPath: ["Cameras", "DSLR"],
      price: 4_250_000,
      sourceUrl: "https://iraqi-camera.example.com/product/canon-eos-90d",
    });

    for (const store of stores) {
      await repository.upsertStore(store);
      const storeProducts = [badForeignOffer, goodIraqiOffer].filter((product) => product.storeId === store.id);
      await repository.replaceCatalogSnapshot(store.id, storeProducts, [], []);
      await searchEngine.replaceStoreDocuments(store.id, storeProducts.map((product) => buildSearchDocument(store, product)));
    }

    const publicResult = await buildPublicUnifiedSearch(
      { repository, searchEngine } as unknown as CatalogContext,
      { q: "Canon EOS 90D", sort: "relevance" },
    );
    const canon = publicResult.products.find((product) => product.title.includes("Canon EOS 90D"));

    expect(canon?.offerCount).toBe(1);
    expect(canon?.lowestPrice).toBe(4_250_000);

    const payload = await withNonSqliteCatalog(() =>
      buildPublicProductFull(
        { repository, searchEngine } as unknown as CatalogContext,
        buildLegacyCanonicalProductId(badForeignOffer),
      ),
    );

    expect(payload?.offers.map((offer) => offer.storeName)).toEqual(["Iraqi Camera"]);
    expect(payload?.offers[0]?.price).toBe(4_250_000);
    expect(payload?.offers[0]?.currency).toBe("IQD");
  });
});
