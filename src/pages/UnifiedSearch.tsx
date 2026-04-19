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
import { CityShopCard } from "@/components/CityShopCard";
import type { CityShop } from "@/lib/cityData";
import type { Shop } from "@/lib/types";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { EmptyState } from "@/components/EmptyState";
import { DummyDataBanner } from "@/components/DummyDataBanner";
import { useDataStore } from "@/lib/dataStore";
import { cn } from "@/lib/utils";
import {
  buildAutocomplete,
  searchShops,
  searchUnified,
  type AutocompleteSuggestion,
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

// Adapter: convert internal Shop → CityShop shape so we can render the
// richer CityShopCard component on the unified search page.
function shopToCityShop(shop: Shop): CityShop {
  return {
    id: shop.id,
    name: shop.name,
    city: shop.area,
    area: shop.area,
    category: shop.category,
    address: shop.address,
    phone: shop.phone,
    whatsapp: shop.whatsapp,
    website: shop.website,
    googleMapsUrl: shop.googleMapsUrl,
    lat: shop.lat,
    lng: shop.lng,
    imageUrl: shop.imageUrl,
    quickSignals: { has_website: !!shop.website },
  };
}

// ---------- Component ----------

export default function UnifiedSearch() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const { shops } = useDataStore();

  // URL-driven state
  const activeQuery = params.get("q") ?? "";
  const activeTab: Tab = (params.get("tab") as Tab) === "shops" ? "shops" : "products";

  // Local UI state
  const [query, setQuery] = useState(activeQuery);
  const [filters, setFilters] = useState<Filters>({});
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
    () => searchShops(shops, { q: activeQuery, sort: shopSort }),
    [shops, activeQuery, shopSort],
  );

  // Autocomplete suggestions (cap at 8 across products+shops)
  const suggestions: AutocompleteSuggestion[] = useMemo(
    () => buildAutocomplete(query, shops, 8),
    [query, shops],
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
    if (filters.inStockOnly) chips.push({ label: "متوفر", clear: () => setFilters((f) => ({ ...f, inStockOnly: undefined })) });
    if (filters.onSaleOnly) chips.push({ label: "تخفيض", clear: () => setFilters((f) => ({ ...f, onSaleOnly: undefined })) });
    if (filters.verifiedOnly) chips.push({ label: "موثّق", clear: () => setFilters((f) => ({ ...f, verifiedOnly: undefined })) });
    if (filters.officialDealerOnly) chips.push({ label: "وكيل رسمي", clear: () => setFilters((f) => ({ ...f, officialDealerOnly: undefined })) });
    return chips;
  }, [filters]);

  const productCount = data?.totalProducts ?? 0;
  const shopCount = shopResult.totalShops;

  // ---------- Render ----------
  return (
    <div className="min-h-screen bg-background">
      <TopNav />
      <DummyDataBanner />

      {/* HERO + SEARCH BAR */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="container mx-auto px-4 py-8 sm:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-3 gap-1 bg-primary-soft text-primary hover:bg-primary-soft">
              <Sparkles className="h-3 w-3" />
              بحث موحّد ذكي
            </Badge>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              ابحث عن <span className="text-primary">منتج</span> أو <span className="text-primary">محل</span> بنقرة وحدة
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              نجمع لك العروض من جميع المتاجر العراقية ودليل المحلات في مكان واحد.
            </p>

            {/* Search bar with autocomplete */}
            <form
              onSubmit={(e) => { e.preventDefault(); commitSearch(query); }}
              className="relative mx-auto mt-6 max-w-2xl"
            >
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft-xl transition-all focus-within:border-primary/50 focus-within:shadow-glow">
                <div className="flex flex-1 items-center gap-2 rounded-xl bg-background/60 px-3">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setAcOpen(true); setAcIndex(-1); }}
                    onFocus={() => setAcOpen(true)}
                    onBlur={() => setTimeout(() => setAcOpen(false), 150)}
                    onKeyDown={onInputKeyDown}
                    placeholder="iPhone 15، PlayStation، اسم محل…  (اضغط / للتركيز)"
                    className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/70"
                    autoComplete="off"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={clearQuery}
                      aria-label="مسح"
                      className="rounded-full p-1 text-muted-foreground hover:bg-surface"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <Button type="submit" className="h-12 rounded-xl bg-gradient-primary px-6 text-primary-foreground shadow-glow">
                  ابحث
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

            {/* Recent + Popular */}
            {!activeQuery && (
              <div className="mt-5 space-y-3">
                {recent.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> أبحاث سابقة:
                    </span>
                    {recent.map((q) => (
                      <span
                        key={q}
                        className="group/chip inline-flex items-center gap-1 rounded-full border border-border bg-card pe-1 ps-3 py-1 text-xs text-foreground transition-colors hover:border-primary/40"
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

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <span className="text-xs text-muted-foreground">شائع:</span>
                  {POPULAR_QUERIES.map((q, i) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => commitSearch(q)}
                      className={cn(
                        "rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary",
                        i >= 3 && "hidden sm:inline-flex",
                      )}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* TABS BAR */}
      <div className="sticky top-[56px] z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between gap-4 px-4">
          <div className="flex">
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

          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span>ترتيب:</span>
            {activeTab === "products" ? (
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-8 w-[180px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRODUCT_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ) : (
              <Select value={shopSort} onValueChange={(v) => setShopSort(v as ShopSortKey)}>
                <SelectTrigger className="h-8 w-[180px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SHOP_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* BODY — always show results; live-filter as the user types */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {activeTab === "products" ? (
          <ProductsView
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
          <ShopsView shopResult={shopResult} sort={shopSort} setSort={setShopSort} />
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
        "relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {count != null && (
        <span className={cn(
          "rounded-full px-2 py-0.5 text-[10px] font-bold",
          active ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground",
        )}>
          {count}
        </span>
      )}
      {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-t-full bg-primary" />}
    </button>
  );
}

function ProductsView({
  data, loading, filters, setFilters, sort, setSort, activeChips, onResetFilters,
}: {
  data: UnifiedSearchResponse | null;
  loading: boolean;
  filters: Filters;
  setFilters: (f: Filters) => void;
  sort: SortKey;
  setSort: (s: SortKey) => void;
  activeChips: { label: string; clear: () => void }[];
  onResetFilters: () => void;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
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
        <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
          {data && (
            <UnifiedSearchFilters
              facets={data.facets}
              value={filters}
              onChange={setFilters}
              onReset={onResetFilters}
            />
          )}
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="h-9 flex-1 rounded-lg text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRODUCT_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {activeChips.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
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

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full rounded-2xl" />
            ))}
          </div>
        ) : data && data.products.length === 0 ? (
          <EmptyState
            title="ما لگينا منتجات"
            description="جرّب كلمات مختلفة أو امسح الفلاتر."
            action={<Button onClick={onResetFilters} variant="outline">مسح الفلاتر</Button>}
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
            {data?.products.map((p) => <UnifiedProductCard key={p.id} product={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ShopsView({
  shopResult, sort, setSort,
}: {
  shopResult: ReturnType<typeof searchShops>;
  sort: ShopSortKey;
  setSort: (s: ShopSortKey) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Mobile sort */}
      <div className="flex items-center justify-end sm:hidden">
        <Select value={sort} onValueChange={(v) => setSort(v as ShopSortKey)}>
          <SelectTrigger className="h-9 w-[180px] rounded-lg text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SHOP_SORT.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {shopResult.shops.length === 0 ? (
        <EmptyState
          title="ما لگينا محلات"
          description="جرّب اسم محل ثاني، أو شوف دليل المحلات الكامل بصفحة المحافظات."
          action={
            <Button asChild variant="outline">
              <a href="/iraq">تصفح المحافظات</a>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {shopResult.shops.map((s) => (
            <CityShopCard key={s.id} shop={shopToCityShop(s)} citySlug="baghdad" />
          ))}
        </div>
      )}
    </div>
  );
}
