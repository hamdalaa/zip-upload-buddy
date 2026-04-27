import { createContext } from "react";
import type { Area, BrandDealer, CrawlRun, ProductIndex, Shop, ShopSource } from "./types";

export interface DataStoreValue {
  shops: Shop[];
  shopSources: ShopSource[];
  products: ProductIndex[];
  brands: BrandDealer[];
  crawlRuns: CrawlRun[];
  loading: boolean;
  error: string | null;
  summary: {
    totalStores: number;
    indexedStores: number;
    totalProducts: number;
    lastSyncAt?: string;
  };
  home: {
    deals: ProductIndex[];
    trending: ProductIndex[];
    latest: ProductIndex[];
  };
  prefetchProductIndex: () => Promise<void>;
  registerProducts: (products: ProductIndex[]) => void;
  addShop: (
    input: Omit<Shop, "id" | "slug" | "seedKey" | "createdAt" | "updatedAt" | "discoverySource" | "verified" | "verificationStatus"> & { verified?: boolean },
  ) => Shop;
  toggleVerify: (shopId: string) => void;
  mergeShops: (primaryId: string, secondaryId: string) => void;
  runAreaScan: (area: Area) => CrawlRun;
  recrawlShop: (shopId: string) => CrawlRun;
}

export const DataStoreContext = createContext<DataStoreValue | null>(null);
