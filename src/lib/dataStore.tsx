import { startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Area, BrandDealer, Category, CrawlRun, ProductIndex, Shop, ShopSource } from "./types";
import { getCatalogProducts } from "./catalogApi";
import { useCatalogBootstrapLiteQuery } from "./catalogQueries";
import { DataStoreContext, type DataStoreValue } from "./dataStoreContext";
import { hasComparableDiscount } from "./prices";
import { shouldAutoPrefetchCatalog } from "./performance";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || `shop-${Date.now()}`;

const FULL_CATALOG_PAGE_SIZE = 250;
const BACKGROUND_PREFETCH_DELAY_MS = 1200;
const BACKGROUND_PREFETCH_COMMIT_EVERY_PAGES = 2;

function dedupeProducts(products: ProductIndex[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

function dedupeShops(shops: Shop[]) {
  const seen = new Set<string>();
  return shops.filter((shop) => {
    if (seen.has(shop.id)) return false;
    seen.add(shop.id);
    return true;
  });
}

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
      .filter((product) => hasComparableDiscount(product.priceValue, product.originalPriceValue))
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
  const bootstrapQuery = useCatalogBootstrapLiteQuery();
  const [manualShops, setManualShops] = useState<Shop[]>([]);
  const [manualShopSources, setManualShopSources] = useState<ShopSource[]>([]);
  const [registeredProducts, setRegisteredProducts] = useState<ProductIndex[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductIndex[]>([]);
  const [crawlRuns, setCrawlRuns] = useState<CrawlRun[]>([]);
  const [prefetchStatus, setPrefetchStatus] = useState<"idle" | "loading" | "ready">("idle");
  const prefetchPromiseRef = useRef<Promise<void> | null>(null);
  const baseShops = useMemo(
    () => dedupeShops([
      ...(bootstrapQuery.data?.featuredShops ?? []),
      ...(bootstrapQuery.data?.topRatedShops ?? []),
    ]),
    [bootstrapQuery.data?.featuredShops, bootstrapQuery.data?.topRatedShops],
  );
  const baseBrands = bootstrapQuery.data?.brands ?? [];
  const baseHome = bootstrapQuery.data?.home ?? { deals: [], trending: [], latest: [] };
  const bootstrapProducts = useMemo(
    () =>
      dedupeProducts([
        ...baseHome.deals,
        ...baseHome.trending,
        ...baseHome.latest,
      ]),
    [baseHome.deals, baseHome.latest, baseHome.trending],
  );
  const shops = useMemo(() => [...manualShops, ...baseShops], [baseShops, manualShops]);
  const brands = baseBrands as BrandDealer[];
  const products = useMemo(
    () => dedupeProducts([...registeredProducts, ...catalogProducts, ...bootstrapProducts]),
    [bootstrapProducts, catalogProducts, registeredProducts],
  );
  const shopSources = useMemo(
    () => [...manualShopSources, ...deriveShopSources(baseShops)],
    [baseShops, manualShopSources],
  );
  const loading = bootstrapQuery.isLoading && !bootstrapQuery.data;
  const error = bootstrapQuery.error ? "catalog_bootstrap_unavailable" : null;
  const [summary, setSummary] = useState<DataStoreValue["summary"]>({
    totalStores: 0,
    indexedStores: 0,
    totalProducts: 0,
  });
  const home = baseHome;

  useEffect(() => {
    if (!bootstrapQuery.data) return;
    setSummary(bootstrapQuery.data.summary);
  }, [bootstrapQuery.data]);

  const prefetchProductIndex = useCallback(async () => {
    if (!bootstrapQuery.data) return;
    if (prefetchStatus === "ready") return;
    if (prefetchPromiseRef.current) return prefetchPromiseRef.current;

    const totalProducts = Math.max(bootstrapQuery.data.summary.totalProducts, bootstrapProducts.length);
    if (totalProducts <= bootstrapProducts.length) {
      setPrefetchStatus("ready");
      return;
    }

    setPrefetchStatus("loading");
    prefetchPromiseRef.current = (async () => {
      try {
        const totalPages = Math.max(1, Math.ceil(totalProducts / FULL_CATALOG_PAGE_SIZE));
        const seen = new Set<string>(bootstrapProducts.map((product) => product.id));
        const mergedProducts = [...bootstrapProducts];

        for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
          const catalog = await getCatalogProducts(FULL_CATALOG_PAGE_SIZE, pageIndex * FULL_CATALOG_PAGE_SIZE);

          let appended = false;
          for (const product of catalog.items as ProductIndex[]) {
            if (seen.has(product.id)) continue;
            seen.add(product.id);
            mergedProducts.push(product);
            appended = true;
          }

          const isCommitPoint =
            appended &&
            ((pageIndex + 1) % BACKGROUND_PREFETCH_COMMIT_EVERY_PAGES === 0 || pageIndex === totalPages - 1);

          if (isCommitPoint) {
            startTransition(() => {
              setCatalogProducts(dedupeProducts([...mergedProducts]));
            });
          }

          if ((pageIndex + 1) % BACKGROUND_PREFETCH_COMMIT_EVERY_PAGES === 0) {
            await new Promise((resolve) => window.setTimeout(resolve, 0));
          }
        }

        setPrefetchStatus("ready");
      } catch {
        setPrefetchStatus("idle");
      } finally {
        prefetchPromiseRef.current = null;
      }
    })();

    return prefetchPromiseRef.current;
  }, [bootstrapProducts, bootstrapQuery.data, prefetchStatus]);

  useEffect(() => {
    if (!bootstrapQuery.data || prefetchStatus !== "idle") return;
    if (!shouldAutoPrefetchCatalog(bootstrapQuery.data.summary.totalProducts)) return;

    const schedule = window.requestIdleCallback
      ? window.requestIdleCallback(() => {
          window.setTimeout(() => {
            void prefetchProductIndex();
          }, BACKGROUND_PREFETCH_DELAY_MS);
        })
      : window.setTimeout(() => {
          void prefetchProductIndex();
        }, BACKGROUND_PREFETCH_DELAY_MS);

    return () => {
      if (typeof schedule === "number") {
        window.clearTimeout(schedule);
      } else {
        window.cancelIdleCallback?.(schedule);
      }
    };
  }, [bootstrapQuery.data, prefetchProductIndex, prefetchStatus]);

  const registerProducts = useCallback<DataStoreValue["registerProducts"]>((incoming) => {
    setRegisteredProducts((prev) => {
      const merged = [...incoming, ...prev];
      return dedupeProducts(merged);
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
    setManualShops((prev) => [shop, ...prev]);
    if (input.website) {
      setManualShopSources((prev) => [
        ...prev,
        { id: `src_${id}`, shopId: id, sourceType: "website", sourceUrl: input.website!, status: "pending", pagesVisited: 0 },
      ]);
    }
    return shop;
  }, []);

  const toggleVerify = useCallback((shopId: string) => {
    setManualShops((prev) =>
      prev.map((s) =>
        s.id === shopId
          ? { ...s, verified: !s.verified, verificationStatus: !s.verified ? "verified" : "unverified", updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }, []);

  const mergeShops = useCallback((primaryId: string, secondaryId: string) => {
    if (primaryId === secondaryId) return;
    setManualShops((prev) =>
      prev.map((s) =>
        s.id === secondaryId ? { ...s, archivedAt: new Date().toISOString(), duplicateOf: primaryId } : s,
      ),
    );
    setRegisteredProducts((prev) =>
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
      setManualShopSources((prev) =>
        prev.map((src) => (src.shopId === shopId ? { ...src, lastCrawledAt: now, status: "ok" } : src)),
      );
      setRegisteredProducts((prev) => prev.map((p) => (p.shopId === shopId ? { ...p, crawledAt: now } : p)));
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
      prefetchProductIndex,
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
      prefetchProductIndex,
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
