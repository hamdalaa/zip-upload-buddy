import { useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { Area, Category, CrawlRun, ProductIndex, Shop, ShopSource } from "./types";
import { initialBrands, initialCrawlRuns, initialProducts, initialShopSources, initialShops } from "./mockData";
import { DataStoreContext, type DataStoreValue } from "./dataStoreContext";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "") || `shop-${Date.now()}`;

export function DataStoreProvider({ children }: { children: ReactNode }) {
  const [shops, setShops] = useState<Shop[]>(initialShops);
  const [shopSources, setShopSources] = useState<ShopSource[]>(initialShopSources);
  const [products, setProducts] = useState<ProductIndex[]>(initialProducts);
  const [brands] = useState(initialBrands);
  const [crawlRuns, setCrawlRuns] = useState<CrawlRun[]>(initialCrawlRuns);

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
    () => ({ shops, shopSources, products, brands, crawlRuns, addShop, toggleVerify, mergeShops, runAreaScan, recrawlShop }),
    [shops, shopSources, products, brands, crawlRuns, addShop, toggleVerify, mergeShops, runAreaScan, recrawlShop],
  );

  return <DataStoreContext.Provider value={value}>{children}</DataStoreContext.Provider>;
}

export function useDataStore() {
  const ctx = useContext(DataStoreContext);
  if (!ctx) throw new Error("useDataStore must be used inside DataStoreProvider");
  return ctx;
}

export type { Area, Category };
