import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCard } from "@/components/ProductCard";
import { ShopCard } from "@/components/ShopCard";
import { ComparisonGroup } from "@/components/ComparisonGroup";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useDataStore } from "@/lib/dataStore";
import { groupComparable, searchProducts, SUGGESTED_QUERIES } from "@/lib/search";
import { getRating } from "@/lib/googleRatings";
import { compareShopsByPopularity } from "@/lib/shopRanking";
import { ALL_AREAS, ALL_CATEGORIES, type Area, type Category } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  Filter,
  Grid3x3,
  Home,
  Layers,
  List,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
  X,
} from "lucide-react";

const sortOptions = [
  { id: "relevance", label: "الأنسب" },
  { id: "rating", label: "الأعلى تقييماً" },
  { id: "price", label: "الأرخص أولاً" },
  { id: "freshness", label: "الأحدث" },
] as const;

type Sort = (typeof sortOptions)[number]["id"];

const PRICE_RANGES = [
  { id: "all", label: "كل الأسعار", min: 0, max: Infinity },
  { id: "0-50k", label: "أقل من 50,000", min: 0, max: 50_000 },
  { id: "50-150k", label: "50,000 – 150,000", min: 50_000, max: 150_000 },
  { id: "150-500k", label: "150,000 – 500,000", min: 150_000, max: 500_000 },
  { id: "500k+", label: "أكثر من 500,000", min: 500_000, max: Infinity },
];

const Results = () => {
  const [params, setParams] = useSearchParams();
  const { products, shops } = useDataStore();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withDeals, setWithDeals] = useState(false);
  const [priceRange, setPriceRange] = useState<string>("all");
  const [brandFilters, setBrandFilters] = useState<Set<string>>(new Set());

  const q = params.get("q") ?? "";
  const area = (params.get("area") as Area | null) ?? "all";
  const category = (params.get("category") as Category | null) ?? "all";
  const sort = (params.get("sort") as Sort | null) ?? "relevance";

  const shopsById = useMemo(() => Object.fromEntries(shops.map((shop) => [shop.id, shop])), [shops]);
  const verifiedShopIds = useMemo(() => new Set(shops.filter((shop) => shop.verified).map((shop) => shop.id)), [shops]);

  const baseResults = useMemo(
    () =>
      searchProducts(products, {
        q,
        area,
        category,
        sort,
        ratingByShopId: (shopId) => getRating({ googleMapsUrl: shopsById[shopId]?.googleMapsUrl })?.rating,
      }),
    [products, q, area, category, sort, shopsById],
  );

  const allBrands = useMemo(() => {
    const set = new Set<string>();
    baseResults.forEach((product) => product.brand && set.add(product.brand));
    return Array.from(set).sort();
  }, [baseResults]);

  const range = PRICE_RANGES.find((entry) => entry.id === priceRange)!;

  const results = useMemo(() => {
    return baseResults.filter((product) => {
      if (minRating > 0 && (product.rating ?? 0) < minRating) return false;
      if (verifiedOnly && !verifiedShopIds.has(product.shopId)) return false;
      if (withDeals && !(product.originalPriceValue && product.priceValue && product.originalPriceValue > product.priceValue)) return false;
      if (brandFilters.size > 0 && (!product.brand || !brandFilters.has(product.brand))) return false;
      if (priceRange !== "all") {
        if (product.priceValue === undefined) return false;
        if (product.priceValue < range.min || product.priceValue > range.max) return false;
      }
      return true;
    });
  }, [baseResults, minRating, verifiedOnly, verifiedShopIds, withDeals, brandFilters, priceRange, range]);

  const { groups, loose } = useMemo(() => groupComparable(results), [results]);

  const activeFilterLabels = useMemo(() => {
    const labels: string[] = [];
    if (area !== "all") labels.push(area);
    if (category !== "all") labels.push(category);
    if (priceRange !== "all") labels.push(PRICE_RANGES.find((entry) => entry.id === priceRange)?.label ?? priceRange);
    if (minRating > 0) labels.push(`${minRating}+ نجوم`);
    if (verifiedOnly) labels.push("موثّق فقط");
    if (withDeals) labels.push("عليها تخفيض");
    brandFilters.forEach((brand) => labels.push(brand));
    return labels;
  }, [area, category, priceRange, minRating, verifiedOnly, withDeals, brandFilters]);

  function setSort(next: Sort) {
    const nextParams = new URLSearchParams(params);
    nextParams.set("sort", next);
    setParams(nextParams, { replace: true });
  }

  function setFilter(key: "area" | "category", value: string) {
    const nextParams = new URLSearchParams(params);
    if (value === "all") nextParams.delete(key);
    else nextParams.set(key, value);
    setParams(nextParams, { replace: true });
  }

  function toggleBrand(brand: string) {
    setBrandFilters((prev) => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }

  function clearAll() {
    setParams(q ? new URLSearchParams({ q }) : new URLSearchParams(), { replace: true });
    setMinRating(0);
    setVerifiedOnly(false);
    setWithDeals(false);
    setBrandFilters(new Set());
    setPriceRange("all");
  }

  const hasActiveFilters =
    area !== "all" ||
    category !== "all" ||
    minRating > 0 ||
    verifiedOnly ||
    withDeals ||
    brandFilters.size > 0 ||
    priceRange !== "all";

  return (
    <div className="min-h-screen flex flex-col atlas-shell">
      <TopNav />

      <section className="relative overflow-hidden border-b border-border/70 bg-background/55">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />

        <div className="container relative py-5 md:py-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
            <Link to="/" className="inline-flex items-center gap-1 transition-colors hover:text-primary">
              <Home className="h-3 w-3" />
              الرئيسية
            </Link>
            <ChevronLeft className="h-3 w-3" />
            <span className="text-foreground">نتائج البحث</span>
            {q && (
              <>
                <ChevronLeft className="h-3 w-3" />
                <span>"{q}"</span>
              </>
            )}
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="max-w-3xl text-right">
              <span className="atlas-kicker">
                <Sparkles className="h-3.5 w-3.5" />
                مساحة البحث
              </span>

              <h1 className="font-display mt-4 text-[2.6rem] font-bold leading-none text-foreground sm:text-5xl md:text-6xl">
                {q ? (
                  <>
                    نتائج "{q}"
                  </>
                ) : (
                  <>
                    استكشف السوق
                  </>
                )}
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground md:text-base">
                رتّب النتائج، ضيّق الفلاتر، وقارن بين المحلات من نفس الصفحة بدل التنقل بين قوائم متفرقة.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <SummaryPill label="نتائج مرئية" value={results.length.toLocaleString("ar")} />
                <SummaryPill label="مقارنات" value={groups.length.toLocaleString("ar")} />
                <SummaryPill label="براندات" value={allBrands.length.toLocaleString("ar")} />
              </div>
            </div>

            <div className="atlas-panel p-4 md:p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Search className="h-4 w-4 text-primary" />
                اقتراحات سريعة
              </div>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                ابدأ من استعلام جاهز ثم عدّل الفلاتر من نفس الصفحة.
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {SUGGESTED_QUERIES.slice(0, 6).map((suggestion) => (
                  <Link
                    key={suggestion}
                    to={`/results?q=${encodeURIComponent(suggestion)}`}
                    className="inline-flex max-w-full items-center truncate rounded-full border border-border/80 bg-background px-2.5 py-1 text-[11px] font-medium leading-none text-foreground/85 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                  >
                    {suggestion}
                  </Link>
                ))}
              </div>
              {hasActiveFilters && (
                <button
                  onClick={clearAll}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  مسح جميع الفلاتر
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1">
        <div className="container grid grid-cols-1 gap-6 py-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="hidden lg:block lg:sticky lg:top-[118px] lg:h-fit">
            <FiltersPanel
              area={area}
              category={category}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              brandFilters={brandFilters}
              toggleBrand={toggleBrand}
              allBrands={allBrands}
              minRating={minRating}
              setMinRating={setMinRating}
              verifiedOnly={verifiedOnly}
              setVerifiedOnly={setVerifiedOnly}
              withDeals={withDeals}
              setWithDeals={setWithDeals}
              setFilter={setFilter}
              hasActiveFilters={hasActiveFilters}
              clearAll={clearAll}
            />
          </aside>

          <section className="space-y-5">
            <div className="atlas-panel p-4 md:p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    <span className="font-display text-3xl">{results.length.toLocaleString("ar")}</span>
                    <span className="ms-2 text-muted-foreground">نتيجة بعد التصفية</span>
                  </div>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">
                    {results.length === 0
                      ? "ماكو نتائج حالياً. بدّل الفلاتر أو امسحها حتى ترجع النتائج."
                      : groups.length > 0
                      ? "نتائج المقارنة تظهر أولاً عندما نقدر نجمع نفس المنتج من أكثر من محل."
                      : "رتّب العرض وبدّل طريقة القراءة بين الشبكة والقائمة حسب نوع التصفح."}
                  </p>
                </div>

                <div className="flex flex-col gap-3 md:items-end">
                  <div className="flex items-center gap-3 self-start md:self-auto">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 rounded-full lg:hidden">
                          <Filter className="h-4 w-4" />
                          الفلاتر
                          {hasActiveFilters && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                              {activeFilterLabels.length}
                            </span>
                          )}
                        </Button>
                      </SheetTrigger>
                      <SheetContent
                        side="right"
                        className="flex w-[92vw] max-w-md flex-col overflow-hidden p-0 sm:w-full"
                      >
                        <SheetHeader className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-5 py-4 backdrop-blur">
                          <div className="flex items-center justify-between gap-3">
                            <SheetTitle className="inline-flex items-center gap-2 text-right text-base">
                              <SlidersHorizontal className="h-4 w-4 text-primary" />
                              تصفية النتائج
                              {activeFilterLabels.length > 0 && (
                                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                  {activeFilterLabels.length}
                                </span>
                              )}
                            </SheetTitle>
                            {hasActiveFilters && (
                              <button
                                onClick={clearAll}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-foreground"
                              >
                                <X className="h-3.5 w-3.5" />
                                مسح الكل
                              </button>
                            )}
                          </div>
                        </SheetHeader>
                        <div className="flex-1 overflow-y-auto px-5 py-4">
                          <FiltersPanel
                            area={area}
                            category={category}
                            priceRange={priceRange}
                            setPriceRange={setPriceRange}
                            brandFilters={brandFilters}
                            toggleBrand={toggleBrand}
                            allBrands={allBrands}
                            minRating={minRating}
                            setMinRating={setMinRating}
                            verifiedOnly={verifiedOnly}
                            setVerifiedOnly={setVerifiedOnly}
                            withDeals={withDeals}
                            setWithDeals={setWithDeals}
                            setFilter={setFilter}
                            hasActiveFilters={hasActiveFilters}
                            clearAll={clearAll}
                            embedded
                            compact
                          />
                        </div>
                        <SheetClose asChild>
                          <div className="sticky bottom-0 border-t border-border/60 bg-background/95 px-5 py-3 backdrop-blur">
                            <Button
                              size="lg"
                              className="h-11 w-full rounded-full bg-primary text-primary-foreground shadow-soft-md hover:bg-primary/90"
                            >
                              عرض {results.length.toLocaleString("ar")} نتيجة
                            </Button>
                          </div>
                        </SheetClose>
                      </SheetContent>
                    </Sheet>

                    {results.length === 0 ? (
                      hasActiveFilters && (
                        <Button variant="ghost" size="sm" onClick={clearAll} className="h-9 rounded-full px-4 text-accent hover:text-foreground">
                          مسح الفلاتر
                        </Button>
                      )
                    ) : (
                      <div className="flex items-center rounded-full border border-border/75 bg-background p-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setView("grid")}
                              className={cn(
                                "rounded-full p-2 transition-colors",
                                view === "grid" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted",
                              )}
                              aria-label="شبكة"
                            >
                              <Grid3x3 className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>عرض شبكة</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setView("list")}
                              className={cn(
                                "rounded-full p-2 transition-colors",
                                view === "list" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:bg-muted",
                              )}
                              aria-label="قائمة"
                            >
                              <List className="h-4 w-4" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>عرض قائمة</TooltipContent>
                        </Tooltip>
                      </div>
                    )}
                  </div>

                  {results.length > 0 && (
                    <div className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-1 overflow-x-auto rounded-full border border-border/75 bg-background p-1 md:mx-0 md:w-auto md:justify-end md:overflow-visible">
                      {sortOptions.map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setSort(option.id)}
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                            sort === option.id
                              ? "bg-secondary text-secondary-foreground shadow-soft"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {activeFilterLabels.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeFilterLabels.map((label) => (
                    <span key={label} className="atlas-chip text-foreground/82">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      {label}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {results.length === 0 ? (
              <NoResultsFallback shops={shops} area={area} category={category} clearAll={clearAll} />
            ) : (
              <>
                {groups.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-[11px] font-bold text-success">
                          <Layers className="h-3.5 w-3.5" />
                          مجموعات مقارنة
                        </div>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          نفس المنتج من أكثر من محل، مع قراءة أسرع للفارق في السعر والثقة.
                        </p>
                      </div>
                      <span className="hidden rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground md:inline-flex">
                        {groups.length.toLocaleString("ar")} مجموعة
                      </span>
                    </div>

                    {groups.map((group) => (
                      <ComparisonGroup
                        key={group.key}
                        brand={group.brand}
                        representativeName={group.representativeName}
                        items={group.items}
                        shopsById={shopsById}
                      />
                    ))}
                  </section>
                )}

                {loose.length > 0 && (
                  <section className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="font-display text-2xl font-bold tracking-tight">
                          {groups.length > 0 ? "نتائج إضافية" : "كل النتائج"}
                        </h2>
                        <p className="mt-1 text-sm leading-6 text-muted-foreground">
                          بطاقات قراءة سريعة للمنتجات، مع الانتقال المباشر إلى المحل أو خرائط Google.
                        </p>
                      </div>
                      <span className="hidden rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground md:inline-flex">
                        {loose.length.toLocaleString("ar")} عنصر
                      </span>
                    </div>

                    <div className={view === "grid" ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
                      {loose.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          shopGoogleMapsUrl={shopsById[product.shopId]?.googleMapsUrl}
                          layout={view}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

function SummaryPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/75 bg-card/90 px-3.5 py-2 text-xs shadow-soft">
      <span className="font-display text-lg font-bold text-foreground">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function NoResultsFallback({
  shops,
  area,
  category,
  clearAll,
}: {
  shops: ReturnType<typeof useDataStore>["shops"];
  area: Area | "all";
  category: Category | "all";
  clearAll: () => void;
}) {
  const areaShops = useMemo(
    () =>
      shops.filter(
        (shop) =>
          !shop.archivedAt &&
          (area === "all" || shop.area === area) &&
          (category === "all" ||
            shop.category === category ||
            shop.categories?.includes(category as Category)),
      ).sort(compareShopsByPopularity),
    [shops, area, category],
  );

  if (areaShops.length === 0) {
    return (
      <div className="atlas-panel p-8">
        <EmptyState
          title="ماكو نتيجة دقيقة حالياً"
          description="جرّب كتابة موديل أبسط، أو وسّع البحث بإزالة بعض الفلاتر."
          action={
            <Button onClick={clearAll} variant="outline">
              إعادة تعيين الفلاتر
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="atlas-panel p-5">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-bold text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          بديل ذكي
        </div>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          ما حصّلنا منتجاً مفهرساً مطابقاً، لكن هذه المحلات في{" "}
          <span className="font-semibold text-foreground">{area === "all" ? "الأسواق الأساسية" : area}</span>
          {" "}قريبة من طلبك ويمكن التواصل معها مباشرة.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {areaShops.map((shop) => (
          <ShopCard key={shop.id} shop={shop} />
        ))}
      </div>
    </div>
  );
}

function FilterSection({
  title,
  children,
  compact,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="border-t border-border/60 py-4 first:border-t-0 first:pt-0">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground/80">
        {title}
      </h3>
      <div className={cn(compact ? "flex flex-wrap gap-1.5" : "space-y-1.5")}>
        {children}
      </div>
    </section>
  );
}

function FilterRow({
  active,
  onClick,
  children,
  compact,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
          active
            ? "bg-primary text-primary-foreground shadow-soft"
            : "border border-border/70 bg-background text-foreground/75 hover:border-primary/40 hover:text-foreground",
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      className={cn(
        "block w-full rounded-2xl px-3 py-2 text-right text-sm transition-colors",
        active
          ? "bg-secondary text-secondary-foreground shadow-soft"
          : "bg-background text-foreground/80 hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

type FiltersPanelProps = {
  area: Area | "all";
  category: Category | "all";
  priceRange: string;
  setPriceRange: (value: string) => void;
  brandFilters: Set<string>;
  toggleBrand: (brand: string) => void;
  allBrands: string[];
  minRating: number;
  setMinRating: (value: number) => void;
  verifiedOnly: boolean;
  setVerifiedOnly: (value: boolean) => void;
  withDeals: boolean;
  setWithDeals: (value: boolean) => void;
  setFilter: (key: "area" | "category", value: string) => void;
  hasActiveFilters: boolean;
  clearAll: () => void;
  embedded?: boolean;
  compact?: boolean;
};

function FiltersPanel(props: FiltersPanelProps) {
  const {
    area,
    category,
    priceRange,
    setPriceRange,
    brandFilters,
    toggleBrand,
    allBrands,
    minRating,
    setMinRating,
    verifiedOnly,
    setVerifiedOnly,
    withDeals,
    setWithDeals,
    setFilter,
    hasActiveFilters,
    clearAll,
    embedded,
    compact,
  } = props;

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    embedded ? (
      <div>{children}</div>
    ) : (
      <div className="atlas-panel p-5">{children}</div>
    );

  return (
    <Wrapper>
      {!compact && (
        <div className="mb-4 flex items-center justify-between">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            التصفية
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
              مسح
            </button>
          )}
        </div>
      )}

      <FilterSection title="المنطقة" compact={compact}>
        <FilterRow compact={compact} active={area === "all"} onClick={() => setFilter("area", "all")}>كل المناطق</FilterRow>
        {ALL_AREAS.map((entry) => (
          <FilterRow compact={compact} key={entry} active={area === entry} onClick={() => setFilter("area", entry)}>
            {entry}
          </FilterRow>
        ))}
      </FilterSection>

      <FilterSection title="الفئة" compact={compact}>
        <FilterRow compact={compact} active={category === "all"} onClick={() => setFilter("category", "all")}>كل الفئات</FilterRow>
        {ALL_CATEGORIES.map((entry) => (
          <FilterRow compact={compact} key={entry} active={category === entry} onClick={() => setFilter("category", entry)}>
            {entry}
          </FilterRow>
        ))}
      </FilterSection>

      <FilterSection title="السعر" compact={compact}>
        {PRICE_RANGES.map((entry) => (
          <FilterRow compact={compact} key={entry.id} active={priceRange === entry.id} onClick={() => setPriceRange(entry.id)}>
            {entry.label}
          </FilterRow>
        ))}
      </FilterSection>

      {allBrands.length > 0 && (
        <FilterSection title="البراند" compact={compact}>
          {compact ? (
            allBrands.map((brand) => {
              const active = brandFilters.has(brand);
              return (
                <button
                  key={brand}
                  onClick={() => toggleBrand(brand)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
                    active
                      ? "bg-primary text-primary-foreground shadow-soft"
                      : "border border-border/70 bg-background text-foreground/75 hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {brand}
                </button>
              );
            })
          ) : (
            <div className="grid gap-2">
              {allBrands.map((brand) => (
                <label
                  key={brand}
                  className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 text-sm cursor-pointer transition-colors hover:border-primary/30"
                >
                  <Checkbox checked={brandFilters.has(brand)} onCheckedChange={() => toggleBrand(brand)} />
                  <span>{brand}</span>
                </label>
              ))}
            </div>
          )}
        </FilterSection>
      )}

      <FilterSection title="التقييم" compact={compact}>
        {compact ? (
          [4.5, 4, 3.5, 0].map((rating) => {
            const active = minRating === rating;
            return (
              <button
                key={rating}
                onClick={() => setMinRating(rating)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
                  active
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "border border-border/70 bg-background text-foreground/75 hover:border-primary/40",
                )}
              >
                {rating === 0 ? (
                  "الكل"
                ) : (
                  <>
                    <Star className={cn("h-3 w-3", active ? "fill-current" : "fill-warning text-warning")} />
                    {rating}+
                  </>
                )}
              </button>
            );
          })
        ) : (
          <div className="space-y-1.5">
            {[4.5, 4, 3.5, 0].map((rating) => (
              <button
                key={rating}
                onClick={() => setMinRating(rating)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors",
                  minRating === rating ? "bg-secondary text-secondary-foreground shadow-soft" : "bg-background text-foreground/80 hover:bg-muted",
                )}
              >
                {rating === 0 ? (
                  <span>الكل</span>
                ) : (
                  <>
                    <Star className={cn("h-3.5 w-3.5", minRating === rating ? "fill-current" : "fill-warning text-warning")} />
                    <span>{rating}+ نجوم</span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </FilterSection>

      <div className={cn("pt-4 border-t border-border/60", compact ? "grid grid-cols-2 gap-2" : "space-y-2")}>
        <label className={cn(
          "flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 cursor-pointer transition-colors hover:border-primary/30",
          compact ? "text-xs font-semibold" : "text-sm",
        )}>
          <Checkbox checked={verifiedOnly} onCheckedChange={(value) => setVerifiedOnly(!!value)} />
          موثّقة فقط
        </label>
        <label className={cn(
          "flex items-center gap-2 rounded-2xl border border-border/70 bg-background px-3 py-2 cursor-pointer transition-colors hover:border-primary/30",
          compact ? "text-xs font-semibold" : "text-sm",
        )}>
          <Checkbox checked={withDeals} onCheckedChange={(value) => setWithDeals(!!value)} />
          تخفيضات فقط
        </label>
      </div>
    </Wrapper>
  );
}

export default Results;
