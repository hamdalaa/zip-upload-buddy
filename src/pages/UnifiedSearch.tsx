/**
 * Unified Search Page (/search)
 * -----------------------------
 * Tabs: products (cross-store offers) | shops (local directory).
 * Features:
 *   - Live autocomplete (products + shops) while typing
 *   - Keyboard nav: ↑/↓/Enter/Esc, "/" to focus from anywhere on page
 *   - Recent searches with per-item remove + clear all
 *   - Popular queries fallback
 *   - Result counts on each tab
 *   - Shareable URL state: ?q=...&tab=products|shops&sort=...
 *
 * Backend hand-off:
 *   - Products: searchUnified() — replace mock with POST /api/search
 *   - Shops:    searchShops()   — replace local filter with GET /api/shops/search
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Clock,
  Globe2,
  Package,
  Search,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { UnifiedProductCard } from "@/components/UnifiedProductCard";
import { UnifiedSearchFilters } from "@/components/UnifiedSearchFilters";
import { ShopFilters } from "@/components/ShopFilters";
import { ShopResultCard } from "@/components/ShopResultCard";
import type { Shop } from "@/lib/types";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { EmptyState } from "@/components/EmptyState";

import { useDataStore } from "@/lib/dataStore";
import { getPublicProductCount, getPublicStoreCount } from "@/lib/catalogCounts";
import { cn } from "@/lib/utils";
import {
  buildAutocomplete,
  formatIQD,
  searchShops,
  searchUnified,
  type AutocompleteSuggestion,
  type ShopSearchFilters,
  type ShopSortKey,
  type SortKey,
  type UnifiedSearchFilters as Filters,
  type UnifiedSearchResponse,
} from "@/lib/unifiedSearch";

// ---------- Constants ----------

type Tab = "products" | "shops";

const PRODUCT_SORT: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "الأكثر صلة" },
  { value: "price_asc", label: "السعر: الأقل أولاً" },
  { value: "price_desc", label: "السعر: الأعلى أولاً" },
  { value: "rating_desc", label: "الأعلى تقييماً" },
  { value: "offers_desc", label: "الأكثر عروضاً" },
  { value: "freshness_desc", label: "الأحدث تحديثاً" },
];

const SHOP_SORT: { value: ShopSortKey; label: string }[] = [
  { value: "relevance", label: "الأكثر صلة" },
  { value: "rating_desc", label: "الأعلى تقييماً" },
  { value: "verified_first", label: "الموثّق أولاً" },
  { value: "name_asc", label: "الاسم (أ-ي)" },
];

const POPULAR_QUERIES = [
  "iPhone 15", "PlayStation 5", "MacBook Pro", "Galaxy S24",
  "AirPods", "Anker", "Samsung TV", "ASUS",
];

const RECENT_KEY = "hayer:recent-unified-searches";

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function saveRecent(list: string[]) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
}
function pushRecent(q: string) {
  if (!q.trim()) return;
  const cur = getRecent().filter((x) => x !== q);
  saveRecent([q, ...cur]);
}

function formatArabicCount(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString("ar-IQ");
}

function formatDurationLabel(value: number | null | undefined) {
  if (value == null) return "—";
  if (value < 1000) return `${Math.max(1, Math.round(value)).toLocaleString("ar-IQ")} ms`;
  return `${(Math.round(value / 100) / 10).toLocaleString("ar-IQ")} ث`;
}

function SearchMetricCard({
  icon,
  label,
  value,
  note,
  accent = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[22px] border px-3 py-3 shadow-soft transition-transform duration-200",
        accent
          ? "border-primary/20 bg-primary/10 text-primary shadow-glow"
          : "border-border/70 bg-background/75 text-foreground",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-2xl",
            accent ? "bg-primary text-primary-foreground" : "bg-surface text-primary",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 text-right">
          <div className="text-[11px] font-semibold text-muted-foreground">{label}</div>
          <div className={cn("mt-1 font-numeric text-lg font-semibold leading-none", accent && "text-primary")}>
            {value}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[11px] text-muted-foreground">{note}</div>
    </div>
  );
}

// ---------- Component ----------

export default function UnifiedSearch() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { shops, products, summary } = useDataStore();

  // URL-driven state
  const activeQuery = params.get("q") ?? "";
  const activeTab: Tab = (params.get("tab") as Tab) === "shops" ? "shops" : "products";

  // Local UI state
  const [query, setQuery] = useState(activeQuery);
  const [filters, setFilters] = useState<Filters>({});
  const [shopFilters, setShopFilters] = useState<ShopSearchFilters>({});
  const [sort, setSort] = useState<SortKey>("relevance");
  const [shopSort, setShopSort] = useState<ShopSortKey>("relevance");
  const [data, setData] = useState<UnifiedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(getRecent());

  // Autocomplete state
  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync local query when URL changes externally (e.g. recent-search click)
  useEffect(() => { setQuery(activeQuery); }, [activeQuery]);

  // Document title
  useEffect(() => {
    document.title = activeQuery
      ? `${activeQuery} — بحث | حاير`
      : "البحث الموحّد | حاير";
  }, [activeQuery]);

  // Fetch products whenever query/filters/sort change
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchUnified({ ...filters, q: activeQuery, sort }).then((res) => {
      if (!cancelled) { setData(res); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [activeQuery, filters, sort]);

  // Local shop search — synchronous, very cheap
  const shopResult = useMemo(
    () => searchShops(shops, { ...shopFilters, q: activeQuery, sort: shopSort }),
    [shops, activeQuery, shopSort, shopFilters],
  );

  // Autocomplete suggestions (cap at 8 across products+shops)
  const suggestions: AutocompleteSuggestion[] = useMemo(
    () => buildAutocomplete(query, shops, products, 8),
    [query, shops, products],
  );

  // Global "/" shortcut to focus search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Helpers
  function commitSearch(q: string, tab: Tab = activeTab) {
    const next = q.trim();
    if (next) pushRecent(next);
    setRecent(getRecent());
    const sp = new URLSearchParams();
    if (next) sp.set("q", next);
    if (tab === "shops") sp.set("tab", "shops");
    setParams(sp);
    setAcOpen(false);
    setAcIndex(-1);
    inputRef.current?.blur();
  }

  function setTab(tab: Tab) {
    const sp = new URLSearchParams(params);
    if (tab === "shops") sp.set("tab", "shops"); else sp.delete("tab");
    setParams(sp);
  }

  function clearQuery() {
    setQuery("");
    setParams((sp) => {
      const next = new URLSearchParams(sp);
      next.delete("q");
      return next;
    });
    inputRef.current?.focus();
  }

  function removeRecent(q: string) {
    const next = getRecent().filter((x) => x !== q);
    saveRecent(next);
    setRecent(next);
  }
  function clearAllRecent() { saveRecent([]); setRecent([]); }

  function handleAcSelect(s: AutocompleteSuggestion) {
    setAcOpen(false);
    nav(s.href);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (acOpen) { setAcOpen(false); return; }
      if (query) { clearQuery(); return; }
    }
    if (!acOpen || !suggestions.length) {
      if (e.key === "Enter") { e.preventDefault(); commitSearch(query); }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAcIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAcIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (acIndex >= 0 && suggestions[acIndex]) handleAcSelect(suggestions[acIndex]);
      else commitSearch(query);
    }
  }

  // Active-filter chips (products tab only)
  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    filters.brands?.forEach((b) => chips.push({ label: b, clear: () => setFilters((f) => ({ ...f, brands: f.brands?.filter((x) => x !== b) })) }));
    filters.categories?.forEach((c) => chips.push({ label: c, clear: () => setFilters((f) => ({ ...f, categories: f.categories?.filter((x) => x !== c) })) }));
    filters.stores?.forEach((s) => chips.push({ label: s, clear: () => setFilters((f) => ({ ...f, stores: f.stores?.filter((x) => x !== s) })) }));
    filters.cities?.forEach((c) => chips.push({ label: c, clear: () => setFilters((f) => ({ ...f, cities: f.cities?.filter((x) => x !== c) })) }));
    if (filters.priceMin != null || filters.priceMax != null) {
      const label =
        filters.priceMin != null && filters.priceMax != null
          ? `السعر ${formatIQD(filters.priceMin)} - ${formatIQD(filters.priceMax)}`
          : filters.priceMin != null
            ? `السعر من ${formatIQD(filters.priceMin)}`
            : `السعر إلى ${formatIQD(filters.priceMax ?? 0)}`;
      chips.push({
        label,
        clear: () => setFilters((f) => ({ ...f, priceMin: undefined, priceMax: undefined })),
      });
    }
    if (filters.inStockOnly) chips.push({ label: "متوفر", clear: () => setFilters((f) => ({ ...f, inStockOnly: undefined })) });
    if (filters.onSaleOnly) chips.push({ label: "تخفيض", clear: () => setFilters((f) => ({ ...f, onSaleOnly: undefined })) });
    if (filters.verifiedOnly) chips.push({ label: "موثّق", clear: () => setFilters((f) => ({ ...f, verifiedOnly: undefined })) });
    if (filters.officialDealerOnly) chips.push({ label: "وكيل رسمي", clear: () => setFilters((f) => ({ ...f, officialDealerOnly: undefined })) });
    return chips;
  }, [filters]);

  const hasProductFilters =
    Boolean(activeQuery.trim()) ||
    Boolean(filters.brands?.length) ||
    Boolean(filters.categories?.length) ||
    Boolean(filters.stores?.length) ||
    Boolean(filters.cities?.length) ||
    filters.priceMin != null ||
    filters.priceMax != null ||
    Boolean(filters.inStockOnly) ||
    Boolean(filters.onSaleOnly) ||
    Boolean(filters.verifiedOnly) ||
    Boolean(filters.officialDealerOnly);

  const hasShopFilters =
    Boolean(activeQuery.trim()) ||
    Boolean(shopFilters.cities?.length) ||
    Boolean(shopFilters.categories?.length) ||
    Boolean(shopFilters.verifiedOnly) ||
    Boolean(shopFilters.ratingMin) ||
    Boolean(shopFilters.hasWebsite) ||
    Boolean(shopFilters.hasPhone);
  const publicShopCount = shops.filter((shop) => !shop.archivedAt).length;

  const productCount = hasProductFilters
    ? (data?.totalProducts ?? 0)
    : getPublicProductCount(summary.totalProducts, products.length);
  const shopCount = hasShopFilters
    ? shopResult.totalShops
    : getPublicStoreCount(summary.totalStores, publicShopCount);
  const publicProductCount = getPublicProductCount(summary.totalProducts, products.length);
  const marketHeadline = activeQuery.trim()
    ? `لقطة السوق لعبارة “${activeQuery}”`
    : "شوف السوق كله قبل ما تختار";
  const marketSummary = activeQuery.trim()
    ? loading
      ? "نرتب النتائج ونقارن الأسعار بين المحلات الآن."
      : `لقينا ${formatArabicCount(data?.totalOffers ?? 0)} عرض من ${formatArabicCount(data?.storesCovered ?? 0)} محل حتى تشوف الأرخص والأوضح بسرعة.`
    : "اكتب اسم المنتج أو البراند، واحصل على أقل سعر، حالة التوفر، وعدد المحلات في صفحة وحدة.";
  const marketMetrics = activeQuery.trim()
    ? [
        {
          icon: <Package className="h-4 w-4" />,
          label: "نتائج مطابقة",
          value: formatArabicCount(data?.totalProducts ?? 0),
          note: "منتج بعد الترتيب الحالي",
          accent: true,
        },
        {
          icon: <Store className="h-4 w-4" />,
          label: "محلات مغطاة",
          value: formatArabicCount(data?.storesCovered ?? 0),
          note: "مقارنة مباشرة بين المحلات",
        },
        {
          icon: <Globe2 className="h-4 w-4" />,
          label: "حجم العروض",
          value: formatArabicCount(data?.totalOffers ?? 0),
          note: "إجمالي العروض المفحوصة",
        },
        {
          icon: <Clock className="h-4 w-4" />,
          label: "زمن القراءة",
          value: formatDurationLabel(data?.durationMs ?? 0),
          note: "سرعة استجابة البحث",
        },
      ]
    : [
        {
          icon: <Package className="h-4 w-4" />,
          label: "منتج مفهرس",
          value: formatArabicCount(publicProductCount),
          note: "داخل الفهرس العام",
          accent: true,
        },
        {
          icon: <Store className="h-4 w-4" />,
          label: "محل ظاهر",
          value: formatArabicCount(getPublicStoreCount(summary.totalStores, publicShopCount)),
          note: "متاجر عراقية قابلة للمقارنة",
        },
        {
          icon: <ShieldCheck className="h-4 w-4" />,
          label: "محلات مفهرسة",
          value: formatArabicCount(summary.indexedStores),
          note: "عندها بيانات منتجات فعلية",
        },
        {
          icon: <Clock className="h-4 w-4" />,
          label: "اختصار البحث",
          value: "/",
          note: "للتركيز السريع على الحقل",
        },
      ];

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-background">
      <TopNav />

      {/* HERO + SEARCH BAR */}
      <section className="relative overflow-hidden border-b border-border/70 bg-background">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.16),transparent_34%),radial-gradient(circle_at_bottom_left,hsl(var(--primary)/0.08),transparent_36%)]" />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(250,251,252,0.96))]" />
        <div className="container mx-auto px-4 py-8 sm:py-10 lg:py-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-end">
            <div className="max-w-4xl">
              <Badge className="gap-1 border border-primary/15 bg-primary-soft/90 px-3 py-1 text-primary hover:bg-primary-soft/90">
                <Sparkles className="h-3 w-3" />
                صفحة مقارنة المنتجات
              </Badge>
              <h1 className="mt-4 max-w-3xl font-display text-3xl leading-[0.96] text-foreground sm:text-5xl">
                شوف <span className="text-primary">السعر الحقيقي</span> قبل ما تروح على السوق.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                نرتب لك عروض المنتجات العراقية في شاشة وحده حتى تقارن السعر، التوفر، وعدد المحلات بدون لف طويل بين الصفحات.
              </p>

              <form
                onSubmit={(e) => { e.preventDefault(); commitSearch(query); }}
                className="relative mt-6 max-w-3xl"
              >
                <div className="flex flex-col gap-2 rounded-[30px] border border-border/70 bg-card/90 p-2 shadow-soft-2xl backdrop-blur-xl sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[22px] bg-background/75 px-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Search className="h-4 w-4" />
                    </div>
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setAcOpen(true); setAcIndex(-1); }}
                      onFocus={() => setAcOpen(true)}
                      onBlur={() => setTimeout(() => setAcOpen(false), 150)}
                      onKeyDown={onInputKeyDown}
                      placeholder="iPhone 15، Galaxy S24، RTX 4060، اسم محل…"
                      className="h-14 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/75"
                      autoComplete="off"
                    />
                    <div className="hidden shrink-0 rounded-full border border-border/70 bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground sm:inline-flex">
                      /
                    </div>
                    {query && (
                      <button
                        type="button"
                        onClick={clearQuery}
                        aria-label="مسح"
                        className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <Button type="submit" className="h-14 rounded-[22px] bg-gradient-primary px-7 text-primary-foreground shadow-glow">
                    قارن الآن
                    <ArrowLeft className="ms-2 h-4 w-4" />
                  </Button>
                </div>

                {acOpen && (
                  <SearchAutocomplete
                    query={query}
                    suggestions={suggestions}
                    highlightedIndex={acIndex}
                    onHover={setAcIndex}
                    onSelect={handleAcSelect}
                    onSubmitQuery={() => commitSearch(query)}
                  />
                )}
              </form>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/75 px-3 py-1.5 text-xs text-foreground">
                  <Package className="h-3.5 w-3.5 text-primary" />
                  قارن أقل سعر بين المحلات
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/75 px-3 py-1.5 text-xs text-foreground">
                  <Store className="h-3.5 w-3.5 text-primary" />
                  شوف عدد المحلات المتوفرة قبل التواصل
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card/75 px-3 py-1.5 text-xs text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  اختصار سريع: اضغط /
                </span>
              </div>

              {!activeQuery && (
                <div className="mt-6 rounded-[28px] border border-border/70 bg-card/75 p-4 shadow-soft-lg backdrop-blur-sm">
                  {recent.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        أبحاثك الأخيرة
                      </span>
                      {recent.map((q) => (
                        <span
                          key={q}
                          className="group/chip inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/80 pe-1 ps-3 py-1 text-xs text-foreground transition-colors hover:border-primary/35"
                        >
                          <button
                            type="button"
                            onClick={() => commitSearch(q)}
                            className="hover:text-primary"
                          >
                            {q}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeRecent(q)}
                            aria-label={`حذف ${q}`}
                            className="grid h-4 w-4 place-items-center rounded-full text-muted-foreground opacity-0 transition-opacity hover:bg-surface group-hover/chip:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                      <button
                        type="button"
                        onClick={clearAllRecent}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                        مسح الكل
                      </button>
                    </div>
                  )}

                  <div className={cn("flex flex-wrap items-center gap-2", recent.length > 0 && "mt-4 pt-4 border-t border-border/60")}>
                    <span className="text-xs font-medium text-muted-foreground">عمليات بحث جاهزة:</span>
                    {POPULAR_QUERIES.map((q, i) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => commitSearch(q)}
                        className={cn(
                          "rounded-full border border-border/70 bg-background/80 px-3 py-1.5 text-xs text-foreground transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/35 hover:text-primary",
                          i >= 4 && "hidden md:inline-flex",
                        )}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <aside className="relative overflow-hidden rounded-[30px] border border-border/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(246,249,249,0.9))] p-5 shadow-soft-2xl backdrop-blur-xl">
              <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-primary/12 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold tracking-[0.16em] text-primary">لوحة السوق</div>
                    <h2 className="mt-2 text-xl font-semibold text-foreground">{marketHeadline}</h2>
                  </div>
                  <span className="rounded-full border border-primary/15 bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-primary">
                    مباشر
                  </span>
                </div>
                <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">
                  {marketSummary}
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {marketMetrics.map((metric) => (
                    <SearchMetricCard
                      key={metric.label}
                      icon={metric.icon}
                      label={metric.label}
                      value={metric.value}
                      note={metric.note}
                      accent={metric.accent}
                    />
                  ))}
                </div>

                {activeChips.length > 0 && (
                  <div className="mt-5 rounded-[22px] border border-border/70 bg-background/70 p-3">
                    <div className="text-[11px] font-semibold text-muted-foreground">الفلاتر النشطة</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {activeChips.slice(0, 4).map((chip) => (
                        <span
                          key={chip.label}
                          className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary"
                        >
                          {chip.label}
                        </span>
                      ))}
                      {activeChips.length > 4 && (
                        <span className="rounded-full border border-border/70 bg-card px-3 py-1 text-[11px] text-muted-foreground">
                          +{formatArabicCount(activeChips.length - 4)}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* TABS BAR */}
      <div className="sticky top-[56px] z-30 border-b border-border/70 bg-background/88 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              <TabButton
                active={activeTab === "products"}
                onClick={() => setTab("products")}
                icon={<Package className="h-4 w-4" />}
                label="منتجات"
                count={productCount}
              />
              <TabButton
                active={activeTab === "shops"}
                onClick={() => setTab("shops")}
                icon={<Store className="h-4 w-4" />}
                label="محلات"
                count={shopCount}
              />
            </div>

            <div className="hidden items-center gap-2 rounded-full border border-border/70 bg-card/80 px-2 py-1 text-xs text-muted-foreground shadow-soft md:flex">
              <span className="px-2">ترتيب النتائج</span>
              {activeTab === "products" ? (
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-9 w-[210px] rounded-full border-0 bg-background/90 text-xs shadow-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRODUCT_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={shopSort} onValueChange={(v) => setShopSort(v as ShopSortKey)}>
                  <SelectTrigger className="h-9 w-[210px] rounded-full border-0 bg-background/90 text-xs shadow-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHOP_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* BODY — always show results; live-filter as the user types */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {activeTab === "products" ? (
          <ProductsView
            query={activeQuery}
            data={data}
            loading={loading}
            filters={filters}
            setFilters={setFilters}
            sort={sort}
            setSort={setSort}
            activeChips={activeChips}
            onResetFilters={() => setFilters({})}
          />
        ) : (
          <ShopsView
            shopResult={shopResult}
            sort={shopSort}
            setSort={setShopSort}
            filters={shopFilters}
            setFilters={setShopFilters}
            onResetFilters={() => setShopFilters({})}
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

/* ---------------- Subcomponents ---------------- */

function TabButton({
  active, onClick, icon, label, count,
}: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-[18px] border px-4 py-2.5 text-sm font-semibold transition-all duration-200",
        active
          ? "border-primary/20 bg-card text-foreground shadow-soft-md"
          : "border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-card/70 hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {count != null && (
        <span className={cn(
          "font-numeric rounded-full px-2 py-0.5 text-[10px] font-bold",
          active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground",
        )}>
          {count}
        </span>
      )}
      {active && <span className="absolute inset-x-4 -bottom-1 h-0.5 rounded-t-full bg-primary" />}
    </button>
  );
}

function ProductsView({
  query, data, loading, filters, setFilters, sort, setSort, activeChips, onResetFilters,
}: {
  query: string;
  data: UnifiedSearchResponse | null;
  loading: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  activeChips: { label: string; clear: () => void }[];
  onResetFilters: () => void;
}) {
  const totalResults = data?.totalProducts ?? 0;
  const hasQuery = Boolean(query.trim());
  const summaryCopy = loading
    ? "نرتب النتائج ونحسب الفروقات بين الأسعار الآن."
    : data
      ? hasQuery
        ? `لقينا ${formatArabicCount(data.totalOffers)} عرض لعبارة “${query}” من ${formatArabicCount(data.storesCovered)} محل.`
        : `هذه الصفحة تعرض ${formatArabicCount(data.totalOffers)} عرض مرتبة حتى تلتقط الأرخص والأوضح بسرعة.`
      : "ابدأ بكتابة اسم منتج لعرض السوق المقارن.";

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
      {data && (
        <div className="hidden xl:block">
          <UnifiedSearchFilters
            facets={data.facets}
            value={filters}
            onChange={setFilters}
            onReset={onResetFilters}
          />
        </div>
      )}

      <div className="min-w-0 space-y-4">
        <section className="relative overflow-hidden rounded-[28px] border border-border/70 bg-card/80 p-4 shadow-soft-xl backdrop-blur-sm sm:p-5">
          <div className="pointer-events-none absolute -left-8 top-0 h-28 w-28 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-[11px] font-semibold tracking-[0.16em] text-primary">لوحة النتائج</div>
              <h2 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
                {hasQuery ? `نتائج ${query}` : "كل عروض المنتجات"}
              </h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                {summaryCopy}
              </p>
            </div>

            {!loading && data && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <SearchMetricCard
                  icon={<Package className="h-4 w-4" />}
                  label="منتج"
                  value={formatArabicCount(totalResults)}
                  note="بعد ترتيب النتائج"
                  accent
                />
                <SearchMetricCard
                  icon={<Store className="h-4 w-4" />}
                  label="محل"
                  value={formatArabicCount(data.storesCovered)}
                  note="دخل في المقارنة"
                />
                <SearchMetricCard
                  icon={<Globe2 className="h-4 w-4" />}
                  label="عرض"
                  value={formatArabicCount(data.totalOffers)}
                  note="إجمالي العروض"
                />
                <SearchMetricCard
                  icon={<Clock className="h-4 w-4" />}
                  label="سرعة"
                  value={formatDurationLabel(data.durationMs)}
                  note="استجابة البحث"
                />
              </div>
            )}
          </div>

          {(activeChips.length > 0 || (!loading && data)) && (
            <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4 text-xs text-muted-foreground">
              {!loading && data && (
                <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1.5">
                  الترتيب الحالي يقدّم {PRODUCT_SORT.find((option) => option.value === sort)?.label ?? "الأكثر صلة"}
                </span>
              )}
              {activeChips.length > 0 && (
                <span className="rounded-full border border-primary/15 bg-primary/10 px-3 py-1.5 text-primary">
                  {formatArabicCount(activeChips.length)} فلتر نشط
                </span>
              )}
            </div>
          )}
        </section>

        {/* Mobile filter + sort bar */}
        <div className="flex items-center justify-between gap-2 xl:hidden">
          {data && (
            <UnifiedSearchFilters
              facets={data.facets}
              value={filters}
              onChange={setFilters}
              onReset={onResetFilters}
              triggerLabel="تضييق النتائج"
            />
          )}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-11 flex-1 rounded-full border-border/70 bg-card text-xs shadow-soft"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRODUCT_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs text-primary transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/15"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              مسح الكل
            </button>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                key={i}
                className={cn(
                  "w-full rounded-[28px]",
                  i === 0
                    ? "col-span-2 aspect-[16/11] md:col-span-4 xl:col-span-3"
                    : "col-span-1 aspect-[3/4] md:col-span-2 xl:col-span-2",
                )}
              />
            ))}
          </div>
        ) : data && data.products.length === 0 ? (
          <EmptyState
            title="ما لگينا منتجات"
            description="جرّب كلمات مختلفة أو امسح الفلاتر."
            action={<Button onClick={onResetFilters} variant="outline">مسح الفلاتر</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            {data?.products.map((p, index) => (
              <div
                key={p.id}
                className={cn(
                  index === 0
                    ? "col-span-2 md:col-span-4 xl:col-span-3"
                    : "col-span-1 md:col-span-2 xl:col-span-2",
                )}
              >
                <UnifiedProductCard product={p} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopsView({
  shopResult, sort, setSort, filters, setFilters, onResetFilters,
}: {
  shopResult: ReturnType<typeof searchShops>;
  sort: ShopSortKey;
  setSort: (s: ShopSortKey) => void;
  filters: ShopSearchFilters;
  setFilters: (f: ShopSearchFilters) => void;
  onResetFilters: () => void;
}) {
  const activeChips: { label: string; clear: () => void }[] = [];
  filters.categories?.forEach((c) =>
    activeChips.push({
      label: c,
      clear: () =>
        setFilters({ ...filters, categories: filters.categories?.filter((x) => x !== c) }),
    }),
  );
  filters.cities?.forEach((c) =>
    activeChips.push({
      label: c,
      clear: () =>
        setFilters({ ...filters, cities: filters.cities?.filter((x) => x !== c) }),
    }),
  );
  if (filters.verifiedOnly)
    activeChips.push({ label: "موثّق", clear: () => setFilters({ ...filters, verifiedOnly: undefined }) });
  if (filters.hasPhone)
    activeChips.push({ label: "فيه رقم", clear: () => setFilters({ ...filters, hasPhone: undefined }) });
  if (filters.hasWebsite)
    activeChips.push({ label: "عنده موقع", clear: () => setFilters({ ...filters, hasWebsite: undefined }) });

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <ShopFilters
          facets={shopResult.facets}
          value={filters}
          onChange={setFilters}
          onReset={onResetFilters}
        />
      </div>

      <div className="min-w-0 space-y-4">
        {/* Mobile filter + sort bar */}
        <div className="flex items-center justify-between gap-2 lg:hidden">
          <ShopFilters
            facets={shopResult.facets}
            value={filters}
            onChange={setFilters}
            onReset={onResetFilters}
          />
          <Select value={sort} onValueChange={(v) => setSort(v as ShopSortKey)}>
            <SelectTrigger className="h-9 flex-1 rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHOP_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={chip.clear}
                className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-3 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              مسح الكل
            </button>
          </div>
        )}

        {shopResult.shops.length === 0 ? (
          <EmptyState
            title="ما لگينا محلات"
            description="جرّب اسم محل ثاني، أو امسح الفلاتر، أو شوف دليل المحلات الكامل."
            action={
              <Button onClick={onResetFilters} variant="outline">مسح الفلاتر</Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shopResult.shops.map((s) => (
              <ShopResultCard key={s.id} shop={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
