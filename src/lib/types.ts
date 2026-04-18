export type Area = "شارع الصناعة" | "شارع الربيعي";

export type Category =
  | "Computing"
  | "PC Parts"
  | "Networking"
  | "Gaming"
  | "Cameras"
  | "Printers"
  | "Phones"
  | "Chargers"
  | "Accessories"
  | "Tablets"
  | "Smart Devices";

export const SINAA_CATEGORIES: Category[] = ["Computing", "PC Parts", "Networking", "Gaming", "Cameras", "Printers"];
export const RABEE_CATEGORIES: Category[] = ["Phones", "Chargers", "Accessories", "Tablets", "Smart Devices"];
export const ALL_AREAS: Area[] = ["شارع الصناعة", "شارع الربيعي"];
export const ALL_CATEGORIES: Category[] = [...SINAA_CATEGORIES, ...RABEE_CATEGORIES];

export interface Shop {
  id: string;
  slug: string;
  seedKey: string;
  name: string;
  area: Area;
  category: Category;            // primary category (legacy)
  categories?: Category[];       // optional multi-category — preferred when present
  address?: string;              // formatted address from Google Places
  lat?: number;
  lng?: number;
  googleMapsUrl?: string;
  website?: string;
  phone?: string;
  whatsapp?: string;
  discoverySource: "manual" | "seed" | "scan";
  verified: boolean;
  verificationStatus: "verified" | "pending" | "unverified";
  notes?: string;
  imageUrl?: string;             // storefront photo (e.g. from Google Places)
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  duplicateOf?: string;
  featured?: boolean;
}

export interface ShopSource {
  id: string;
  shopId: string;
  sourceType: "website" | "google_maps" | "manual";
  sourceUrl: string;
  status: "ok" | "failed" | "pending";
  lastCrawledAt?: string;
  lastFailureReason?: string;
  pagesVisited: number;
}

export interface ProductIndex {
  id: string;
  shopId: string;
  shopName: string;
  area: Area;
  category: Category;
  name: string;
  slug: string;
  sku?: string;
  brand?: string;
  priceValue?: number;       // IQD
  priceText?: string;
  originalPriceValue?: number; // IQD, for showing strikethrough/savings
  productUrl?: string;
  imageUrl?: string;           // product photo
  rating?: number;             // 0..5
  reviewCount?: number;
  inStock?: boolean;
  crawledAt: string;
}

export interface BrandDealer {
  slug: string;
  brandName: string;
  dealerName: string;
  website?: string;
  contactPhones: string[];
  cities: string[];
  coverage: string;
  verificationStatus: "verified" | "pending" | "unverified";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrawlRun {
  id: string;
  shopId?: string;
  scope: "shop" | "area";
  area?: Area;
  startedAt: string;
  finishedAt?: string;
  status: "ok" | "failed" | "running";
  productsFound: number;
  notes?: string;
}
