import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";
import { useDataStore } from "@/lib/dataStore";
import { SUGGESTED_QUERIES } from "@/lib/search";
import { CITIES } from "@/lib/cityData";

export function HeroBanner() {
  const { shops, brands } = useDataStore();
  const activeShops = shops.filter((shop) => !shop.archivedAt).length;

  const stats = [
    { value: activeShops, label: "محل ميداني" },
    { value: brands.length, label: "وكيل وبراند" },
    { value: CITIES.length, label: "محافظة" },
  ];

  return (
    <section className="relative isolate overflow-hidden hero-bg">
      {/* Subtle grid */}
      <div className="absolute inset-0 -z-10 bg-grid opacity-50" />

      <div className="container relative pt-12 pb-16 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          {/* Headline */}
          <div className="text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-[11px] font-semibold text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary animate-pulse-glow" />
              دليل الإلكترونيات · العراق
            </div>

            <h1 className="font-display mt-6 text-[clamp(2.5rem,8vw,6rem)] font-semibold leading-[0.95] text-foreground tracking-tight">
              أطلس
              <span className="text-gradient"> سوق </span>
              الإلكترونيات
              <br />
              <span className="text-foreground/45">العراقي.</span>
            </h1>

            <p className="mt-6 max-w-[58ch] text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">
              مرجع واحد لمحلات وشوارع ومحافظات العراق. تعرف على المحل الصحيح،
              ثقته، وأقرب طريق له — قبل ما تتحرك من البيت.
            </p>

            {/* Search */}
            <div className="mt-8 sm:mt-10">
              <HeroSearch />
            </div>

            {/* Quick queries */}
            <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-[0.16em] text-foreground/55">الأكثر بحثاً</span>
              {SUGGESTED_QUERIES.slice(0, 5).map((query) => (
                <Link
                  key={query}
                  to={`/results?q=${encodeURIComponent(query)}`}
                  className="rounded-full border border-border bg-card px-3 py-1 font-medium text-foreground/75 hover:border-primary/40 hover:bg-primary-soft hover:text-primary transition-colors"
                >
                  {query}
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar — index card */}
          <aside className="hidden self-start atlas-panel p-2 text-right lg:block">
            <div className="px-4 pt-3 pb-2">
              <div className="atlas-kicker">الفهرس</div>
            </div>

            <div className="space-y-1">
              {[
                { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · قطع · شبكات", num: "01" },
                { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن · إكسسوارات", num: "02" },
                { to: "/iraq", title: "كل المحافظات", note: "بغداد · أربيل · البصرة + 7", num: "03" },
                { to: "/brands", title: "الوكلاء الرسميون", note: `${brands.length} وكيل معتمد`, num: "04" },
              ].map((entry) => (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className="group flex items-start justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-primary-soft"
                >
                  <span className="font-numeric text-[10px] font-semibold text-muted-foreground mt-1">{entry.num}</span>
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
            { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · شبكات" },
            { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن" },
            { to: "/iraq", title: "كل المحافظات", note: "10 محافظات" },
          ].map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-right shadow-soft transition-all hover:border-primary/40 hover:shadow-soft-md"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              <div>
                <div className="font-display text-base font-semibold leading-none text-foreground group-hover:text-primary transition-colors">{entry.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{entry.note}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats — premium numerals */}
        <div className="mt-12 grid grid-cols-3 gap-2 sm:gap-4 md:mt-16">
          {stats.map((stat) => (
            <div key={stat.label} className="atlas-card px-4 py-5 text-right sm:px-6 sm:py-6 md:px-8 md:py-8">
              <div className="font-numeric text-3xl font-semibold leading-none text-gradient sm:text-4xl md:text-5xl lg:text-6xl">
                {stat.value.toLocaleString("ar")}
              </div>
              <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
