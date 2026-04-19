import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Sparkles, Globe2, Clock, ArrowLeft, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { UnifiedProductCard } from "@/components/UnifiedProductCard";
import { UnifiedSearchFilters } from "@/components/UnifiedSearchFilters";
import { EmptyState } from "@/components/EmptyState";
import {
  searchUnified,
  type SortKey,
  type UnifiedSearchFilters as Filters,
  type UnifiedSearchResponse,
} from "@/lib/unifiedSearch";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "relevance", label: "الأكثر صلة" },
  { value: "price_asc", label: "السعر: الأقل أولاً" },
  { value: "price_desc", label: "السعر: الأعلى أولاً" },
  { value: "rating_desc", label: "الأعلى تقييماً" },
  { value: "offers_desc", label: "الأكثر عروضاً" },
  { value: "freshness_desc", label: "الأحدث تحديثاً" },
];

const RECENT_KEY = "hayer:recent-unified-searches";

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function pushRecent(q: string) {
  if (!q.trim()) return;
  const cur = getRecent().filter((x) => x !== q);
  const next = [q, ...cur].slice(0, 8);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

export default function UnifiedSearch() {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [filters, setFilters] = useState<Filters>({});
  const [sort, setSort] = useState<SortKey>("relevance");
  const [data, setData] = useState<UnifiedSearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>(getRecent());

  const activeQuery = params.get("q") ?? "";

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    searchUnified({ ...filters, q: activeQuery, sort }).then((res) => {
      if (!cancelled) {
        setData(res);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [activeQuery, filters, sort]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    pushRecent(query.trim());
    setRecent(getRecent());
    setParams(query.trim() ? { q: query.trim() } : {});
  }

  function reset() {
    setFilters({});
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{activeQuery ? `${activeQuery} — بحث موحّد` : "البحث الموحّد"} | حاير</title>
        <meta name="description" content="ابحث عن أي منتج إلكتروني مرة واحدة، نجيبلك أفضل الأسعار من كل المحلات الموثّقة في العراق." />
      </Helmet>

      <TopNav />

      {/* Search hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 via-background to-background">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="container mx-auto px-4 py-8 sm:py-12">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-3 gap-1 bg-primary-soft text-primary hover:bg-primary-soft">
              <Sparkles className="h-3 w-3" />
              بحث موحّد ذكي
            </Badge>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              ابحث مرة، شوف أسعار <span className="text-primary">كل المحلات</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              نجمع لك العروض من جميع المتاجر الإلكترونية العراقية ونقارن الأسعار في ثوانٍ.
            </p>

            <form onSubmit={submit} className="mx-auto mt-6 flex max-w-2xl items-center gap-2 rounded-2xl border border-border bg-card p-1.5 shadow-soft-xl focus-within:border-primary/50 focus-within:shadow-glow">
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-background/60 px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="iPhone 15 Pro، PlayStation 5، MacBook…"
                  className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground/70"
                  autoFocus
                />
                {query && (
                  <button type="button" onClick={() => setQuery("")} className="rounded-full p-1 text-muted-foreground hover:bg-surface">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button type="submit" className="h-12 rounded-xl px-6 bg-gradient-primary text-primary-foreground shadow-glow">
                ابحث
                <ArrowLeft className="ms-2 h-4 w-4" />
              </Button>
            </form>

            {/* Recent + suggestions */}
            {!activeQuery && (
              <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                {recent.length > 0 && (
                  <>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" /> أبحاث سابقة:
                    </span>
                    {recent.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => { setQuery(q); setParams({ q }); }}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        {q}
                      </button>
                    ))}
                  </>
                )}
                {recent.length === 0 && (
                  <>
                    <span className="text-xs text-muted-foreground">جرّب:</span>
                    {["iPhone 15", "PlayStation 5", "MacBook Pro", "Galaxy S24"].map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => { setQuery(q); setParams({ q }); }}
                        className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        {q}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      {data && activeQuery && (
        <div className="border-b border-border bg-card/50">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs sm:text-sm">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <strong className="text-foreground">{data.totalProducts}</strong> منتج
              </span>
              <span className="flex items-center gap-1.5">
                <Globe2 className="h-3.5 w-3.5 text-accent-cyan" />
                <strong className="text-foreground">{data.totalOffers}</strong> عرض من <strong className="text-foreground">{data.storesCovered}</strong> محل
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {data.durationMs}ms
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">ترتيب:</span>
              <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                <SelectTrigger className="h-9 w-[180px] rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Body */}
      <main className="container mx-auto px-4 py-6 sm:py-8">
        {!activeQuery ? (
          <EmptyState
            title="ابدأ بحثك الآن"
            description="اكتب اسم منتج أو موديل، وراح نجيبك أفضل الأسعار من كل المتاجر."
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            {data && (
              <UnifiedSearchFilters
                facets={data.facets}
                value={filters}
                onChange={setFilters}
                onReset={reset}
              />
            )}

            <div className="min-w-0">
              {/* Mobile filter bar */}
              <div className="mb-4 flex items-center justify-between gap-2 lg:hidden">
                {data && (
                  <UnifiedSearchFilters
                    facets={data.facets}
                    value={filters}
                    onChange={setFilters}
                    onReset={reset}
                  />
                )}
                <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                  <SelectTrigger className="h-9 flex-1 rounded-lg text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Active chips */}
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
                    onClick={reset}
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
                  title="ما لگينا نتائج"
                  description={`جرّب كلمات مختلفة أو امسح الفلاتر. بحثت عن: "${activeQuery}"`}
                  cta={<Button onClick={reset} variant="outline">مسح الفلاتر</Button>}
                />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                  {data?.products.map((p) => (
                    <UnifiedProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
