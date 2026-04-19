import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, Search, MapPin, Tag, ShieldCheck } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";

import { CountUp } from "@/components/CountUp";
import { useDataStore } from "@/lib/dataStore";
import { CITIES } from "@/lib/cityData";
import sinaaImg from "@/assets/street-sinaa.jpg";
import rubaieImg from "@/assets/street-rubaie.jpg";
import iraqImg from "@/assets/iraq-cities.jpg";
import heroBg from "@/assets/hero-mall.jpg";

export function HeroBanner() {
  const { brands } = useDataStore();
  const computedShops = CITIES.reduce((sum, city) => sum + (city.count ?? 0), 0);
  const totalShops = Math.max(computedShops, 3100);

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
    },
    {
      icon: ShieldCheck,
      title: "محلات موثوقة فقط",
      desc: "تقييمات حقيقية من زبائن سابقين + وكلاء معتمدين.",
    },
    {
      icon: MapPin,
      title: "اعرف وين المحل بالضبط",
      desc: "موقع، ساعات دوام، وتلفون — جاهزة قبل ما تتحرك.",
    },
  ];

  return (
    <section className="relative isolate overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 -z-20">
        <img
          src={heroBg}
          alt="سوق الإلكترونيات في بغداد"
          className="h-full w-full object-cover"
          loading="eager"
        />
        {/* Strong readability overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/75 to-background/95" />
        <div className="absolute inset-0 bg-gradient-to-l from-background/40 via-transparent to-background/40" />
      </div>

      {/* Subtle aurora accents on top of image */}
      <div className="aurora-bg pointer-events-none">
        <div className="aurora-blob aurora-blob-1 opacity-50" />
        <div className="aurora-blob aurora-blob-3 opacity-50" />
      </div>

      <div className="container relative pt-8 pb-12 sm:pt-16 sm:pb-20 md:pt-24 md:pb-28">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-soft/90 backdrop-blur px-3 py-1.5 text-[11px] font-semibold text-primary shadow-soft sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 animate-pulse" />
            <span>أكبر دليل إلكترونيات بالعراق · مُحدَّث يومياً</span>
          </div>

          {/* Headline */}
          <h1 className="font-display mt-5 text-[clamp(2rem,6vw,5rem)] font-semibold leading-[1.05] text-foreground tracking-tight sm:mt-7">
            كل محلات الإلكترونيات بالعراق
            <br className="hidden sm:inline" />
            <span className="text-rainbow"> بمكان واحد</span>
          </h1>

          {/* Clear service explanation */}
          <p className="mx-auto mt-4 max-w-[65ch] text-sm leading-7 text-foreground/80 sm:mt-6 sm:text-lg sm:leading-8">
            دور على أي منتج إلكتروني — موبايل، لابتوب، شاشة، إكسسوار — وشوف
            <span className="font-semibold text-foreground"> أسعاره عند كل المحلات</span>،
            مع <span className="font-semibold text-foreground">العنوان والتقييمات وتلفون المحل</span>،
            من شارع الصناعة لحد البصرة وأربيل.
          </p>

          {/* Search */}
          <div className="relative z-30 mx-auto mt-6 max-w-2xl sm:mt-9">
            <HeroSearch />
          </div>

          {/* ⌘K hint */}
          <div className="mt-4 hidden items-center justify-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <span>اضغط</span>
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-numeric text-[10px] font-semibold shadow-soft">⌘</kbd>
            <kbd className="rounded border border-border bg-card px-1.5 py-0.5 font-numeric text-[10px] font-semibold shadow-soft">K</kbd>
            <span>لفتح البحث الذكي من أي مكان</span>
          </div>
        </div>

        {/* Value propositions — what the service does */}
        <div className="mx-auto mt-10 grid max-w-5xl gap-3 sm:mt-14 sm:grid-cols-3 sm:gap-4">
          {valueProps.map((vp) => (
            <div
              key={vp.title}
              className="atlas-card flex items-start gap-3 p-4 text-right sm:p-5"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary ring-1 ring-primary/15">
                <vp.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold text-foreground sm:text-base">
                  {vp.title}
                </div>
                <p className="mt-1 text-[12px] leading-6 text-muted-foreground sm:text-[13px]">
                  {vp.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick entry cards */}
        <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-3">
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

        {/* Stats */}
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-3 gap-2 sm:gap-4 md:mt-12">
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
