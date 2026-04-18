// Repository layer — abstracts data source so we can swap from local mock
// data to Lovable Cloud (Supabase) later without touching components.
//
// To migrate to Cloud:
//   1) Enable Lovable Cloud
//   2) Create `shops` and `products` tables matching the Shop / ProductIndex types
//   3) Add a `cloudShopsRepository` implementation that calls supabase.from("shops")
//   4) Switch DATA_SOURCE below to "cloud"
//
// Components & hooks consume `useDataStore()` which already wraps these.

import type { Shop, ProductIndex, BrandDealer } from "./types";
import {
  initialShops,
  initialProducts,
  initialBrands,
} from "./mockData";

export type DataSource = "mock" | "cloud";

// Toggle here when Cloud is enabled and tables are populated
export const DATA_SOURCE: DataSource = "mock";

export interface ShopsRepository {
  listShops: () => Promise<Shop[]>;
  listProducts: () => Promise<ProductIndex[]>;
  listBrands: () => Promise<BrandDealer[]>;
}

export const mockRepository: ShopsRepository = {
  listShops: async () => initialShops,
  listProducts: async () => initialProducts,
  listBrands: async () => initialBrands,
};

// Stub for future Cloud impl — fill in when DB is ready
// export const cloudRepository: ShopsRepository = {
//   listShops: async () => {
//     const { data, error } = await supabase.from("shops").select("*");
//     if (error) throw error;
//     return data as Shop[];
//   },
//   ...
// };

export const repository: ShopsRepository =
  DATA_SOURCE === "mock" ? mockRepository : mockRepository;
