import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { ShopCard } from "./ShopCard";
import { ShopCarousel } from "./ShopCarousel";
import { ShopCardSkeletonGrid } from "./ShopCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import { useCityDetailQuery } from "@/lib/catalogQueries";
import { useDataStore } from "@/lib/dataStore";
import { compareShopsByPopularity, getShopReviewCount } from "@/lib/shopRanking";
import type { CityShop } from "@/lib/catalogApi";
import type { Area, Category, Shop } from "@/lib/types";
import { cn } from "@/lib/utils";

const SHOPS_PREVIEW_LIMIT = 15;

const FEATURED_SHOP_KEYWORDS = [
  "AL-NABAA Group",
  "Al-Nabaa",
  "النبع",
  "القيم العالمية",
  "العالمية للحاسبات",
  "الشذر",
  "اللمسه الذكيه",
  "أنس المستقبل",
  "Anas",
  "Qiyam",
];

function featuredRank(name: string): number {
  const lower = name.toLowerCase();
  const index = FEATURED_SHOP_KEYWORDS.findIndex((keyword) => lower.includes(keyword.toLowerCase()));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function areaToPath(area: Area): string {
  if (area === "شارع الصناعة") return "/sinaa";
  if (area === "شارع الربيعي") return "/rubaie";
  return `/search?area=${encodeURIComponent(area)}`;
}

const AREA_ADDRESS_MATCHERS: Record<Area, RegExp[]> = {
  "شارع الصناعة": [
    /شارع\s*الصناعة/i,
    /الصناعة/i,
    /\bsina'?a\b/i,
    /\bal\s*sinaa\b/i,
    /\balsina/i,
    /\bindustry\s*st/i,
  ],
  "شارع الربيعي": [
    /شارع\s*الربيعي/i,
    /الربيعي/i,
    /\brubaie\b/i,
    /\brabee\b/i,
    /\bal\s*rabie\b/i,
  ],
};

const CATEGORY_ALIASES: Record<string, Category> = {
  computing: "Computing",
  computer: "Computing",
  computers: "Computing",
  electronics: "Computing",
  "pc parts": "PC Parts",
  parts: "PC Parts",
  networking: "Networking",
  network: "Networking",
  router: "Networking",
  gaming: "Gaming",
  games: "Gaming",
  cameras: "Cameras",
  camera: "Cameras",
  printers: "Printers",
  printer: "Printers",
  phones: "Phones",
  phone: "Phones",
  mobile: "Phones",
  mobiles: "Phones",
  chargers: "Chargers",
  charger: "Chargers",
  accessories: "Accessories",
  accessory: "Accessories",
  tablets: "Tablets",
  tablet: "Tablets",
  "smart devices": "Smart Devices",
  smart: "Smart Devices",
};

function normalizeCategory(value: string | undefined, area: Area): Category | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (CATEGORY_ALIASES[normalized]) return CATEGORY_ALIASES[normalized];
  if (/phone|mobile|موبايل|هاتف/i.test(normalized)) return "Phones";
  if (/accessor|اكسسوار|إكسسوار/i.test(normalized)) return "Accessories";
  if (/charger|شاحن/i.test(normalized)) return "Chargers";
  if (/tablet|تابلت/i.test(normalized)) return "Tablets";
  if (/camera|كام/i.test(normalized)) return "Cameras";
  if (/game|gaming|العاب|ألعاب/i.test(normalized)) return "Gaming";
  if (/network|router|راوتر|شبك/i.test(normalized)) return "Networking";
  if (/printer|طابع/i.test(normalized)) return "Printers";
  if (/part|قطع/i.test(normalized)) return "PC Parts";
  if (/computer|laptop|حاسب|حاسوب|كمبيوتر|كومبيوتر|electron/i.test(normalized)) return "Computing";
  return area === "شارع الربيعي" ? "Phones" : "Computing";
}

function cityShopMatchesArea(shop: CityShop, area: Area) {
  const haystack = `${shop.area ?? ""} ${shop.address ?? ""} ${shop.name ?? ""}`.toLowerCase();
  return AREA_ADDRESS_MATCHERS[area].some((pattern) => pattern.test(haystack));
}

function cityShopToStreetShop(shop: CityShop, area: Area): Shop {
  const categories = [
    normalizeCategory(shop.suggested_category, area),
    normalizeCategory(shop.category, area),
    normalizeCategory(shop.primaryType, area),
  ].filter((category): category is Category => Boolean(category));
  const uniqueCategories = Array.from(new Set(categories));
  const primaryCategory = uniqueCategories[0] ?? (area === "شارع الربيعي" ? "Phones" : "Computing");
  const updatedAt = shop.lastUpdatedAt ?? "2026-01-01T00:00:00.000Z";

  return {
    id: `city_${shop.id}`,
    slug: shop.id,
    seedKey: shop.id,
    name: shop.name,
    city: shop.city,
    cityAr: "بغداد",
    citySlug: "baghdad",
    area,
    category: primaryCategory,
    categories: uniqueCategories.length > 0 ? uniqueCategories : [primaryCategory],
    address: shop.address,
    lat: typeof shop.lat === "number" ? shop.lat : undefined,
    lng: typeof shop.lng === "number" ? shop.lng : undefined,
    googleMapsUrl: shop.googleMapsUrl,
    website: shop.website,
    phone: shop.phone,
    whatsapp: shop.whatsapp,
    discoverySource: "scan",
    verified: Boolean(shop.website || shop.quickSignals?.has_website),
    verificationStatus: shop.website || shop.quickSignals?.has_website ? "verified" : "unverified",
    imageUrl: shop.imageUrl,
    gallery: shop.gallery,
    createdAt: updatedAt,
    updatedAt,
    rating: typeof shop.rating === "number" ? shop.rating : undefined,
    reviewCount: shop.reviewCount,
    editorialSummary: shop.editorialSummary,
    reviewSummary: shop.reviewSummary,
    reviewsSample: shop.reviewsSample,
    quickSignals: shop.quickSignals,
    openNow: shop.openNow,
    businessStatus: shop.businessStatus,
    workingHours: shop.workingHours,
  };
}

interface Props {
  area: Area;
  title: string;
  subtitle?: string;
  limit?: number | null;
  hideHeaderCta?: boolean;
}

export function StreetShopsSection({
  area,
  title,
  subtitle,
  limit = SHOPS_PREVIEW_LIMIT,
  hideHeaderCta = false,
}: Props) {
  const { shops, products } = useDataStore();
  const [activeCat, setActiveCat] = useState<Category | "all">("all");
  const fakeLoading = useFakeLoading(700);

  const shopCategoriesFromProducts = useMemo(() => {
    const map = new Map<string, Set<Category>>();
    products.forEach((product) => {
      if (product.area !== area) return;
      if (!map.has(product.shopId)) map.set(product.shopId, new Set());
      map.get(product.shopId)!.add(product.category);
    });
    return map;
  }, [products, area]);

  const baseStreetShops = useMemo(
    () => shops.filter((shop) => shop.area === area && !shop.archivedAt),
    [shops, area],
  );

  const cityQuery = useCityDetailQuery(baseStreetShops.length === 0 ? "baghdad" : undefined);
  const cityStreetShops = useMemo(() => {
    if (baseStreetShops.length > 0) return [];
    return (cityQuery.data?.stores ?? [])
      .filter((shop) => cityShopMatchesArea(shop, area))
      .map((shop) => cityShopToStreetShop(shop, area));
  }, [area, baseStreetShops.length, cityQuery.data?.stores]);

  const streetShops = baseStreetShops.length > 0 ? baseStreetShops : cityStreetShops;
  const loading = fakeLoading || (baseStreetShops.length === 0 && cityQuery.isLoading && !cityQuery.data);

  const effectiveCats = useCallback(
    (shop: typeof streetShops[number]): Set<Category> => {
      const fromProducts = shopCategoriesFromProducts.get(shop.id);
      if (fromProducts && fromProducts.size > 0) return fromProducts;
      if (shop.categories && shop.categories.length > 0) return new Set(shop.categories);
      return new Set([shop.category]);
    },
    [shopCategoriesFromProducts],
  );

  const availableCats = useMemo(() => {
    const counts = new Map<Category, number>();
    streetShops.forEach((shop) => {
      effectiveCats(shop).forEach((category) => counts.set(category, (counts.get(category) ?? 0) + 1));
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [streetShops, effectiveCats]);

  const visibleShops: Shop[] = useMemo(() => {
    const base = activeCat === "all" ? streetShops : streetShops.filter((shop) => effectiveCats(shop).has(activeCat));
    return [...base].sort((a, b) => {
      return (
        getShopReviewCount(b) - getShopReviewCount(a) ||
        featuredRank(a.name) - featuredRank(b.name) ||
        compareShopsByPopularity(a, b)
      );
    });
  }, [streetShops, effectiveCats, activeCat]);

  if (!loading && streetShops.length === 0) return null;

  const catLabelAr: Partial<Record<Category, string>> = {
    Computing: "حاسبات كاملة",
    "PC Parts": "قطع كومبيوتر",
    Networking: "شبكات وراوترات",
    Gaming: "ألعاب وأجهزة",
    Cameras: "كاميرات",
    Printers: "طابعات",
    Phones: "هواتف",
    Chargers: "شواحن",
    Accessories: "إكسسوارات",
    Tablets: "تابلت",
    "Smart Devices": "أجهزة ذكية",
  };

  return (
    <section className="overflow-hidden rounded-[2rem] bg-border/40 p-px shadow-[0_18px_50px_-44px_rgba(23,32,23,0.36)]">
      <div className="rounded-[calc(2rem-1px)] bg-card p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] sm:p-6 md:p-7 xl:p-9">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:gap-4 sm:pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0 max-w-3xl text-right">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[11px]">
            {area}
          </div>
          <h2 className="font-display mt-2 text-[24px] font-black leading-[1.05] tracking-normal text-foreground sm:mt-2.5 sm:text-[34px] md:text-[42px]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 max-w-2xl text-[13px] leading-7 text-muted-foreground sm:text-sm sm:leading-7">
              {subtitle}
            </p>
          )}
        </div>

        {!hideHeaderCta && (
          <Link
            to={areaToPath(area)}
            className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-[12px] font-bold text-background transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-foreground/90 sm:w-fit sm:shrink-0 sm:justify-start"
          >
            كل محلات الشارع
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1" />
          </Link>
        )}
      </div>

      {loading ? (
        <div className="mt-5 flex gap-1.5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-8 w-20 shrink-0 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="mt-4 sm:mt-6">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:-mx-0 sm:px-0 xl:flex-wrap">
            <FilterChip active={activeCat === "all"} onClick={() => setActiveCat("all")} label="كل المحلات" count={streetShops.length} />
            {availableCats.map(([category, count]) => (
              <FilterChip
                key={category}
                active={activeCat === category}
                onClick={() => setActiveCat(category)}
                label={catLabelAr[category] ?? category}
                count={count}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 sm:mt-7">
        {loading ? (
          <ShopCardSkeletonGrid count={6} />
        ) : visibleShops.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-primary-soft/60 py-16 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card">
              <MapPin className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-[13px] text-muted-foreground">ماكو محلات بهالفلتر حالياً. جرّب فئة ثانية.</p>
            <button onClick={() => setActiveCat("all")} className="text-[12px] font-bold text-foreground underline-offset-4 hover:underline">
              امسح الفلتر
            </button>
          </div>
        ) : (
          <>
            {(() => {
              const list = limit == null ? visibleShops : visibleShops.slice(0, limit);
              const mobileList = list.slice(0, 3);
              return (
                <>
                  {/* Mobile: stacked cards for stable responsive layout */}
                  <div className="grid grid-cols-1 items-stretch gap-3 sm:hidden">
                    {mobileList.map((shop, index) => (
                      <div
                        key={shop.id}
                        className="flex animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                      >
                        <ShopCard shop={shop} />
                      </div>
                    ))}
                  </div>

                  {/* Tablet: carousel */}
                  <div className="hidden sm:block xl:hidden">
                    <ShopCarousel shops={list} hideAbove="xl" />
                  </div>

                  {/* Desktop: grid */}
                  <div className="hidden xl:grid xl:grid-cols-3 xl:items-stretch xl:gap-5">
                    {list.map((shop, index) => (
                      <div
                        key={shop.id}
                        className="flex animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                      >
                        <ShopCard shop={shop} />
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {limit != null && (
              <div className="mt-8 flex justify-center">
                <Link
                  to={areaToPath(area)}
                  className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-bold text-background transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-foreground/90"
                >
                  عرض كل المحلات ({visibleShops.length.toLocaleString("ar")})
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1" />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </section>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 max-w-full items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-[transform,background-color,border-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] sm:text-[12px]",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-white/72 text-muted-foreground hover:-translate-y-0.5 hover:border-primary/35 hover:bg-white hover:text-foreground",
      )}
    >
      <span className="truncate">{label}</span>
      <span
        className={cn(
          "shrink-0 tabular-nums text-[10px] font-medium sm:text-[10.5px]",
          active ? "text-background/70" : "text-muted-foreground/70",
        )}
      >
        {count.toLocaleString("ar")}
      </span>
    </button>
  );
}
