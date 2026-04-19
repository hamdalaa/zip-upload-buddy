import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";

import { CountUp } from "@/components/CountUp";
import { useDataStore } from "@/lib/dataStore";
import { SUGGESTED_QUERIES } from "@/lib/search";
import { CITIES } from "@/lib/cityData";
import sinaaImg from "@/assets/street-sinaa.jpg";
import rubaieImg from "@/assets/street-rubaie.jpg";
import iraqImg from "@/assets/iraq-cities.jpg";

export function HeroBanner() {
  const { brands } = useDataStore();
  // Displayed total reflects full network coverage across Iraq (3100+ shops indexed).
  const computedShops = CITIES.reduce((sum, city) => sum + (city.count ?? 0), 0);
  const totalShops = Math.max(computedShops, 3100);

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

      <div className="container relative pt-6 pb-10 sm:pt-14 sm:pb-20 md:pt-24 md:pb-28">
        <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-16">
          {/* Headline */}
          <div className="min-w-0 text-right">
            <div className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft/80 backdrop-blur px-2.5 py-1 text-[10px] font-semibold text-primary shadow-soft sm:gap-2 sm:px-3 sm:py-1.5 sm:text-[11px]">
              <Sparkles className="h-3 w-3 shrink-0 animate-pulse" />
              <span className="truncate">أكبر دليل إلكترونيات بالعراق · مُحدَّث يومياً</span>
            </div>

            <h1 className="font-display mt-4 text-[clamp(1.75rem,5.6vw,5.5rem)] font-semibold leading-[1.1] text-foreground tracking-tight sm:mt-6 sm:leading-[0.94]">
              لا تشتري
              <span className="text-rainbow"> غلط </span>
              مرّة ثانية<span className="text-foreground/45">.</span>
            </h1>

            <p className="mt-4 max-w-[60ch] text-[13px] leading-6 text-muted-foreground sm:mt-6 sm:text-lg sm:leading-8">
              قبل ما تطلع من البيت، اعرف <span className="font-semibold text-primary">وين أرخص سعر</span>،
              <span className="font-semibold text-cyan"> منو المحل الأوثق</span>،
              و<span className="font-semibold text-violet">شنو يكولون الناس</span> عنه —
              <span className="font-semibold text-rose"> بنقرة وحدة</span>.
            </p>

            {/* Search */}
            <div className="relative z-30 mt-5 sm:mt-10">
              <HeroSearch />
            </div>


            {/* Quick queries */}


            {/* ⌘K hint (desktop) */}
            <div className="mt-4 hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
              <span>اضغط</span>
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-numeric text-[10px] font-semibold shadow-soft">⌘</kbd>
              <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-numeric text-[10px] font-semibold shadow-soft">K</kbd>
              <span>لفتح البحث الذكي من أي مكان</span>
            </div>
          </div>

          {/* Sidebar — premium ceramic index card */}
          <aside className="hidden self-start rounded-2xl bg-card p-4 text-right shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08),0_0_0_1px_rgba(0,0,0,0.04)] lg:block">
            <div className="mb-4 flex items-center justify-between px-1">
              <h2 className="font-display text-base font-semibold tracking-tight text-foreground">دليل الوصول السريع</h2>
              <div className="flex items-center gap-1.5">
                <div className="size-1.5 animate-pulse rounded-full bg-emerald" />
                <span className="text-[11px] font-medium text-muted-foreground/70">حي</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              {[
                { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · قطع · شبكات", num: "01", hover: "group-hover:text-cyan", ring: "group-hover:ring-cyan/30", img: sinaaImg },
                { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن · إكسسوارات", num: "02", hover: "group-hover:text-rose", ring: "group-hover:ring-rose/30", img: rubaieImg },
                { to: "/iraq", title: "كل المحافظات", note: "بغداد · أربيل · البصرة + 7", num: "03", hover: "group-hover:text-violet", ring: "group-hover:ring-violet/30", img: iraqImg },
                { to: "/brands", title: "الوكلاء الرسميون", note: `${brands.length} وكيل معتمد`, num: "04", hover: "group-hover:text-emerald", ring: "group-hover:ring-emerald/30", img: null },
              ].map((entry) => (
                <Link
                  key={entry.to}
                  to={entry.to}
                  className="group relative flex items-center gap-3 rounded-xl p-2 transition-all duration-300 hover:bg-muted/60"
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-muted shadow-[inset_0_1px_4px_rgba(0,0,0,0.05)] ring-1 ring-inset ring-black/[0.04]">
                    {entry.img ? (
                      <img
                        src={entry.img}
                        alt=""
                        loading="lazy"
                        width={96}
                        height={96}
                        className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-emerald-soft to-card" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className={`truncate font-display text-[13px] font-semibold text-foreground transition-colors duration-300 ${entry.hover}`}>
                      {entry.title}
                    </h3>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{entry.note}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={`flex size-8 items-center justify-center rounded-full bg-background font-numeric text-[11px] font-semibold text-muted-foreground shadow-soft ring-1 ring-border transition-all duration-300 ${entry.ring} ${entry.hover}`}>
                      {entry.num}
                    </span>
                    <ArrowLeft className={`h-3.5 w-3.5 text-muted-foreground/60 transition-all duration-300 group-hover:-translate-x-0.5 ${entry.hover}`} />
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        {/* Mobile entries — premium image cards */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:hidden">
          {[
            { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · شبكات", img: sinaaImg, accent: "from-cyan/30" },
            { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن", img: rubaieImg, accent: "from-rose/30" },
            { to: "/iraq", title: "كل المحافظات", note: "10 محافظات", img: iraqImg, accent: "from-violet/30" },
          ].map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="group relative isolate flex h-28 items-end overflow-hidden rounded-2xl border border-border/60 shadow-soft-lg transition-all hover:shadow-soft-xl hover:-translate-y-0.5"
            >
              <img
                src={entry.img}
                alt={entry.title}
                loading="lazy"
                width={800}
                height={512}
                className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              {/* Premium gradient overlay (bottom-up + accent tint) */}
              <div className={`absolute inset-0 -z-10 bg-gradient-to-t ${entry.accent} via-foreground/30 to-foreground/85`} />
              <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-foreground/70 via-transparent to-transparent" />

              <div className="relative flex w-full items-end justify-between gap-3 p-3.5 text-right text-white">
                <div className="min-w-0">
                  <div className="font-display text-base font-semibold leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]">
                    {entry.title}
                  </div>
                  <div className="mt-1.5 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium backdrop-blur-md ring-1 ring-white/25">
                    {entry.note}
                  </div>
                </div>
                <ArrowLeft className="h-4 w-4 shrink-0 opacity-80 transition-transform group-hover:-translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* Stats — premium numerals + count-up */}
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4 md:mt-16">
          {stats.map((stat) => (
            <div key={stat.label} className="atlas-card hover-lift flex min-w-0 flex-col items-center justify-center px-2 py-3.5 text-center sm:px-6 sm:py-6 md:px-8 md:py-8">
              <CountUp
                value={stat.value}
                className="font-numeric text-xl font-semibold leading-none text-rainbow sm:text-4xl md:text-5xl lg:text-6xl"
              />
              <div className="mt-1.5 line-clamp-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:mt-2 sm:text-[11px] sm:tracking-[0.18em]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
