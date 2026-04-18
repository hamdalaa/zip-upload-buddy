import type { Shop, ShopSource, ProductIndex, BrandDealer, CrawlRun, Category } from "./types";
import { SINAA_REAL_SHOPS } from "./sinaaRealShops";
import { OFFICIAL_DEALER_BRANCHES } from "./officialDealers";

import imgPcParts from "@/assets/cat-pc-parts.jpg";
import imgPhones from "@/assets/cat-phones.jpg";
import imgChargers from "@/assets/cat-chargers.jpg";
import imgNetworking from "@/assets/cat-networking.jpg";
import imgComputing from "@/assets/cat-computing.jpg";
import imgAccessories from "@/assets/cat-accessories.jpg";

// Real product photos
import imgGpu4060 from "@/assets/products/gpu-rtx-4060.jpg";
import imgGpu4070 from "@/assets/products/gpu-rtx-4070.jpg";
import imgRyzen from "@/assets/products/cpu-ryzen-7600.jpg";
import imgRouter from "@/assets/products/router-tplink.jpg";
import imgIphone from "@/assets/products/iphone-15-pro-max.jpg";
import imgGalaxy from "@/assets/products/galaxy-s24-ultra.jpg";
import imgCase from "@/assets/products/iphone-case-clear.jpg";
import imgAnker65 from "@/assets/products/anker-65w.jpg";
import imgUgreen from "@/assets/products/ugreen-100w.jpg";
import imgPowerbank from "@/assets/products/anker-powerbank.jpg";

// Real brand logos
import logoApple from "@/assets/brands/apple.png";
import logoSamsung from "@/assets/brands/samsung.png";
import logoAsus from "@/assets/brands/asus.png";
import logoAnker from "@/assets/brands/anker.png";
import logoMsi from "@/assets/brands/msi.png";
import logoAmd from "@/assets/brands/amd.png";
import logoTplink from "@/assets/brands/tplink.png";
import logoUgreen from "@/assets/brands/ugreen.png";

export const BRAND_LOGOS: Record<string, string> = {
  Apple: logoApple,
  Samsung: logoSamsung,
  ASUS: logoAsus,
  Anker: logoAnker,
  MSI: logoMsi,
  AMD: logoAmd,
  "TP-Link": logoTplink,
  UGREEN: logoUgreen,
};

const PRODUCT_IMAGES: Record<string, string> = {
  p1: imgGpu4060,
  p2: imgGpu4070,
  p3: imgRyzen,
  p4: imgGpu4060,
  p5: imgGpu4070,
  p6: imgRyzen,
  p7: imgRouter,
  p8: imgIphone,
  p9: imgGalaxy,
  p10: imgCase,
  p11: imgAnker65,
  p12: imgUgreen,
  p13: imgPowerbank,
  p14: imgCase,
  p15: imgAnker65,
};

const now = Date.now();
const daysAgo = (d: number) => new Date(now - d * 86400_000).toISOString();

export const CATEGORY_IMAGES: Record<Category, string> = {
  Computing: imgComputing,
  "PC Parts": imgPcParts,
  Networking: imgNetworking,
  Gaming: imgPcParts,
  Cameras: imgComputing,
  Printers: imgAccessories,
  Phones: imgPhones,
  Chargers: imgChargers,
  Accessories: imgAccessories,
  Tablets: imgPhones,
  "Smart Devices": imgNetworking,
};

// === REAL SHOPS from Google Places (شارع الصناعة) ===
// 153 verified-by-source shops, 76 with websites
const sinaaFromPlaces: Shop[] = SINAA_REAL_SHOPS.map((r, i) => ({
  id: r.id,
  slug: r.slug,
  seedKey: `places-${r.id}`,
  name: r.name,
  area: "شارع الصناعة",
  category: r.categories[0],
  categories: r.categories,
  address: r.address,
  lat: r.lat,
  lng: r.lng,
  googleMapsUrl: r.googleMapsUrl,
  website: r.website,
  phone: r.phone,
  imageUrl: r.mainImage,
  discoverySource: "scan",
  verified: r.verified,
  verificationStatus: r.verified ? "verified" : "unverified",
  createdAt: daysAgo(60 - (i % 30)),
  updatedAt: daysAgo(2 + (i % 14)),
  // Spotlight a couple of well-known names
  featured: r.website && i < 6 ? true : undefined,
}));

// Demo shops kept for indexed-product flows (their products ship pre-indexed)
const demoSinaaShops: Shop[] = [
  {
    id: "shop_sinaa_demo_techhouse",
    slug: "tech-house-baghdad",
    seedKey: "sinaa-tech-house",
    name: "تك هاوس (عرض)",
    area: "شارع الصناعة",
    category: "Computing",
    categories: ["Computing", "PC Parts", "Printers", "Accessories"],
    googleMapsUrl: "https://maps.google.com/?q=Tech+House+Sinaa+Baghdad",
    website: "https://techhouse.example.iq",
    phone: "+9647712345005",
    whatsapp: "+9647712345005",
    discoverySource: "seed",
    verified: true,
    verificationStatus: "verified",
    notes: "محل تجريبي يحتوي منتجات مفهرسة كاملة (للعرض)",
    createdAt: daysAgo(110),
    updatedAt: daysAgo(3),
    featured: true,
  },
  {
    id: "shop_sinaa_demo_noor",
    slug: "al-noor-printers",
    seedKey: "sinaa-noor-printers",
    name: "النور للطابعات (عرض)",
    area: "شارع الصناعة",
    category: "Printers",
    categories: ["Printers"],
    googleMapsUrl: "https://maps.google.com/?q=Al+Noor+Printers+Sinaa",
    phone: "+9647712345004",
    discoverySource: "seed",
    verified: true,
    verificationStatus: "verified",
    notes: "متخصص بطابعات HP/Canon والأحبار",
    createdAt: daysAgo(80),
    updatedAt: daysAgo(4),
  },
];

// === Rabee shops (still mock — Google Places import not done yet) ===
const rabeeShops: Shop[] = [
  {
    id: "shop_rabee_01",
    slug: "rabee-mobile-center",
    seedKey: "rabee-mobile-center",
    name: "الربيعي موبايل سنتر",
    area: "شارع الربيعي",
    category: "Phones",
    googleMapsUrl: "https://maps.google.com/?q=Rabee+Mobile+Center+Baghdad",
    website: "https://rabee-mobile.example.iq",
    phone: "+9647712345101",
    whatsapp: "+9647712345101",
    discoverySource: "seed",
    verified: true,
    verificationStatus: "verified",
    createdAt: daysAgo(150),
    updatedAt: daysAgo(1),
    featured: true,
  },
  {
    id: "shop_rabee_02",
    slug: "anker-zone-baghdad",
    seedKey: "rabee-anker-zone",
    name: "Anker Zone بغداد",
    area: "شارع الربيعي",
    category: "Chargers",
    googleMapsUrl: "https://maps.google.com/?q=Anker+Zone+Rabee+Baghdad",
    website: "https://ankerzone.example.iq",
    phone: "+9647712345102",
    whatsapp: "+9647712345102",
    discoverySource: "seed",
    verified: true,
    verificationStatus: "verified",
    createdAt: daysAgo(60),
    updatedAt: daysAgo(3),
    featured: true,
  },
  {
    id: "shop_rabee_03",
    slug: "smart-cases-rabee",
    seedKey: "rabee-smart-cases",
    name: "سمارت كيسز",
    area: "شارع الربيعي",
    category: "Accessories",
    website: "https://smartcases.example.iq",
    phone: "+9647712345103",
    discoverySource: "seed",
    verified: false,
    verificationStatus: "pending",
    notes: "بانتظار التحقق من الموقع",
    createdAt: daysAgo(20),
    updatedAt: daysAgo(7),
  },
];

// === Official authorized dealer branches (Samsung / ASUS / HONOR) ===
const officialDealerShops: Shop[] = OFFICIAL_DEALER_BRANCHES.map((b, i) => ({
  id: b.id,
  slug: b.slug,
  seedKey: `official-${b.brandSlug}-${b.id}`,
  name: b.name,
  area: b.area,
  category: b.category,
  categories: b.categories,
  address: b.address || undefined,
  lat: b.lat ?? undefined,
  lng: b.lng ?? undefined,
  googleMapsUrl: b.googleMapsUrl ?? undefined,
  website: b.website ?? undefined,
  phone: b.phone ?? undefined,
  imageUrl: b.mainImage ?? undefined,
  discoverySource: "seed",
  verified: true,
  verificationStatus: "verified",
  notes: `وكيل رسمي معتمد من ${b.brand}`,
  createdAt: daysAgo(90 - (i % 30)),
  updatedAt: daysAgo(1 + (i % 7)),
  featured: i < 3,
}));

// Combined export — real Sinaa places + demo Sinaa shops + mock Rabee shops
// + official authorized dealer branches.
export const initialShops: Shop[] = [
  ...sinaaFromPlaces,
  ...officialDealerShops,
  ...demoSinaaShops,
  ...rabeeShops,
];

export const initialShopSources: ShopSource[] = [
  { id: "src_th", shopId: "shop_sinaa_demo_techhouse", sourceType: "website", sourceUrl: "https://techhouse.example.iq", status: "ok", lastCrawledAt: daysAgo(3), pagesVisited: 42 },
  { id: "src_noor", shopId: "shop_sinaa_demo_noor", sourceType: "google_maps", sourceUrl: "https://maps.google.com/?q=Al+Noor+Printers+Sinaa", status: "ok", lastCrawledAt: daysAgo(4), pagesVisited: 1 },
  { id: "src_4", shopId: "shop_rabee_01", sourceType: "website", sourceUrl: "https://rabee-mobile.example.iq", status: "ok", lastCrawledAt: daysAgo(1), pagesVisited: 58 },
  { id: "src_5", shopId: "shop_rabee_02", sourceType: "website", sourceUrl: "https://ankerzone.example.iq", status: "ok", lastCrawledAt: daysAgo(3), pagesVisited: 27 },
  { id: "src_6", shopId: "shop_rabee_03", sourceType: "website", sourceUrl: "https://smartcases.example.iq", status: "failed", lastCrawledAt: daysAgo(7), lastFailureReason: "Timeout", pagesVisited: 4 },
];

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface PArgs {
  id: string;
  shopId: string;
  shopName: string;
  area: Shop["area"];
  category: Shop["category"];
  name: string;
  brand: string;
  price?: number;
  originalPrice?: number;
  url?: string;
  daysOld: number;
  rating?: number;
  reviews?: number;
  sku?: string;
  inStock?: boolean;
}

const p = (a: PArgs): ProductIndex => ({
  id: a.id,
  shopId: a.shopId,
  shopName: a.shopName,
  area: a.area,
  category: a.category,
  name: a.name,
  slug: slugify(a.name),
  sku: a.sku,
  brand: a.brand,
  priceValue: a.price,
  priceText: a.price ? `${a.price.toLocaleString("en-US")} IQD` : undefined,
  originalPriceValue: a.originalPrice,
  productUrl: a.url,
  imageUrl: PRODUCT_IMAGES[a.id] ?? CATEGORY_IMAGES[a.category],
  rating: a.rating,
  reviewCount: a.reviews,
  inStock: a.inStock ?? true,
  crawledAt: daysAgo(a.daysOld),
});

// Products list intentionally empty — waiting for real product feed/API from user.
export const initialProducts: ProductIndex[] = [];

export const initialBrands: BrandDealer[] = [
  {
    slug: "apple",
    brandName: "Apple",
    dealerName: "Apple Authorised Resellers (iCenter, iSTYLE, Jibal Zone, AL-NABAA, Master Store, Point)",
    website: "https://locate.apple.com/iq/en/sales",
    contactPhones: ["+9647707282211"],
    cities: ["بغداد", "كربلاء", "بابل"],
    coverage: "شبكة وكلاء Apple المعتمدين بالعراق — 14 فرع رسمي يشمل iCenter وiSTYLE وJibal Zone وAL-NABAA وMaster Store وPoint.",
    verificationStatus: "verified",
    notes: "مصدر القائمة: locate.apple.com/iq — تم التحقق من الفروع عبر Google Places.",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(1),
  },
  {
    slug: "samsung",
    brandName: "Samsung",
    dealerName: "Ayn AlFahad — وكيل سامسونج المعتمد",
    website: "https://www.samsung.com/iq_ar/",
    contactPhones: ["+9647833995599"],
    cities: ["بغداد"],
    coverage: "وكيل رسمي معتمد لسامسونج في العراق — 9 فروع رسمية في بغداد.",
    verificationStatus: "verified",
    notes: "مصدر القائمة: samsung.com/iq_ar — تم التحقق من الفروع عبر Google Places.",
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
  },
  {
    slug: "asus",
    brandName: "ASUS",
    dealerName: "وكلاء ASUS الرسميون في العراق",
    website: "https://www.asus.com/support/service-center-iraq/",
    contactPhones: [],
    cities: ["بغداد"],
    coverage: "6 مراكز خدمة معتمدة من ASUS — لابتوبات، كروت شاشة، لوحات أم.",
    verificationStatus: "verified",
    notes: "مصدر القائمة: asus.com — تم التحقق عبر Google Places.",
    createdAt: daysAgo(35),
    updatedAt: daysAgo(1),
  },
  {
    slug: "honor",
    brandName: "HONOR",
    dealerName: "متاجر HONOR المعتمدة",
    website: "https://www.hihonor.com/iq/",
    contactPhones: [],
    cities: ["بغداد"],
    coverage: "13 متجراً معتمداً من HONOR — هواتف، تابلت، إكسسوارات.",
    verificationStatus: "verified",
    notes: "مصدر القائمة: hihonor.com — تم التحقق عبر Google Places.",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },
  {
    slug: "anker",
    brandName: "Anker",
    dealerName: "Power House (مثال)",
    website: "https://powerhouse.example.iq",
    contactPhones: ["+9647700000004"],
    cities: ["بغداد", "البصرة"],
    coverage: "موزع للشواحن والباور بانك والإكسسوارات.",
    verificationStatus: "verified",
    createdAt: daysAgo(25),
    updatedAt: daysAgo(2),
  },
];

export const initialCrawlRuns: CrawlRun[] = [
  { id: "run_1", shopId: "shop_sinaa_demo_techhouse", scope: "shop", startedAt: daysAgo(2), finishedAt: daysAgo(2), status: "ok", productsFound: 7 },
  { id: "run_2", shopId: "shop_rabee_01", scope: "shop", startedAt: daysAgo(1), finishedAt: daysAgo(1), status: "ok", productsFound: 58 },
  { id: "run_3", scope: "area", area: "شارع الصناعة", startedAt: daysAgo(7), finishedAt: daysAgo(7), status: "ok", productsFound: 0, notes: "Seed scan — discovery only" },
  { id: "run_4", shopId: "shop_rabee_03", scope: "shop", startedAt: daysAgo(7), finishedAt: daysAgo(7), status: "failed", productsFound: 0, notes: "Timeout" },
];
