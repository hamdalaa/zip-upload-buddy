import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Home, MapPin, Search } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CityShopCard } from "@/components/CityShopCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { compareCityShopsByPopularity } from "@/lib/shopRanking";
import { cn } from "@/lib/utils";
import { getCityIndexEntry, loadCity, type CityFile } from "@/lib/cityData";

const PAGE_SIZE = 24;

export default function CityPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const nav = useNavigate();
  const meta = getCityIndexEntry(slug);

  const [data, setData] = useState<CityFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setVisibleCount(PAGE_SIZE);
    setActiveCat("all");
    setQuery("");

    loadCity(slug).then((nextData) => {
      if (alive) {
        setData(nextData);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
    };
  }, [slug]);

  const categories = useMemo(() => {
    if (!data) return [] as Array<[string, number]>;
    const counts = new Map<string, number>();
    data.stores.forEach((store) => {
      const category = store.category?.trim();
      if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const normalizedQuery = query.trim().toLowerCase();
    return data.stores
      .filter((store) => {
        if (activeCat !== "all" && store.category !== activeCat) return false;
        if (normalizedQuery) {
          const haystack = `${store.name} ${store.address ?? ""}`.toLowerCase();
          if (!haystack.includes(normalizedQuery)) return false;
        }
        return true;
      })
      .sort(compareCityShopsByPopularity);
  }, [data, activeCat, query]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCat, query]);

  if (!meta) {
    return (
      <div className="min-h-screen flex flex-col bg-surface">
        <TopNav />
        <main className="flex-1 container py-12 text-center">
          <h1 className="text-xl font-bold mb-2">المدينة غير موجودة</h1>
          <p className="text-sm text-muted-foreground mb-4">تأكد من الرابط أو ارجع للقائمة.</p>
          <Link to="/iraq" className="text-sm font-semibold text-primary hover:underline">
            كل محلات العراق
          </Link>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const visible = filtered.slice(0, visibleCount);

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_14%,hsl(var(--surface))_100%)]">
      <TopNav />

      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-background via-surface to-background">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />

        <div className="container relative py-5 md:py-8">
          <div className="flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
            <Link to="/" className="inline-flex items-center gap-1 transition-colors hover:text-primary">
              <Home className="h-3 w-3" />
              الرئيسية
            </Link>
            <ChevronLeft className="h-3 w-3" />
            <Link to="/iraq" className="transition-colors hover:text-primary">كل محلات العراق</Link>
            <ChevronLeft className="h-3 w-3" />
            <span className="text-foreground">{meta.cityAr}</span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end">
            <div className="max-w-3xl text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                <MapPin className="h-3.5 w-3.5" />
                صفحة المدينة
              </div>
              <h1 className="font-display mt-4 text-3xl font-bold tracking-tight md:text-5xl">
                محلات <span className="text-gradient">{meta.cityAr}</span>
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">
                ابحث داخل المدينة، صفِّ حسب الفئة، وخذ قراءة أسرع للمحلات والعناوين وروابط التواصل.
              </p>
            </div>

            <div className="group/panel relative overflow-hidden rounded-[1.75rem] border border-border/60 bg-gradient-to-br from-card/95 via-card/85 to-card/70 p-5 shadow-soft-lg backdrop-blur-md transition-all hover:border-primary/30 hover:shadow-soft-xl">
              <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl transition-opacity group-hover/panel:opacity-80" />
              <div className="pointer-events-none absolute -bottom-20 -left-10 h-36 w-36 rounded-full bg-accent/10 blur-3xl" />

              <div className="relative">
                <Metric
                  label="كل المحلات"
                  value={(data?.stores.length ?? meta.count).toLocaleString("ar")}
                  tone="primary"
                />
              </div>

              <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-border/50 pt-4">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {meta.cityAr} • العراق
                </span>
                <button
                  onClick={() => nav("/iraq")}
                  className="group/btn inline-flex items-center gap-1 rounded-full border border-border/60 bg-background/60 px-3 py-1.5 text-[11px] font-bold text-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-95"
                >
                  <ChevronLeft className="h-3 w-3 transition-transform group-hover/btn:-translate-x-0.5" />
                  كل المحافظات
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 container py-6 md:py-8">
        <section className="rounded-[1.75rem] border border-border/70 bg-card/85 p-5 shadow-soft-lg backdrop-blur-sm md:p-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
            <div className="text-right">
              <h2 className="font-display text-2xl font-bold tracking-tight">استكشف السوق داخل المدينة</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                جرّب اسم محل، عنوان، أو ابدأ من الفئة الأقرب حتى تضيق القائمة بسرعة.
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={`ابحث بمحلات ${meta.cityAr}…`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="ps-9 h-11 rounded-full bg-background"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-5 flex gap-1.5 overflow-hidden">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-20 shrink-0 rounded-full" />
              ))}
            </div>
          ) : categories.length > 0 ? (
            <div className="mt-5 -mx-5 overflow-x-auto px-5 md:-mx-6 md:px-6 md:overflow-visible">
              <div className="flex gap-2 whitespace-nowrap pb-1 md:flex-wrap md:whitespace-normal md:pb-0">
                <FilterChip
                  active={activeCat === "all"}
                  onClick={() => setActiveCat("all")}
                  label="كل الفئات"
                  count={data?.stores.length ?? 0}
                />
                {categories.map(([category, count]) => (
                  <FilterChip
                    key={category}
                    active={activeCat === category}
                    onClick={() => setActiveCat(category)}
                    label={category}
                    count={count}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[196px] w-full rounded-2xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-background/70 py-14 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  ما لگينا محلات بهذا الفلتر. جرّب فئة ثانية أو امسح البحث.
                </p>
                <button
                  onClick={() => {
                    setActiveCat("all");
                    setQuery("");
                  }}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  امسح الفلاتر
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {visible.map((store, index) => (
                    <div
                      key={store.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${(index % PAGE_SIZE) * 25}ms`, animationFillMode: "backwards" }}
                    >
                      <CityShopCard shop={store} citySlug={slug} />
                    </div>
                  ))}
                </div>

                {visibleCount < filtered.length && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                      className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-5 py-2.5 text-sm font-bold text-primary transition-all hover:border-primary hover:bg-primary hover:text-primary-foreground hover:shadow-soft-md active:scale-95"
                    >
                      شوف المزيد ({filtered.length - visibleCount})
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: string;
  tone?: "primary" | "accent";
}) {
  const accentClass =
    tone === "primary"
      ? "from-primary/15 to-primary/0 text-primary"
      : "from-accent/15 to-accent/0 text-accent";
  return (
    <div className="group/metric relative overflow-hidden rounded-2xl border border-border/60 bg-background/90 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft">
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b opacity-70 transition-opacity group-hover/metric:opacity-100",
          accentClass,
        )}
      />
      <div className="relative font-display text-2xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      <div className="relative mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
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
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-soft"
          : "border-border/80 bg-background text-foreground hover:border-primary/35 hover:bg-muted",
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          "inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-bold",
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}
