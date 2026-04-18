import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { ShopCard } from "./ShopCard";
import { ShopCarousel } from "./ShopCarousel";
import { ShopCardSkeletonGrid } from "./ShopCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import { useDataStore } from "@/lib/dataStore";
import { compareShopsByPopularity, getShopReviewCount } from "@/lib/shopRanking";
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
  return `/results?area=${encodeURIComponent(area)}`;
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
  const loading = useFakeLoading(700);

  const shopCategoriesFromProducts = useMemo(() => {
    const map = new Map<string, Set<Category>>();
    products.forEach((product) => {
      if (product.area !== area) return;
      if (!map.has(product.shopId)) map.set(product.shopId, new Set());
      map.get(product.shopId)!.add(product.category);
    });
    return map;
  }, [products, area]);

  const streetShops = useMemo(() => shops.filter((shop) => shop.area === area && !shop.archivedAt), [shops, area]);

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
    <section className="atlas-panel p-5 md:p-7">
      <div className="pointer-events-none absolute -left-10 top-8 h-24 w-24 rounded-full bg-primary/12 blur-3xl" />

      <div className="atlas-separator flex flex-wrap items-end justify-between gap-4 pb-5">
        <div className="max-w-3xl text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{area}</div>
          <h2 className="font-display mt-3 text-3xl font-bold leading-none text-foreground sm:text-4xl md:text-5xl">{title}</h2>
          {subtitle && <p className="mt-3 text-sm leading-7 text-muted-foreground">{subtitle}</p>}
        </div>

        {!hideHeaderCta && (
          <Link to={areaToPath(area)} className="link-underline text-sm font-semibold text-accent">
            كل محلات الشارع
          </Link>
        )}
      </div>

      {loading ? (
        <div className="mt-5 flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-full" />
          ))}
        </div>
      ) : (
        <div className="mt-5 -mx-5 overflow-x-auto px-5 md:-mx-7 md:px-7 md:overflow-visible">
          <div className="flex gap-2 whitespace-nowrap pb-1 md:flex-wrap md:whitespace-normal md:pb-0">
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

      <div className="mt-6">
        {loading ? (
          <ShopCardSkeletonGrid count={6} />
        ) : visibleShops.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-background/74 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">ماكو محلات بهالفلتر حالياً. جرّب فئة ثانية.</p>
            <button onClick={() => setActiveCat("all")} className="text-xs font-semibold text-accent">
              امسح الفلتر
            </button>
          </div>
        ) : (
          <>
            {(() => {
              const list = limit == null ? visibleShops : visibleShops.slice(0, limit);
              return (
                <>
                  {/* Mobile + tablet: premium snap carousel */}
                  <ShopCarousel shops={list} hideAbove="lg" />

                  {/* Desktop: grid */}
                  <div className="hidden lg:grid lg:grid-cols-3 lg:gap-4">
                    {list.map((shop, index) => (
                      <div
                        key={shop.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                      >
                        <ShopCard shop={shop} />
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}

            {limit != null && visibleShops.length > limit && (
              <div className="mt-7 flex justify-center">
                <Link
                  to={areaToPath(area)}
                  className="group inline-flex items-center gap-2 rounded-full border border-secondary/16 bg-secondary px-5 py-3 text-sm font-bold text-secondary-foreground transition-transform duration-300 hover:-translate-y-0.5"
                >
                  عرض الكل ({visibleShops.length})
                  <ArrowLeft className="icon-nudge-x h-4 w-4" />
                </Link>
              </div>
            )}
          </>
        )}
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
        "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
        active
          ? "border-secondary bg-secondary text-secondary-foreground"
          : "border-border/80 bg-background text-foreground/82 hover:border-secondary/30 hover:text-foreground",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          active ? "bg-white/14 text-secondary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {count.toLocaleString("ar")}
      </span>
    </button>
  );
}
