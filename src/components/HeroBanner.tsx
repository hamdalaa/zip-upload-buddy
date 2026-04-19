import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, MapPin, Tag, ShieldCheck } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";

import { CountUp } from "@/components/CountUp";
import { useDataStore } from "@/lib/dataStore";
import { CITIES } from "@/lib/cityData";
import sinaaImg from "@/assets/street-sinaa.jpg";
import rubaieImg from "@/assets/street-rubaie.jpg";
import iraqImg from "@/assets/iraq-cities.jpg";
import heroBg from "@/assets/hero-mall-graded.jpg";

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
    <section className="relative isolate overflow-hidden bg-[#0a0e14]">
      {/* Cinematic background image */}
      <div className="absolute inset-0 -z-30">
        <img
          src={heroBg}
          alt="سوق الإلكترونيات في بغداد"
          className="h-full w-full object-cover object-center scale-105"
          loading="eager"
        />
      </div>

      {/* Layered gradients for cinematic depth */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#0a0e14]/70 via-[#0a0e14]/55 to-[#0a0e14]/95" />
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(10,14,20,0.65)_70%,_rgba(10,14,20,0.95)_100%)]" />
      <div className="absolute inset-0 -z-20 bg-gradient-to-tr from-primary/15 via-transparent to-violet/10" />

      {/* Film grain texture */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.18] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Top hairline accent */}
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

      <div className="container relative pt-10 pb-14 sm:pt-20 sm:pb-24 md:pt-28 md:pb-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] backdrop-blur-md px-3.5 py-1.5 text-[11px] font-semibold text-white/90 shadow-[0_8px_30px_rgba(0,0,0,0.3)] sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary-glow animate-pulse" />
            <span>أكبر دليل إلكترونيات بالعراق · مُحدَّث يومياً</span>
            <span className="mx-1 h-1 w-1 rounded-full bg-emerald" />
            <span className="text-white/60">حي الآن</span>
          </div>

          {/* Headline — editorial weight */}
          <h1 className="font-display mt-6 text-[clamp(2.25rem,6.4vw,5.5rem)] font-semibold leading-[1.02] tracking-tight text-white sm:mt-8 [text-shadow:_0_2px_30px_rgba(0,0,0,0.5)]">
            كل محلات الإلكترونيات
            <br className="hidden sm:inline" />
            <span className="bg-gradient-to-l from-primary-glow via-cyan to-violet bg-clip-text text-transparent"> بمكان واحد </span>
          </h1>

          {/* Service explanation */}
          <p className="mx-auto mt-5 max-w-[62ch] text-sm leading-7 text-white/75 sm:mt-7 sm:text-lg sm:leading-8">
            دور على أي منتج إلكتروني — موبايل، لابتوب، شاشة، إكسسوار — وشوف
            <span className="font-semibold text-white"> أسعاره عند كل المحلات</span>،
            مع <span className="font-semibold text-white">العنوان والتقييمات وتلفون المحل</span>،
            من شارع الصناعة لحد البصرة وأربيل.
          </p>

          {/* Search */}
          <div className="relative z-30 mx-auto mt-7 max-w-2xl sm:mt-10">
            {/* Glow halo behind search */}
            <div className="absolute inset-0 -z-10 blur-3xl opacity-50 bg-gradient-to-r from-primary/40 via-cyan/30 to-violet/40 rounded-full" />
            <HeroSearch />
          </div>

          <div className="mt-5 hidden items-center justify-center gap-2 text-[11px] text-white/55 sm:flex">
            <span>اضغط</span>
            <kbd className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-numeric text-[10px] font-semibold text-white/80 backdrop-blur">⌘</kbd>
            <kbd className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-numeric text-[10px] font-semibold text-white/80 backdrop-blur">K</kbd>
            <span>لفتح البحث الذكي من أي مكان</span>
          </div>
        </div>

        {/* Value propositions — glass cards on dark */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-3 sm:mt-16 sm:grid-cols-3 sm:gap-4">
          {valueProps.map((vp, i) => (
            <div
              key={vp.title}
              className="group relative flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-right backdrop-blur-md transition-all hover:bg-white/[0.07] hover:border-white/20 sm:p-5"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Subtle inner glow */}
              <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-br from-white/[0.04] to-transparent opacity-60" />

              <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 text-primary-glow ring-1 ring-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <vp.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display text-sm font-semibold text-white sm:text-base">
                  {vp.title}
                </div>
                <p className="mt-1 text-[12px] leading-6 text-white/65 sm:text-[13px]">
                  {vp.desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Quick entry cards */}
        <div className="mx-auto mt-6 grid max-w-5xl grid-cols-1 gap-3 sm:mt-8 sm:grid-cols-3">
          {[
            { to: "/sinaa", title: "شارع الصناعة", note: "حاسبات · شبكات", img: sinaaImg, accent: "from-cyan/40" },
            { to: "/rubaie", title: "شارع الربيعي", note: "هواتف · شواحن", img: rubaieImg, accent: "from-rose/40" },
            { to: "/iraq", title: "كل المحافظات", note: "10 محافظات", img: iraqImg, accent: "from-violet/40" },
          ].map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="group relative isolate flex h-28 items-end overflow-hidden rounded-2xl border border-white/15 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)] transition-all hover:-translate-y-0.5 hover:border-white/30"
            >
              <img
                src={entry.img}
                alt={entry.title}
                loading="lazy"
                width={800}
                height={512}
                className="absolute inset-0 -z-10 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className={`absolute inset-0 -z-10 bg-gradient-to-t ${entry.accent} via-black/40 to-black/85`} />
              <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-black/70 via-transparent to-transparent" />

              <div className="relative flex w-full items-end justify-between gap-3 p-3.5 text-right text-white">
                <div className="min-w-0">
                  <div className="font-display text-base font-semibold leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]">
                    {entry.title}
                  </div>
                  <div className="mt-1.5 inline-block rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium backdrop-blur-md ring-1 ring-white/25">
                    {entry.note}
                  </div>
                </div>
                <ArrowLeft className="h-4 w-4 shrink-0 opacity-80 transition-transform group-hover:-translate-x-1" />
              </div>
            </Link>
          ))}
        </div>

        {/* Stats — glass on dark */}
        <div className="mx-auto mt-8 grid max-w-5xl grid-cols-3 gap-2 sm:gap-4 md:mt-12">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="relative flex min-w-0 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-4 text-center backdrop-blur-md transition-all hover:bg-white/[0.07] sm:px-6 sm:py-7 md:px-8 md:py-8"
            >
              <CountUp
                value={stat.value}
                className="font-numeric text-2xl font-semibold leading-none bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent sm:text-4xl md:text-5xl lg:text-6xl"
              />
              <div className="mt-2 line-clamp-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/55 sm:text-[11px] sm:tracking-[0.2em]">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade into page */}
      <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-b from-transparent to-background" />
    </section>
  );
}
