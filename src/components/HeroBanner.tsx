import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, MapPin, Tag, ShieldCheck } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";

import { CountUp } from "@/components/CountUp";
import { useDataStore } from "@/lib/dataStore";
import { getPublicStoreCount } from "@/lib/catalogCounts";
import { CITIES } from "@/lib/cityData";
import sinaaImg from "@/assets/street-sinaa.jpg";
import rubaieImg from "@/assets/street-rubaie.jpg";
import iraqImg from "@/assets/iraq-cities.jpg";
import baghdadMap from "@/assets/hero-baghdad-map.jpg";

export function HeroBanner() {
  const { brands, summary } = useDataStore();
  const computedShops = CITIES.reduce((sum, city) => sum + (city.count ?? 0), 0);
  const totalShops = getPublicStoreCount(summary.totalStores, computedShops);

  const stats = [
    { value: totalShops, label: "محل ميداني" },
    { value: brands.length, label: "وكيل وبراند" },
    { value: CITIES.length, label: "محافظة" },
  ];

  const valueProps = [
    {
      icon: Tag,
      title: "قارن الأسعار قبل ما تطلع",
      desc: "شوف أرخص سعر للمنتج عند كل المحلات بنفس اللحظة.",
      tint: "from-primary/20 to-primary/5",
      icon_color: "text-primary",
    },
    {
      icon: ShieldCheck,
      title: "محلات موثوقة فقط",
      desc: "تقييمات حقيقية من زبائن سابقين + وكلاء معتمدين.",
      tint: "from-violet/20 to-violet/5",
      icon_color: "text-violet",
    },
    {
      icon: MapPin,
      title: "اعرف وين المحل بالضبط",
      desc: "موقع، ساعات دوام، وتلفون — جاهزة قبل ما تتحرك.",
      tint: "from-cyan/20 to-cyan/5",
      icon_color: "text-cyan",
    },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-background">
      {/* Bright airy base — soft cream wash */}
      <div className="absolute inset-0 -z-30 bg-gradient-to-b from-primary-soft/30 via-background to-background" />

      {/* Baghdad street map — very faint, no blend mode (mobile-safe) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-25 opacity-[0.08] pointer-events-none"
        style={{
          backgroundImage: `url(${baghdadMap})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      {/* Soft glow accents — light, no heavy blobs */}
      <div className="pointer-events-none absolute -top-40 right-1/4 -z-20 h-[420px] w-[420px] rounded-full bg-primary/8 blur-[140px]" />
      <div className="pointer-events-none absolute top-1/2 -left-32 -z-20 h-[380px] w-[380px] rounded-full bg-primary-soft/30 blur-[140px]" />

      {/* Top hairline */}
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="container relative pt-10 pb-14 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/80 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-semibold text-primary shadow-soft sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" />
            <span>أكبر دليل إلكترونيات بالعراق · مُحدَّث يومياً</span>
            <span className="mx-1 h-1 w-1 rounded-full bg-emerald" />
            <span className="text-primary/70">حي الآن</span>
          </div>

          {/* Headline */}
          <h1 className="font-display mt-6 text-[clamp(2.25rem,6.4vw,5.5rem)] font-medium leading-[1.05] tracking-tight text-foreground sm:mt-8">
            كل محلات الإلكترونيات
            <br className="hidden sm:inline" />
            <span className="font-bold bg-gradient-to-r from-primary via-primary to-emerald bg-clip-text text-transparent"> بمكان واحد</span>
            <span className="text-primary">.</span>
          </h1>

          {/* Service explanation */}
          <p className="mx-auto mt-5 max-w-[62ch] text-[13px] leading-7 text-muted-foreground sm:mt-7 sm:text-base sm:leading-8">
            دور على أي منتج إلكتروني — موبايل، لابتوب، شاشة، إكسسوار — وشوف
            <span className="text-foreground"> أسعاره عند كل المحلات</span>،
            مع <span className="text-foreground">العنوان والتقييمات وتلفون المحل</span>،
            من شارع الصناعة لحد البصرة وأربيل.
          </p>

          {/* Search */}
          <div className="relative z-30 mx-auto mt-7 max-w-2xl sm:mt-10">
            <HeroSearch />
          </div>

          <div className="mt-5 hidden items-center justify-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span>اضغط</span>
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-numeric text-[10px] font-semibold shadow-soft">⌘</kbd>
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-numeric text-[10px] font-semibold shadow-soft">K</kbd>
            <span>لفتح البحث الذكي من أي مكان</span>
          </div>
        </div>

        {/* Value propositions hidden per request */}

        {/* Quick entry cards — editorial destination tiles */}
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-1 gap-3 sm:mt-12 sm:grid-cols-3 sm:gap-4">
          {[
            { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · شبكات", kicker: "بغداد", img: sinaaImg },
            { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن", kicker: "بغداد", img: rubaieImg },
            { to: "/iraq", title: "كل المحافظات", note: "10 محافظات", kicker: "العراق", img: iraqImg },
          ].map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="group relative isolate flex h-36 items-end overflow-hidden rounded-2xl border border-border/60 bg-card shadow-soft transition-shadow duration-300 hover:shadow-soft-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-40"
            >
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={entry.img}
                  alt={entry.title}
                  loading="lazy"
                  width={800}
                  height={512}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out will-change-transform group-hover:scale-105"
                />
                {/* Single elegant gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/35 to-transparent" />
                {/* Subtle hover tint */}
                <div className="absolute inset-0 bg-foreground/0 transition-colors duration-300 group-hover:bg-foreground/10" />
              </div>

              {/* Top kicker chip */}
              <div className="absolute right-3 top-3 z-10 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold text-foreground/80 backdrop-blur-md ring-1 ring-border/60">
                {entry.kicker}
              </div>

              <div className="relative z-10 flex w-full items-end justify-between gap-3 p-4 text-right text-white">
                <div className="min-w-0">
                  <div className="font-display text-lg font-semibold leading-tight tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
                    {entry.title}
                  </div>
                  <div className="mt-1 text-[11px] font-medium text-white/85">
                    {entry.note}
                  </div>
                </div>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/95 text-foreground shadow-soft transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover:-translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Stats — premium light cards */}
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-3 gap-2 sm:gap-4 md:mt-12">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="relative flex min-w-0 flex-col items-center justify-center rounded-2xl border border-border bg-card/80 px-2 py-4 text-center backdrop-blur-md shadow-soft transition-all hover:shadow-soft-lg sm:px-6 sm:py-7 md:px-8 md:py-8"
            >
              <CountUp
                value={stat.value}
                className="font-numeric text-2xl font-semibold leading-none bg-gradient-to-b from-primary to-violet bg-clip-text text-transparent sm:text-4xl md:text-5xl lg:text-6xl"
              />
              <div className="mt-2 line-clamp-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground sm:text-[11px] sm:tracking-[0.2em]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}
