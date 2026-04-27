import { Link } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Building2, MapPin, Search, Store, TrendingUp } from "lucide-react";
import { HeroSearch } from "@/components/HeroSearch";
import { useDataStore } from "@/lib/dataStore";
import { useSiteSettingsQuery } from "@/lib/catalogQueries";
import { getPublicProductCount, getPublicStoreCount } from "@/lib/catalogCounts";

function IraqFlagMark() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 48 32"
      className="h-4 w-7 shrink-0 overflow-hidden rounded-[0.2rem] border border-border shadow-[0_1px_2px_rgba(42,50,38,0.08)]"
      shapeRendering="crispEdges"
    >
      <rect width="48" height="10.67" fill="#CE1126" />
      <rect y="10.67" width="48" height="10.66" fill="#FFFFFF" />
      <rect y="21.33" width="48" height="10.67" fill="#000000" />
      <text
        x="24"
        y="19.1"
        textAnchor="middle"
        direction="rtl"
        fontFamily="SF Arabic, SF Pro, Tahoma, sans-serif"
        fontSize="7"
        fontWeight="700"
        fill="#007A3D"
      >
        الله أكبر
      </text>
    </svg>
  );
}

function IraqSignalMap() {
  const iraqShape =
    "M399.8 96.7 L437.8 114.1 L442.2 148 L413 168.1 L399.5 213.4 L439.7 268.6 L510.9 300.4 L540.7 344.5 L531.2 386.5 L549.8 386.5 L550.3 417.4 L582.5 448 L548 445.1 L509 440.3 L466.4 496 L358.5 491.4 L194.8 374.6 L108.3 334 L38.4 318.3 L15 247.6 L143.5 187.2 L165.4 117 L160 74.6 L191.7 60.2 L221.5 24 L246.4 15 L313.9 22.5 L334.3 37.3 L362.1 27.5 L399.8 96.7 Z";

  const pins = [
    { x: 286, y: 100, label: "أربيل" },
    { x: 338, y: 178, label: "بغداد" },
    { x: 112, y: 278, label: "كربلاء" },
    { x: 338, y: 252, label: "النجف" },
    { x: 536, y: 414, label: "البصرة" },
  ];

  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 610 511"
      preserveAspectRatio="xMidYMid meet"
      fill="none"
      role="img"
      aria-label="خريطة العراق"
    >
      <defs>
        <pattern id="home-map-dots" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1" fill="hsl(var(--primary))" opacity="0.42" />
        </pattern>
        <clipPath id="home-map-clip">
          <path d={iraqShape} />
        </clipPath>
        <filter id="home-map-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="24" floodColor="hsl(var(--primary))" floodOpacity="0.18" />
        </filter>
      </defs>

      <path
        d="M96 464 C206 409 337 367 546 330"
        stroke="hsl(var(--surface-2))"
        strokeWidth="48"
        strokeLinecap="round"
        opacity="0.9"
      />
      <g opacity="0.72">
        {[138, 188, 238, 288, 338].map((radius) => (
          <circle key={radius} cx="290" cy="350" r={radius} stroke="hsl(var(--border))" strokeWidth="1" />
        ))}
      </g>

      <g filter="url(#home-map-shadow)">
        <path d={iraqShape} fill="hsl(var(--card))" />
        <path d={iraqShape} fill="url(#home-map-dots)" opacity="0.85" />
        <g clipPath="url(#home-map-clip)" stroke="#FFFFFF" strokeWidth="2" opacity="0.95">
          <path d="M246 15 C258 86 270 162 289 244 C312 343 340 422 358 491" />
          <path d="M399 97 C392 168 393 240 407 318 C419 387 449 451 466 496" />
          <path d="M165 117 C222 133 277 165 329 204 C385 247 443 280 511 300" />
          <path d="M15 248 C91 266 157 292 212 333 C268 374 339 405 509 440" />
          <path d="M144 187 C214 195 272 219 328 260 C383 300 452 326 541 345" />
        </g>
        <path d={iraqShape} stroke="#FFFFFF" strokeWidth="6" opacity="0.95" />
        <path d={iraqShape} stroke="hsl(var(--border))" strokeWidth="1.5" opacity="0.95" />
      </g>

      {pins.map((pin) => (
        <g key={pin.label}>
          <circle cx={pin.x} cy={pin.y} r="24" fill="hsl(var(--accent-amber))" opacity="0.14" />
          <circle cx={pin.x} cy={pin.y} r="8" fill="hsl(var(--primary))" />
          <circle cx={pin.x} cy={pin.y} r="3.5" fill="hsl(var(--card))" />
        </g>
      ))}
    </svg>
  );
}

function HeroMetric({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Store;
  value: string;
  label: string;
}) {
  return (
    <div className="h-full min-w-0 rounded-[1.25rem] bg-card/64 p-1.5 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.3)] sm:rounded-[1.35rem]">
      <div className="flex min-h-[92px] items-center justify-between gap-2 rounded-[0.95rem] bg-white/74 px-3 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] sm:gap-3 sm:rounded-[1.05rem] sm:px-3.5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary sm:h-10 sm:w-10">
          <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="font-numeric block whitespace-nowrap text-[clamp(1rem,1.35vw,1.22rem)] font-semibold leading-none text-foreground">{value}</span>
          <span className="mt-1 block text-[10px] font-medium leading-[1.55] text-muted-foreground sm:text-[11px]">{label}</span>
        </span>
      </div>
    </div>
  );
}

const quickRoutes = [
  { to: "/iraq", label: "المحافظات", meta: "10 مسارات", icon: Building2 },
  { to: "/sinaa", label: "الصناعة", meta: "حاسبات وقطع", icon: Store },
  { to: "/rubaie", label: "الربيعي", meta: "هواتف وإكسسوارات", icon: MapPin },
];

export function HeroBanner() {
  const { shops, products, summary } = useDataStore();
  const settingsQuery = useSiteSettingsQuery();
  const siteSettings = settingsQuery.data?.payload;
  const storeCount = getPublicStoreCount(summary.totalStores, shops.filter((shop) => !shop.archivedAt).length);
  const productCount = getPublicProductCount(summary.totalProducts, products.length);
  const hero = siteSettings?.hero;

  return (
    <section className="relative isolate overflow-hidden bg-surface text-foreground">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary)/0.055)_1px,transparent_1px),linear-gradient(180deg,hsl(var(--primary)/0.045)_1px,transparent_1px)] bg-[size:76px_76px] opacity-[0.5]" />
        <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,hsl(var(--background)/0),hsl(var(--background)))]" />
      </div>

      <div className="relative mx-auto grid w-full max-w-[1728px] min-w-0 items-start gap-10 overflow-hidden px-4 pb-[4.5rem] pt-24 max-sm:px-6 sm:px-8 sm:pb-24 sm:pt-28 lg:min-h-[900px] lg:grid-cols-[minmax(0,0.98fr)_minmax(380px,0.68fr)] lg:items-stretch lg:px-16 lg:pb-28 lg:pt-32 xl:min-h-[940px] xl:gap-16">
        <div className="relative z-10 mx-auto flex w-full max-w-[930px] min-w-0 flex-col text-right max-sm:max-w-[20rem] max-sm:-translate-x-2 max-sm:items-center max-sm:text-center lg:mx-0 lg:min-h-[680px] xl:min-h-[760px]">
          <div className="lg:pt-2 xl:pt-5">
            <Link
              to="/iraq"
              className="group inline-flex max-w-full flex-wrap items-center justify-center gap-2.5 rounded-full bg-card/82 px-3 py-2 text-[0.78rem] font-semibold text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-border transition-[transform,background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white hover:text-foreground hover:shadow-[0_16px_36px_-26px_rgba(23,32,23,0.45)] max-sm:mx-auto max-sm:flex max-sm:w-full max-sm:max-w-[20rem] max-sm:text-[0.68rem] sm:text-[0.92rem]"
            >
              <IraqFlagMark />
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_6px_rgba(45,138,114,0.12)]" />
              <span>{hero?.badgeText ?? "دليل عراقي مباشر للمتاجر والإلكترونيات"}</span>
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1" />
            </Link>

            <h1 className="mx-auto mt-7 max-w-[11.5ch] px-2 pb-2 font-display text-[clamp(2.2rem,11vw,3.45rem)] font-black leading-[1.16] tracking-normal text-foreground max-sm:w-full max-sm:max-w-[10.5ch] max-sm:px-1 max-sm:text-[clamp(1.85rem,9.4vw,2.35rem)] max-sm:leading-[1.22] sm:mt-9 sm:max-w-[12.5ch] sm:px-0 sm:text-[clamp(3rem,7.8vw,4.95rem)] lg:mx-0 lg:leading-[1.12] lg:text-[clamp(3.8rem,6.05vw,5.1rem)]">
              {hero?.title ?? "تلقى المحل المناسب قبل ما تلف السوق."}
            </h1>

            <p className="mx-auto mt-6 max-w-[680px] text-[1rem] font-medium leading-[1.95] text-muted-foreground max-sm:w-full max-sm:max-w-[19rem] max-sm:px-1 max-sm:text-[0.92rem] max-sm:leading-[1.9] max-sm:[text-wrap:balance] sm:text-[1.2rem] sm:leading-[2] lg:mx-0">
              {hero?.subtitle ?? "ابحث عن المنتج، اختَر المنطقة أو الفئة، وافتح المحل مع السعر والتقييم والعنوان من نفس المكان."}
            </p>
          </div>

          <div className="mx-auto mt-10 w-full max-w-[760px] min-w-0 max-sm:max-w-[20rem] sm:mt-12 lg:mt-auto lg:max-w-[840px] lg:pb-12 lg:pt-16 xl:pb-10 xl:pt-20">
            <HeroSearch />

            <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9.6rem),1fr))] gap-3 sm:mt-5 sm:grid-cols-3 lg:mt-6">
              <HeroMetric icon={Store} value={storeCount.toLocaleString("en-US")} label={hero?.storeMetricLabel ?? "محل ومتجر مفهرس"} />
              <HeroMetric icon={Search} value={productCount.toLocaleString("en-US")} label={hero?.productMetricLabel ?? "منتج قابل للبحث"} />
              <HeroMetric icon={BadgeCheck} value={hero?.coverageMetricValue ?? "Iraq"} label={hero?.coverageMetricLabel ?? "محافظات وشوارع تقنية"} />
            </div>
          </div>
        </div>

        <aside className="relative z-10 hidden lg:block">
          <div className="rounded-[2.45rem] bg-border/40 p-px shadow-[0_28px_78px_-54px_rgba(23,32,23,0.36)]">
            <div className="relative overflow-hidden rounded-[calc(2.45rem-1px)] bg-card/90 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Atlas live board</p>
                  <h2 className="mt-1 font-display text-3xl font-black leading-none text-foreground">خارطة الوصول</h2>
                </div>
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-foreground text-background">
                  <TrendingUp className="h-5 w-5" strokeWidth={1.7} />
                </span>
              </div>

              <div className="relative mx-auto h-[370px] max-w-[520px]">
                <IraqSignalMap />
              </div>

              <div className="mt-5 grid gap-2.5">
                {quickRoutes.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="group flex items-center justify-between gap-4 rounded-[1.2rem] bg-white/70 px-4 py-3 text-right ring-1 ring-border/80 transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_18px_36px_-28px_rgba(23,32,23,0.35)]"
                    >
                      <span className="flex items-center gap-3">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                          <Icon className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.8} />
                        </span>
                        <span>
                          <span className="block text-sm font-bold text-foreground">{item.label}</span>
                          <span className="mt-0.5 block text-[11px] font-medium text-muted-foreground">{item.meta}</span>
                        </span>
                      </span>
                      <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1" />
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
