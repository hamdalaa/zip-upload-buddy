import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Search } from "lucide-react";
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
    <section className="relative isolate border-b border-border bg-background">
      {/* Top editorial rule */}
      <div className="container">
        <div className="editorial-rule-bold mt-0" />
      </div>

      <div className="container relative pt-8 pb-12 md:pt-14 md:pb-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
          {/* Editorial headline */}
          <div className="text-right">
            <div className="atlas-kicker">دليل الإلكترونيات · العراق</div>

            <h1 className="font-display mt-6 text-[clamp(3rem,9vw,7.5rem)] font-bold leading-[0.86] text-foreground">
              أطلس
              <span className="text-primary"> سوق </span>
              الإلكترونيات
              <br />
              <span className="text-foreground/40">العراقي.</span>
            </h1>

            <p className="mt-8 max-w-[58ch] text-base leading-8 text-muted-foreground md:text-lg md:leading-9">
              مرجع تحريري واحد لمحلات وشوارع ومحافظات العراق. تعرف على المحل الصحيح،
              ثقته، وأقرب طريق له — قبل ما تتحرك من البيت.
            </p>

            {/* Search */}
            <div className="mt-10">
              <HeroSearch />
            </div>

            {/* Quick queries */}
            <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-[0.18em] text-foreground/55">الأكثر بحثاً</span>
              {SUGGESTED_QUERIES.slice(0, 5).map((query) => (
                <Link
                  key={query}
                  to={`/results?q=${encodeURIComponent(query)}`}
                  className="link-underline font-semibold text-foreground/75 hover:text-foreground"
                >
                  {query}
                </Link>
              ))}
            </div>
          </div>

          {/* Sidebar — index card */}
          <aside className="hidden self-start border border-border bg-card p-6 text-right lg:block">
            <div className="atlas-kicker">الفهرس</div>

            <div className="mt-6 space-y-0">
              {[
                { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · قطع · شبكات", num: "01" },
                { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن · إكسسوارات", num: "02" },
                { to: "/iraq", title: "كل المحافظات", note: "بغداد · أربيل · البصرة + 7", num: "03" },
                { to: "/brands", title: "الوكلاء الرسميون", note: `${brands.length} وكيل معتمد`, num: "04" },
              ].map((entry) => (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className="group flex items-start justify-between gap-3 border-b border-border py-4 last:border-b-0 transition-colors hover:bg-surface"
                >
                  <span className="font-numeric text-xs font-semibold text-muted-foreground">{entry.num}</span>
                  <div className="flex-1 text-right">
                    <div className="font-display text-lg font-bold leading-none text-foreground group-hover:text-primary">
                      {entry.title}
                    </div>
                    <div className="mt-1.5 text-xs leading-5 text-muted-foreground">{entry.note}</div>
                  </div>
                  <ArrowLeft className="icon-nudge-x mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
                </Link>
              ))}
            </div>
          </aside>
        </div>

        {/* Mobile entries */}
        <div className="mt-10 grid gap-px bg-border lg:hidden">
          {[
            { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · قطع · شبكات" },
            { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن" },
            { to: "/iraq", title: "كل المحافظات", note: "10 محافظات" },
          ].map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="flex items-center justify-between gap-3 bg-background px-4 py-4 text-right"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <div className="font-display text-lg font-bold leading-none text-foreground">{entry.title}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{entry.note}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats — large editorial numerals */}
        <div className="mt-12 grid grid-cols-3 gap-px border-y border-foreground bg-border md:mt-16">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-background px-4 py-6 text-right md:px-6 md:py-8">
              <div className="font-numeric text-4xl font-bold leading-none text-foreground md:text-5xl lg:text-6xl">
                {stat.value.toLocaleString("ar")}
              </div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
