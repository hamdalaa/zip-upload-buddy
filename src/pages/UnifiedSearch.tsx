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

import { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  AlertTriangle,
  Clock,
  MapPin,
  Package,
  Radar,
  Search,
  SlidersHorizontal,
  Sparkles,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";
import { formatCurrencyPrice } from "@/lib/prices";
import { UnifiedProductCard } from "@/components/UnifiedProductCard";
import { UnifiedSearchFilters } from "@/components/UnifiedSearchFilters";
import { ShopFilters } from "@/components/ShopFilters";
import { ShopResultCard } from "@/components/ShopResultCard";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { EmptyState } from "@/components/EmptyState";
import { SortPillsBar } from "@/components/SortPillsBar";

import { useDataStore } from "@/lib/dataStore";
import { useUnifiedSearchQuery } from "@/lib/catalogQueries";
import { getPublicProductCount, getPublicStoreCount } from "@/lib/catalogCounts";
import { getShopImage, preloadShopImages } from "@/lib/shopImages";
import { cn } from "@/lib/utils";
import { itemListJsonLd, truncateMeta } from "@/lib/seo";
import { ALL_AREAS, ALL_CATEGORIES, type Area, type Category } from "@/lib/types";
import {
  buildAutocomplete,
  searchShops,
  type AutocompleteSuggestion,
  type ShopSearchFilters,
  type ShopSortKey,
  type SortKey,
  type UnifiedSearchFilters as Filters,
  type UnifiedSearchResponse,
} from "@/lib/unifiedSearch";

type Tab = "products" | "shops";

const PRODUCT_SORT: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "الأقرب للبحث" },
  { value: "price_asc", label: "الأرخص ضمن النتائج" },
  { value: "price_desc", label: "الأغلى ضمن النتائج" },
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
const AUTOCOMPLETE_PRODUCT_POOL_LIMIT = 1500;
const INITIAL_VISIBLE_PRODUCT_COUNT = 24;

function isKnownCategory(value: string | null): value is Category {
  return Boolean(value && ALL_CATEGORIES.includes(value as Category));
}

function isKnownArea(value: string | null): value is Area {
  return Boolean(value && ALL_AREAS.includes(value as Area));
}

function filtersFromUrl(params: URLSearchParams): {
  productFilters: Filters;
  shopFilters: ShopSearchFilters;
  hasDirectoryFilter: boolean;
} {
  const category = params.get("category");
  const area = params.get("area");
  const categories = isKnownCategory(category) ? [category] : [];
  const cities = isKnownArea(area) ? [area] : [];
  return {
    productFilters: {
      ...(categories.length ? { categories } : {}),
      ...(cities.length ? { cities } : {}),
    },
    shopFilters: {
      ...(categories.length ? { categories } : {}),
      ...(cities.length ? { cities } : {}),
    },
    hasDirectoryFilter: categories.length > 0 || cities.length > 0,
  };
}

function isUnifiedSearchResponse(value: unknown): value is UnifiedSearchResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<UnifiedSearchResponse>;
  return Array.isArray(candidate.products) && Boolean(candidate.facets);
}

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

export default function UnifiedSearch() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { shops, products, summary } = useDataStore();

  const activeQuery = params.get("q") ?? "";
  const urlFilters = useMemo(() => filtersFromUrl(params), [params]);
  const activeTab: Tab = (params.get("tab") as Tab) === "shops" ? "shops" : "products";

  const [query, setQuery] = useState(activeQuery);
  const [filters, setFilters] = useState<Filters>(urlFilters.productFilters);
  const [shopFilters, setShopFilters] = useState<ShopSearchFilters>(urlFilters.shopFilters);
  const [sort, setSort] = useState<SortKey>("relevance");
  const [shopSort, setShopSort] = useState<ShopSortKey>("relevance");
  const [recent, setRecent] = useState<string[]>(getRecent());
  const [visibleProductCount, setVisibleProductCount] = useState(INITIAL_VISIBLE_PRODUCT_COUNT);

  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setQuery(activeQuery); }, [activeQuery]);

  useEffect(() => {
    setFilters(urlFilters.productFilters);
    setShopFilters(urlFilters.shopFilters);
  }, [urlFilters]);

  const deferredFilters = useDeferredValue(filters);
  const deferredSort = useDeferredValue(sort);
  const searchRequest = useMemo(
    () => ({ ...deferredFilters, q: activeQuery, sort: deferredSort }),
    [activeQuery, deferredFilters, deferredSort],
  );
  const searchQuery = useUnifiedSearchQuery(searchRequest);
  const data = isUnifiedSearchResponse(searchQuery.data) ? searchQuery.data : null;
  const loading = searchQuery.isFetching;
  const error = searchQuery.isError && !data
    ? searchQuery.error instanceof Error
      ? searchQuery.error.message
      : "تعذّر الاتصال بالخادم"
    : null;

  const shopResult = useMemo(
    () => searchShops(shops, { ...shopFilters, q: activeQuery, sort: shopSort }),
    [shops, activeQuery, shopSort, shopFilters],
  );

  const deferredAutocompleteQuery = useDeferredValue(query);
  const normalizedAutocompleteQuery = deferredAutocompleteQuery.trim();
  const shouldShowAutocomplete = normalizedAutocompleteQuery.length >= 2;
  const autocompleteProducts = useMemo(
    () => (products.length > AUTOCOMPLETE_PRODUCT_POOL_LIMIT
      ? products.slice(0, AUTOCOMPLETE_PRODUCT_POOL_LIMIT)
      : products),
    [products],
  );
  const suggestions: AutocompleteSuggestion[] = useMemo(
    () => (shouldShowAutocomplete
      ? buildAutocomplete(normalizedAutocompleteQuery, shops, autocompleteProducts, 8)
      : []),
    [shouldShowAutocomplete, normalizedAutocompleteQuery, shops, autocompleteProducts],
  );

  useEffect(() => {
    setVisibleProductCount(INITIAL_VISIBLE_PRODUCT_COUNT);
  }, [activeQuery, filters, sort]);

  const resetProductFilters = useCallback(() => setFilters({}), []);
  const resetShopFilters = useCallback(() => setShopFilters({}), []);
  const handleLoadMoreProducts = useCallback(() => {
    setVisibleProductCount((count) => count + INITIAL_VISIBLE_PRODUCT_COUNT);
  }, []);

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

  function commitSearch(q: string, tab: Tab = activeTab) {
    const next = q.trim();
    if (next) pushRecent(next);
    setRecent(getRecent());
    const sp = new URLSearchParams();
    if (next) sp.set("q", next);
    const area = params.get("area");
    const category = params.get("category");
    if (isKnownArea(area)) sp.set("area", area);
    if (isKnownCategory(category)) sp.set("category", category);
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

  const activeChips = useMemo(() => {
    const chips: { label: string; clear: () => void }[] = [];
    filters.brands?.forEach((b) => chips.push({ label: b, clear: () => setFilters((f) => ({ ...f, brands: f.brands?.filter((x) => x !== b) })) }));
    filters.categories?.forEach((c) => chips.push({ label: c, clear: () => setFilters((f) => ({ ...f, categories: f.categories?.filter((x) => x !== c) })) }));
    filters.stores?.forEach((s) => chips.push({ label: s, clear: () => setFilters((f) => ({ ...f, stores: f.stores?.filter((x) => x !== s) })) }));
    filters.cities?.forEach((c) => chips.push({ label: c, clear: () => setFilters((f) => ({ ...f, cities: f.cities?.filter((x) => x !== c) })) }));
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
  const visibleProducts = useMemo(
    () => data?.products.slice(0, visibleProductCount) ?? [],
    [data, visibleProductCount],
  );
  const hasMoreProducts = (data?.products.length ?? 0) > visibleProductCount;

  const defaultProductCount = getPublicProductCount(summary.totalProducts, products.length);
  const defaultShopCount = getPublicStoreCount(summary.totalStores, publicShopCount);
  const productCount = data?.totalProducts ?? defaultProductCount;
  const shopCount = activeTab === "products"
    ? (data?.storesCovered ?? defaultShopCount)
    : (hasShopFilters ? shopResult.totalShops : defaultShopCount);
  const formattedProductCount = productCount.toLocaleString("en-US");
  const formattedShopCount = shopCount.toLocaleString("en-US");
  const heroQueries = (activeQuery
    ? POPULAR_QUERIES.filter((item) => item.toLowerCase() !== activeQuery.toLowerCase())
    : POPULAR_QUERIES
  ).slice(0, 5);
  const searchCanonical = activeQuery.trim()
    ? `/search?q=${encodeURIComponent(activeQuery.trim())}`
    : "/search";
  const searchTitle = activeQuery.trim()
    ? `${activeQuery.trim()} في العراق — أسعار ومتاجر`
    : "بحث منتجات الإلكترونيات في العراق";
  const searchDescription = activeQuery.trim()
    ? truncateMeta(`نتائج ${activeQuery.trim()} داخل حاير: قارن الأسعار والعروض والمتاجر الموثوقة في بغداد والعراق، وافتح المتجر أو المنتج مباشرة.`)
    : "ابحث في منتجات ومحلات الإلكترونيات داخل العراق، وقارن الأسعار والفئات والبراندات والمتاجر من صفحة واحدة.";
  const searchStructuredData = data?.products.length
    ? itemListJsonLd(
        data.products.slice(0, 12).map((product) => ({
          name: product.title,
          path: `/product/${encodeURIComponent(product.id)}`,
          image: product.images[0],
          description: [product.brand, product.category, product.lowestPrice ? formatCurrencyPrice(product.lowestPrice, product.priceCurrency) : undefined]
            .filter(Boolean)
            .join(" • "),
        })),
      )
    : undefined;

  return (
    <div className="page-shell min-h-screen text-foreground">
      <Seo
        title={searchTitle}
        description={searchDescription}
        path={searchCanonical}
        structuredData={searchStructuredData}
      />
      <TopNav />

      {/* HERO + SEARCH BAR */}
      <section className="relative isolate overflow-hidden bg-surface text-foreground">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary)/0.055)_1px,transparent_1px),linear-gradient(180deg,hsl(var(--primary)/0.045)_1px,transparent_1px)] bg-[size:76px_76px] opacity-[0.5]" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,hsl(var(--background)/0),hsl(var(--background)))]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-[1728px] min-w-0 items-center gap-8 overflow-hidden px-4 pb-10 pt-16 sm:px-8 sm:pb-12 sm:pt-20 lg:min-h-[740px] lg:grid-cols-[minmax(0,0.96fr)_minmax(360px,0.58fr)] lg:px-16 lg:pb-16 lg:pt-28 xl:gap-16">
          <div className="relative z-10 mx-auto w-full max-w-[930px] min-w-0 text-right max-sm:text-center lg:mx-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-card/82 px-3 py-2 text-[0.78rem] font-semibold text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-border max-sm:mx-auto sm:text-[0.92rem]">
                <Sparkles className="h-3.5 w-3.5" />
                بحث موحّد ذكي
              </div>

              <h1 className="mx-auto mt-5 max-w-[10ch] px-2 font-display text-[clamp(2.15rem,10vw,3.15rem)] font-black leading-[0.94] tracking-normal text-foreground max-sm:max-w-[8.5ch] max-sm:px-6 sm:mt-7 sm:max-w-[11ch] sm:px-0 sm:text-[clamp(2.75rem,6vw,4.25rem)] lg:mx-0 lg:text-[5.45rem]">
                ابحث عن منتج أو محل
                <span className="mt-1 block text-primary">
                  بثواني.
                </span>
              </h1>
              <p className="mx-auto mt-4 max-w-[680px] text-[0.98rem] font-medium leading-[1.85] text-muted-foreground sm:text-[1.08rem] sm:leading-[1.9] lg:mx-0">
                اكتب اسم المنتج أو المحل، وحاير يرتب لك العروض والمتاجر والفلاتر داخل تجربة بحث واحدة.
              </p>

              <form
                onSubmit={(e) => { e.preventDefault(); commitSearch(query); }}
                className="group/search relative z-40 mt-6 w-full overflow-visible rounded-[2rem] bg-surface-2/72 p-1.5 ring-1 ring-border/80 shadow-[0_26px_70px_-44px_hsl(var(--primary)/0.28)] transition-[box-shadow,transform,background-color] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-primary-soft focus-within:shadow-[0_30px_82px_-44px_hsl(var(--primary)/0.5)] sm:rounded-[2.35rem] sm:p-2 lg:mt-8"
              >
                <div className="grid w-full grid-cols-1 gap-2 rounded-[1.55rem] bg-card/94 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:rounded-[1.9rem] sm:p-2.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-stretch">
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.25rem] bg-white/72 px-4 ring-1 ring-border transition-[background-color,ring-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-white focus-within:ring-primary/35 sm:gap-4 sm:px-5 md:rounded-[1.45rem] md:px-6">
                      <Search className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" strokeWidth={1.9} />
                      <input
                        ref={inputRef}
                        value={query}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setQuery(nextValue);
                          setAcOpen(nextValue.trim().length >= 2);
                          setAcIndex(-1);
                        }}
                        onFocus={() => setAcOpen(query.trim().length >= 2)}
                        onBlur={() => setTimeout(() => setAcOpen(false), 150)}
                        onKeyDown={onInputKeyDown}
                        placeholder="اكتب iPhone 15، PlayStation 5، أو اسم محل"
                        className="h-[58px] min-w-0 flex-1 bg-transparent text-[0.98rem] font-semibold tracking-normal text-foreground outline-none placeholder:text-muted-foreground/62 sm:h-[68px] sm:text-[1.12rem] md:text-[1.16rem]"
                        autoComplete="off"
                      />
                      {query && (
                        <button
                          type="button"
                          onClick={clearQuery}
                          aria-label="مسح"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-300 ease-ios hover:bg-surface hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <kbd className="hidden shrink-0 rounded-full bg-primary-soft px-3 py-1.5 font-mono text-[11px] font-bold text-muted-foreground ring-1 ring-border sm:inline-flex">
                        /
                      </kbd>
                    </div>
                    <Button
                      type="submit"
                      className="group/submit h-[62px] shrink-0 gap-3 rounded-[1.28rem] bg-foreground px-6 text-[1.02rem] font-black text-background shadow-[0_18px_38px_-24px_rgba(23,32,23,0.85)] transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-foreground/90 hover:shadow-[0_24px_48px_-26px_rgba(23,32,23,0.95)] active:scale-[0.96] sm:h-[72px] sm:text-[1.12rem] md:w-[168px] md:rounded-[1.45rem]"
                    >
                      <span>ابحث</span>
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-white/10 transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/submit:-translate-x-1 group-hover/submit:bg-white/16">
                        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
                      </span>
                    </Button>
                </div>

                {acOpen && shouldShowAutocomplete && (
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

              <div className="mt-4 flex flex-wrap items-center gap-2 max-sm:justify-center lg:mt-6">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  جرّب:
                </span>
                {heroQueries.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => commitSearch(item)}
                    className="search-chip"
                  >
                    {item}
                  </button>
                ))}
              </div>

              {!activeQuery && recent.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-2 max-sm:justify-center lg:mt-4">
                  <span className="text-xs text-muted-foreground">آخر بحث:</span>
                  {recent.slice(0, 4).map((q) => (
                    <span
                      key={q}
                      className="search-chip group/chip pe-1 ps-3 py-1"
                    >
                      <button type="button" onClick={() => commitSearch(q)} className="hover:text-primary">
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
                    className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    مسح
                  </button>
                </div>
              )}

              <div className="mt-7 hidden gap-3 lg:grid lg:grid-cols-3">
                <SearchHeroMetric icon={Package} value={formattedProductCount} label="منتج قابل للمقارنة" />
                <SearchHeroMetric icon={Store} value={formattedShopCount} label="محل ومتجر مفهرس" />
                <SearchHeroMetric icon={MapPin} value="10" label="محافظات وشوارع تقنية" />
              </div>
          </div>

          <aside className="relative z-10 hidden lg:block">
            <div className="rounded-[1.95rem] bg-surface-2/58 p-0.5 ring-1 ring-border/45 shadow-[0_18px_52px_-46px_rgba(23,32,23,0.32)]">
              <div className="relative overflow-hidden rounded-[1.75rem] bg-card/90 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Live index</p>
                    <h2 className="mt-1 font-display text-3xl font-black leading-none text-foreground">لوحة البحث</h2>
                  </div>
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary">
                    <Radar className="h-5 w-5" strokeWidth={1.8} />
                  </span>
                </div>

                <div className="rounded-[1.15rem] bg-white/70 p-3.5 ring-1 ring-border/70">
                  <div className="flex items-center justify-between gap-4">
                    <span className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground">
                      <Package className="h-4 w-4 text-primary" strokeWidth={1.8} />
                      النتائج الحالية
                    </span>
                    <span className="font-numeric text-4xl font-semibold leading-none text-foreground">{activeTab === "products" ? formattedProductCount : formattedShopCount}</span>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
                    <span className="block h-full w-4/5 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.28)]" />
                  </div>
                </div>

                <div className="mt-3 grid gap-2.5">
                  <button
                    type="button"
                    onClick={() => setTab("products")}
                    className="group flex items-center justify-between gap-4 rounded-[1.05rem] bg-white/70 px-3.5 py-3 text-right ring-1 ring-border/70 transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_36px_-28px_rgba(23,32,23,0.35)]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Package className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.8} />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-foreground">منتجات قابلة للفرز</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">سعر، توفر، تقييم، عروض</span>
                      </span>
                    </span>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setTab("shops")}
                    className="group flex items-center justify-between gap-4 rounded-[1.05rem] bg-white/70 px-3.5 py-3 text-right ring-1 ring-border/70 transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_36px_-28px_rgba(23,32,23,0.35)]"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                        <Store className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.8} />
                      </span>
                      <span>
                        <span className="block text-sm font-bold text-foreground">محلات عراقية</span>
                        <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">عنوان، اتصال، موقع، توثيق</span>
                      </span>
                    </span>
                    <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1" />
                  </button>

                  <div className="flex flex-wrap gap-2 rounded-[1.05rem] bg-white/62 p-2.5 ring-1 ring-border/70">
                    <span className="search-chip min-h-0 bg-primary-soft text-primary">
                      <Sparkles className="h-3.5 w-3.5" />
                      اقتراحات مباشرة
                    </span>
                    <span className="search-chip min-h-0 text-muted-foreground">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      فلاتر سريعة
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
          </div>
      </section>

      {/* TABS BAR */}
      <div className="relative z-30 -mt-7">
        <div className="container mx-auto px-4">
          <div className="search-surface flex flex-col gap-2 p-1.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="search-core flex w-full gap-1 p-1 sm:w-auto">
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

          <div className="hidden items-center gap-2 px-2 text-xs text-muted-foreground lg:flex">
            <span>ترتيب:</span>
            {activeTab === "products" ? (
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-11 w-[190px] rounded-full border-border/70 bg-card/72 text-xs shadow-soft"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={shopSort} onValueChange={(v) => setShopSort(v as ShopSortKey)}>
                <SelectTrigger className="h-11 w-[190px] rounded-full border-border/70 bg-card/72 text-xs shadow-soft"><SelectValue /></SelectTrigger>
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
      <main className="search-safe-bottom container mx-auto px-4 py-7 sm:py-9">
        {activeTab === "products" ? (
          <ProductsView
            data={data}
            loading={loading}
            error={error}
            visibleProducts={visibleProducts}
            hasMoreProducts={hasMoreProducts}
            onLoadMore={handleLoadMoreProducts}
            filters={filters}
            setFilters={setFilters}
            sort={sort}
            setSort={setSort}
            activeChips={activeChips}
            onResetFilters={resetProductFilters}
          />
        ) : (
          <ShopsView
            shopResult={shopResult}
            sort={shopSort}
            setSort={setShopSort}
            filters={shopFilters}
            setFilters={setShopFilters}
            onResetFilters={resetShopFilters}
          />
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

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
        "ios-tap relative inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[1rem] px-3 py-2 text-sm font-semibold transition-[background-color,color,box-shadow,transform] sm:flex-none sm:justify-start sm:px-4",
        active
          ? "bg-foreground text-background shadow-[0_12px_28px_-20px_hsl(var(--foreground)/0.75)]"
          : "text-muted-foreground hover:bg-card/72 hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={cn(
            "font-numeric hidden rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none sm:inline-flex",
            active ? "bg-background/12 text-background" : "bg-surface text-muted-foreground",
          )}
        >
          {count.toLocaleString("en-US")}
        </span>
      )}
    </button>
  );
}

function SearchHeroMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Store;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[1.35rem] bg-card/74 p-1.5 ring-1 ring-border/90">
      <div className="flex items-center gap-3 rounded-[1.05rem] bg-white/72 px-3.5 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.85)]">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.8} />
        </span>
        <span className="min-w-0">
          <span className="font-numeric block truncate text-[1.28rem] font-semibold leading-none text-foreground">{value}</span>
          <span className="mt-1 block text-[11px] font-medium leading-4 text-muted-foreground">{label}</span>
        </span>
      </div>
    </div>
  );
}

const ProductsView = memo(function ProductsView({
  data, loading, error, visibleProducts, hasMoreProducts, onLoadMore, filters, setFilters, sort, setSort, activeChips, onResetFilters,
}: {
  data: UnifiedSearchResponse | null;
  loading: boolean;
  error: string | null;
  visibleProducts: UnifiedSearchResponse["products"];
  hasMoreProducts: boolean;
  onLoadMore: () => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  activeChips: { label: string; clear: () => void }[];
  onResetFilters: () => void;
}) {
  if (error && !loading) {
    return (
      <div className="flex min-h-[60vh] w-full items-center justify-center">
        <div className="search-surface mx-auto w-full max-w-lg p-1.5">
          <div className="search-core flex flex-col items-center gap-5 p-6 text-center sm:p-8">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-destructive/10 text-destructive ring-1 ring-destructive/15">
              <span className="absolute inset-0 animate-ping rounded-[1.25rem] bg-destructive/10" aria-hidden />
              <AlertTriangle className="relative h-6 w-6" strokeWidth={2.2} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-display text-2xl font-black tracking-normal text-foreground">
                اكو مشكلة بالاتصال حالياً
              </h3>
              <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
                ما گدرنا نوصل لخادم المنتجات. جرّب تعيد المحاولة بعد لحظة.
              </p>
            </div>
            <Button
              onClick={() => window.location.reload()}
              className="h-11 rounded-full bg-foreground px-6 font-bold text-background hover:bg-foreground/90"
            >
              إعادة المحاولة
            </Button>
            <code className="block max-w-full truncate text-[10px] text-muted-foreground/60">
              {error}
            </code>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(16rem,18rem)_1fr] lg:gap-6">
      {data && (
        <div className="hidden lg:block">
          <UnifiedSearchFilters
            facets={data.facets}
            value={filters}
            onChange={setFilters}
            onReset={onResetFilters}
          />
        </div>
      )}

      <div className="min-w-0">
        {/* Mobile filter + sort bar */}
        <div className="search-surface mb-4 flex min-w-0 items-center justify-between gap-2 p-1.5 lg:hidden">
          {data && (
            <UnifiedSearchFilters
              facets={data.facets}
              value={filters}
              onChange={setFilters}
              onReset={onResetFilters}
            />
          )}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-11 min-w-0 flex-1 rounded-full border-border/70 bg-card/82 text-xs font-bold shadow-soft"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRODUCT_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {data && (
          <div className="mb-4 grid gap-2 sm:grid-cols-3">
            <ResultMetric icon={Package} label="منتجات مطابقة" value={data.totalProducts} />
            <ResultMetric icon={Store} label="عروض مفهرسة" value={data.totalOffers} />
            <ResultMetric icon={Radar} label="متاجر مغطاة" value={data.storesCovered} />
          </div>
        )}

        {/* Quick sort pills + active filter chips */}
        <div className="mb-4">
          <SortPillsBar
            sort={sort}
            onSortChange={setSort}
            totalResults={data?.totalProducts}
            activeChips={activeChips}
            onClearAll={activeChips.length > 0 ? onResetFilters : undefined}
          />
        </div>

        {loading && visibleProducts.length > 0 && (
          <div className="search-chip mb-4 bg-primary-soft text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            جاري تحديث النتائج...
          </div>
        )}

        {loading && visibleProducts.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductSkeletonCard key={i} />
            ))}
          </div>
        ) : data && data.products.length === 0 ? (
          <EmptyState
            title="ما لگينا منتجات"
            description="جرّب كلمات مختلفة أو امسح الفلاتر."
            action={<Button onClick={onResetFilters} variant="outline" className="rounded-full border-border/70 bg-card/70 hover:bg-primary-soft hover:text-primary">مسح الفلاتر</Button>}
          />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
              {visibleProducts.map((p) => <UnifiedProductCard key={p.id} product={p} />)}
            </div>

            {hasMoreProducts && (
              <div className="mt-7 flex justify-center">
                <Button onClick={onLoadMore} variant="outline" className="h-11 rounded-full border-border/70 bg-card/82 px-6 font-bold hover:bg-primary-soft hover:text-primary">
                  عرض المزيد
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});
ProductsView.displayName = "ProductsView";

function ResultMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Package;
  label: string;
  value: number;
}) {
  return (
    <div className="search-surface p-1">
      <div className="search-core flex min-h-16 items-center justify-between gap-3 px-3.5 py-3">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-4 w-4" strokeWidth={1.9} />
        </span>
        <span className="min-w-0 text-end">
          <span className="font-numeric block truncate text-[1.22rem] font-black leading-none text-foreground">
            {value.toLocaleString("en-US")}
          </span>
          <span className="mt-1 block truncate text-[11px] font-semibold text-muted-foreground">
            {label}
          </span>
        </span>
      </div>
    </div>
  );
}

function ProductSkeletonCard() {
  return (
    <div className="search-card-shell p-1.5 sm:p-2">
      <Skeleton className="aspect-[5/4] w-full rounded-[1.55rem] bg-surface/80" />
      <div className="space-y-2 px-2.5 py-4 sm:px-3.5">
        <Skeleton className="h-3 w-2/5 rounded-full" />
        <Skeleton className="h-4 w-full rounded-full" />
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-12 w-full rounded-[1rem]" />
        <Skeleton className="h-10 w-full rounded-[1rem]" />
      </div>
    </div>
  );
}

const ShopsView = memo(function ShopsView({
  shopResult, sort, setSort, filters, setFilters, onResetFilters,
}: {
  shopResult: ReturnType<typeof searchShops>;
  sort: ShopSortKey;
  setSort: (s: ShopSortKey) => void;
  filters: ShopSearchFilters;
  setFilters: (f: ShopSearchFilters) => void;
  onResetFilters: () => void;
}) {
  const [, setShopImagesVersion] = useState(0);
  const shopsToEnrich = useMemo(
    () => shopResult.shops.filter((shop) => !getShopImage(shop)).slice(0, 48),
    [shopResult.shops],
  );

  useEffect(() => {
    let cancelled = false;
    if (shopsToEnrich.length === 0) return;

    preloadShopImages(shopsToEnrich).then(() => {
      if (!cancelled) {
        setShopImagesVersion((version) => version + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shopsToEnrich]);

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
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(16rem,18rem)_1fr] xl:gap-6">
      {/* Desktop sidebar */}
      <div className="hidden xl:block">
        <ShopFilters
          facets={shopResult.facets}
          value={filters}
          onChange={setFilters}
          onReset={onResetFilters}
        />
      </div>

      <div className="min-w-0 space-y-4">
        {/* Mobile filter + sort bar */}
        <div className="search-surface flex min-w-0 items-center justify-between gap-2 p-1.5 xl:hidden">
          <ShopFilters
            facets={shopResult.facets}
            value={filters}
            onChange={setFilters}
            onReset={onResetFilters}
          />
          <Select value={sort} onValueChange={(v) => setSort(v as ShopSortKey)}>
            <SelectTrigger className="h-11 min-w-0 flex-1 rounded-full border-border/70 bg-card/82 text-xs font-bold shadow-soft"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SHOP_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {activeChips.length > 0 && (
          <div className="search-surface p-2">
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={chip.clear}
                className="search-chip bg-primary-soft text-primary"
              >
                {chip.label}
                <X className="h-3 w-3" />
              </button>
            ))}
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              مسح الكل
            </button>
          </div>
          </div>
        )}

        {shopResult.shops.length === 0 ? (
          <EmptyState
            title="ما لگينا محلات"
            description="جرّب اسم محل ثاني، أو امسح الفلاتر، أو شوف دليل المحلات الكامل."
            action={
              <Button onClick={onResetFilters} variant="outline" className="rounded-full border-border/70 bg-card/70 hover:bg-primary-soft hover:text-primary">مسح الفلاتر</Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 2xl:grid-cols-4">
            {shopResult.shops.map((s, i) => (
              <ShopResultCard key={s.id} shop={s} previewImageUrl={getShopImage(s)} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
ShopsView.displayName = "ShopsView";
