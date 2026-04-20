import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Area, BrandDealer, Category, CrawlRun, ProductIndex, Shop, ShopSource } from "./types";
import { initialBrands, initialCrawlRuns, initialProducts, initialShopSources, initialShops } from "./mockData";
import { getCatalogBootstrap, getCatalogProducts } from "./catalogApi";
import { DataStoreContext, type DataStoreValue } from "./dataStoreContext";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || `shop-${Date.now()}`;

const FULL_CATALOG_PAGE_SIZE = 2000;

function deriveShopSources(shops: Shop[]): ShopSource[] {
  return shops.flatMap((shop) => {
    const sources: ShopSource[] = [];
    if (shop.website) {
      sources.push({
        id: `src:${shop.id}:website`,
        shopId: shop.id,
        sourceType: "website",
        sourceUrl: shop.website,
        status: "ok",
        pagesVisited: 0,
      });
    }
    if (shop.googleMapsUrl) {
      sources.push({
        id: `src:${shop.id}:maps`,
        shopId: shop.id,
        sourceType: "google_maps",
        sourceUrl: shop.googleMapsUrl,
        status: "ok",
        pagesVisited: 1,
      });
    }
    return sources;
  });
}

function deriveHome(products: ProductIndex[]) {
  const unique = (items: ProductIndex[]) =>
    items.filter((product, index, all) => all.findIndex((entry) => entry.id === product.id) === index);

  const deals = unique(
    [...products]
      .filter((product) => product.originalPriceValue && product.priceValue && product.originalPriceValue > product.priceValue)
      .sort(
        (a, b) =>
          (b.originalPriceValue! - b.priceValue!) / b.originalPriceValue! -
          (a.originalPriceValue! - a.priceValue!) / a.originalPriceValue!,
      )
      .slice(0, 12),
  );

  const trending = unique(
    [...products]
      .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
      .slice(0, 12),
  );

  const latest = unique(
    [...products]
      .sort((a, b) => new Date(b.crawledAt).getTime() - new Date(a.crawledAt).getTime())
      .slice(0, 12),
  );

  return { deals, trending, latest };
}

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [shopSources, setShopSources] = useState<ShopSource[]>(initialShopSources);
  const [products, setProducts] = useState<ProductIndex[]>(initialProducts);
  const [brands, setBrands] = useState<BrandDealer[]>(initialBrands);
  const [crawlRuns, setCrawlRuns] = useState<CrawlRun[]>(initialCrawlRuns);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DataStoreValue["summary"]>({
    totalStores: initialShops.length,
    indexedStores: new Set(initialProducts.map((product) => product.shopId)).size,
    totalProducts: initialProducts.length,
  });
  const [home, setHome] = useState<DataStoreValue["home"]>(deriveHome(initialProducts));

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getCatalogBootstrap()
      .then(async (payload) => {
        if (!active) return;
        setShops(payload.stores as unknown as Shop[]);
        setShopSources(deriveShopSources(payload.stores as unknown as Shop[]));
        setBrands(payload.brands as unknown as BrandDealer[]);
        setSummary(payload.summary);
        setHome({
          deals: payload.home.deals as unknown as ProductIndex[],
          trending: payload.home.trending as unknown as ProductIndex[],
          latest: payload.home.latest as unknown as ProductIndex[],
        });
        const bootstrapProducts = [
          ...(payload.home.deals as unknown as ProductIndex[]),
          ...(payload.home.trending as unknown as ProductIndex[]),
          ...(payload.home.latest as unknown as ProductIndex[]),
        ].filter((product, index, all) => all.findIndex((entry) => entry.id === product.id) === index);
        setProducts(bootstrapProducts);
        setLoading(false);

        try {
          const totalProducts = Math.max(payload.summary.totalProducts, bootstrapProducts.length);
          if (totalProducts <= bootstrapProducts.length) return;

          const totalPages = Math.max(1, Math.ceil(totalProducts / FULL_CATALOG_PAGE_SIZE));
          const responses = await Promise.all(
            Array.from({ length: totalPages }, (_, pageIndex) =>
              getCatalogProducts(FULL_CATALOG_PAGE_SIZE, pageIndex * FULL_CATALOG_PAGE_SIZE),
            ),
          );
          if (!active) return;

          const mergedProducts = responses.flatMap((catalog) => catalog.items as unknown as ProductIndex[]);
          if (mergedProducts.length === 0) return;

          const seen = new Set<string>();
          setProducts(
            mergedProducts.filter((product) => {
              if (seen.has(product.id)) return false;
              seen.add(product.id);
              return true;
            }),
          );
        } catch {
          // Keep bootstrap products when the full catalog feed is unavailable.
        }
      })
      .catch(() => {
        if (!active) return;
        setError("catalog_bootstrap_unavailable");
        setSummary({
          totalStores: initialShops.length,
          indexedStores: new Set(initialProducts.map((product) => product.shopId)).size,
          totalProducts: initialProducts.length,
        });
        setHome(deriveHome(initialProducts));
        setLoading(false);
        // Keep local fallback data when the backend bootstrap is unavailable.
      });

    return () => {
      active = false;
    };
  }, []);

  const registerProducts = useCallback<DataStoreValue["registerProducts"]>((incoming) => {
    setProducts((prev) => {
      const merged = [...incoming, ...prev];
      const seen = new Set<string>();
      return merged.filter((product) => {
        if (seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
      });
    });
  }, []);

  const addShop = useCallback<DataStoreValue["addShop"]>((input) => {
    const id = `shop_${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    const shop: Shop = {
      id,
      slug: slugify(input.name),
      seedKey: `manual-${id}`,
      discoverySource: "manual",
      verified: input.verified ?? false,
      verificationStatus: input.verified ? "verified" : "unverified",
      createdAt: now,
      updatedAt: now,
      ...input,
    };
    setShops((prev) => [shop, ...prev]);
    if (input.website) {
      setShopSources((prev) => [
        ...prev,
        { id: `src_${id}`, shopId: id, sourceType: "website", sourceUrl: input.website!, status: "pending", pagesVisited: 0 },
      ]);
    }
    return shop;
  }, []);

  const toggleVerify = useCallback((shopId: string) => {
    setShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? { ...s, verified: !s.verified, verificationStatus: !s.verified ? "verified" : "unverified", updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }, []);

  const mergeShops = useCallback((primaryId: string, secondaryId: string) => {
    if (primaryId === secondaryId) return;
    setShops((prev) =>
      prev.map((s) =>
        s.id === secondaryId ? { ...s, archivedAt: new Date().toISOString(), duplicateOf: primaryId } : s,
      ),
    );
    setProducts((prev) =>
      prev.map((p) =>
        p.shopId === secondaryId
          ? { ...p, shopId: primaryId, shopName: prev.find((x) => x.shopId === primaryId)?.shopName ?? p.shopName }
          : p,
      ),
    );
  }, []);

  const runAreaScan = useCallback<DataStoreValue["runAreaScan"]>((area) => {
    const run: CrawlRun = {
      id: `run_${Date.now().toString(36)}`,
      scope: "area",
      area,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      status: "ok",
      productsFound: 0,
      notes: "Simulated discovery scan (Google Maps)",
    };
    setCrawlRuns((prev) => [run, ...prev]);
    return run;
  }, []);

  const recrawlShop = useCallback<DataStoreValue["recrawlShop"]>(
    (shopId) => {
      const shop = shops.find((s) => s.id === shopId);
      const now = new Date().toISOString();
      const ok = !!shop?.website;
      const run: CrawlRun = {
        id: `run_${Date.now().toString(36)}`,
        scope: "shop",
        shopId,
        startedAt: now,
        finishedAt: now,
        status: ok ? "ok" : "failed",
        productsFound: ok ? products.filter((p) => p.shopId === shopId).length : 0,
        notes: ok ? "Simulated recrawl — last indexed timestamp updated" : "بدون موقع — لا يمكن الفهرسة",
      };
      setCrawlRuns((prev) => [run, ...prev]);
      if (ok) {
        setShopSources((prev) =>
          prev.map((src) => (src.shopId === shopId ? { ...src, lastCrawledAt: now, status: "ok" } : src)),
        );
        setProducts((prev) => prev.map((p) => (p.shopId === shopId ? { ...p, crawledAt: now } : p)));
      }
      return run;
    },
    [shops, products],
  );

  const value = useMemo<DataStoreValue>(
    () => ({
      shops,
      shopSources,
      products,
      brands,
      crawlRuns,
      loading,
      error,
      summary,
      home,
      registerProducts,
      addShop,
      toggleVerify,
      mergeShops,
      runAreaScan,
      recrawlShop,
    }),
    [
      shops,
      shopSources,
      products,
      brands,
      crawlRuns,
      loading,
      error,
      summary,
      home,
      registerProducts,
      addShop,
      toggleVerify,
      mergeShops,
      runAreaScan,
      recrawlShop,
    ],
  );

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used inside DataStoreProvider");
  return ctx;
}

export type { Area, Category };
