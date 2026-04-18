import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";
import { QuickFilterPills } from "@/components/QuickFilterPills";
import { CountUp } from "@/components/CountUp";
import { useDataStore } from "@/lib/dataStore";
import { SUGGESTED_QUERIES } from "@/lib/search";
import { CITIES } from "@/lib/cityData";

export function HeroBanner() {
  const { brands } = useDataStore();
  const totalShops = CITIES.reduce((sum, city) => sum + (city.count ?? 0), 0);

  const stats = [
    { value: totalShops, label: "محل ميداني" },
    { value: brands.length, label: "وكيل وبراند" },
    { value: CITIES.length, label: "محافظة" },
  ];

  return (
    <section className="relative isolate overflow-hidden hero-bg">
      {/* Aurora layered background */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-blob-1" />
        <div className="aurora-blob aurora-blob-2" />
        <div className="aurora-blob aurora-blob-3" />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 -z-10 bg-grid opacity-40" />

      <div className="container relative pt-10 pb-12 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          {/* Headline */}
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 backdrop-blur px-3 py-1.5 text-[11px] font-semibold text-primary shadow-soft">
              <Sparkles className="h-3 w-3 animate-pulse" />
              دليل الإلكترونيات · العراق
            </div>

            <h1 className="font-display mt-5 text-[clamp(2rem,7vw,5.5rem)] font-semibold leading-[1.05] text-foreground tracking-tight sm:mt-6 sm:leading-[0.95]">
              أطلس
              <span className="text-rainbow"> سوق </span>
              الإلكترونيات{" "}
              <span className="text-foreground/45">العراقي.</span>
            </h1>

            <p className="mt-5 max-w-[58ch] text-sm leading-7 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">
              مرجع واحد لمحلات وشوارع ومحافظات العراق. تعرف على المحل الصحيح،
              ثقته، وأقرب طريق له — قبل ما تتحرك من البيت.
            </p>

            {/* Search */}
            <div className="mt-6 sm:mt-10">
              <HeroSearch />
            </div>

            {/* Quick Filter pills */}
            <div className="mt-4">
              <QuickFilterPills />
            </div>

            {/* Quick queries */}
            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted-foreground">
              <span className="hidden font-semibold uppercase tracking-[0.16em] text-foreground/55 sm:inline">الأكثر بحثاً</span>
              {SUGGESTED_QUERIES.slice(0, 4).map((query) => (
                <Link
                  key={query}
                  to={`/results?q=${encodeURIComponent(query)}`}
                  className="rounded-full border border-border bg-card/80 backdrop-blur px-3 py-1 font-medium text-foreground/75 hover:border-primary/40 hover:bg-primary-soft hover:text-primary transition-colors"
                >
                  {query}
                </Link>
              ))}
            </div>

            {/* ⌘K hint (desktop) */}
            <div className="mt-4 hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
              <span>اضغط</span>
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-numeric text-[10px] font-semibold shadow-soft">⌘</kbd>
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-numeric text-[10px] font-semibold shadow-soft">K</kbd>
              <span>لفتح البحث الذكي من أي مكان</span>
            </div>
          </div>

          {/* Sidebar — index card */}
          <aside className="hidden self-start atlas-panel p-2 text-right lg:block backdrop-blur-sm bg-card/85">
            <div className="px-4 pt-3 pb-2">
              <div className="atlas-kicker">الفهرس</div>
            </div>

            <div className="space-y-1">
              {[
                { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · قطع · شبكات", num: "01", color: "chip-cyan" },
                { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن · إكسسوارات", num: "02", color: "chip-rose" },
                { to: "/iraq", title: "كل المحافظات", note: "بغداد · أربيل · البصرة + 7", num: "03", color: "chip-violet" },
                { to: "/brands", title: "الوكلاء الرسميون", note: `${brands.length} وكيل معتمد`, num: "04", color: "chip-emerald" },
              ].map((entry) => (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className="group flex items-start justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-primary-soft"
                >
                  <span className={`${entry.color} font-numeric inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold mt-0.5`}>{entry.num}</span>
                  <div className="flex-1 text-right">
                    <div className="font-display text-base font-semibold leading-tight text-foreground group-hover:text-primary">
                      {entry.title}
                    </div>
                    <div className="mt-1 text-xs leading-5 text-muted-foreground">{entry.note}</div>
                  </div>
                  <ArrowLeft className="icon-nudge-x mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </aside>
        </div>

        {/* Mobile entries */}
        <div className="mt-8 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:hidden">
          {[
            { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · شبكات", color: "chip-cyan" },
            { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن", color: "chip-rose" },
            { to: "/iraq", title: "كل المحافظات", note: "10 محافظات", color: "chip-violet" },
          ].map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card/90 backdrop-blur px-4 py-3 text-right shadow-soft transition-all hover:border-primary/40 hover:shadow-soft-md"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <div className="font-display text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors">{entry.title}</div>
                <div className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${entry.color}`}>{entry.note}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats — premium numerals + count-up */}
        <div className="mt-10 grid grid-cols-3 gap-2 sm:gap-4 md:mt-16">
          {stats.map((stat) => (
            <div key={stat.label} className="atlas-card hover-lift px-3 py-4 text-right sm:px-6 sm:py-6 md:px-8 md:py-8">
              <CountUp
                value={stat.value}
                className="font-numeric text-2xl font-semibold leading-none text-rainbow sm:text-4xl md:text-5xl lg:text-6xl"
              />
              <div className="mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:tracking-[0.18em]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
