import { Link } from "react-router-dom";
import { ArrowLeft, MapPin, Search, ShieldCheck } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";
import { HeroSearch } from "@/components/HeroSearch";
import { useDataStore } from "@/lib/dataStore";
import { SUGGESTED_QUERIES } from "@/lib/search";
import { CITIES } from "@/lib/cityData";

const supportPoints = [
  {
    icon: Search,
    label: "بحث واحد بدل خمس نوافذ",
    note: "ابدأ من الموديل أو من الشارع وتابع من نفس الواجهة.",
  },
  {
    icon: ShieldCheck,
    label: "ثقة أوضح قبل الاتصال",
    note: "التوثيق والتقييم والوكلاء الرسميون ظاهرون من أول نظرة.",
  },
  {
    icon: MapPin,
    label: "وصول مباشر بلا لف",
    note: "خرائط Google وروابط المحلات جاهزة ضمن نفس المسار.",
  },
];

export function HeroBanner() {
  const { shops, brands } = useDataStore();
  const activeShops = shops.filter((shop) => !shop.archivedAt).length;

  const marketEntries = [
    {
      title: "شارع الصناعة",
      note: "حاسبات، قطع، شبكات، وطابعات.",
      to: "/sinaa",
    },
    {
      title: "شارع الربيعي",
      note: "هواتف، شواحن، وإكسسوارات.",
      to: "/rubaie",
    },
    {
      title: "كل العراق",
      note: "نفس التجربة عبر المحافظات والمدن.",
      to: "/iraq",
    },
  ];

  const stats = [
    { value: activeShops.toLocaleString("ar"), label: "محل فعّال" },
    { value: brands.length.toLocaleString("ar"), label: "وكيل وبراند" },
    { value: CITIES.length.toLocaleString("ar"), label: "محافظة" },
  ];

  return (
    <section className="relative isolate overflow-hidden bg-secondary text-secondary-foreground">
      <img src={heroBg} alt="" loading="eager" className="absolute inset-0 h-full w-full object-cover ken-burns" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(213_34%_14%_/_0.9)_0%,hsl(213_34%_14%_/_0.72)_38%,hsl(213_34%_14%_/_0.92)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)_/_0.2),transparent_24%),radial-gradient(circle_at_18%_80%,hsl(var(--accent)_/_0.18),transparent_24%)]" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />

      <div className="container relative py-7 md:py-10 lg:py-14">
        <div className="grid gap-8 lg:min-h-[calc(100dvh-8rem)] lg:grid-cols-[minmax(0,1.12fr)_340px] lg:items-end">
          <div className="max-w-4xl text-right">
            <div className="atlas-kicker text-secondary-foreground">
              Iraqi Electronics Wayfinding
            </div>

            <h1 className="font-display mt-6 text-[clamp(3.2rem,8vw,7rem)] font-bold leading-[0.86] text-secondary-foreground">
              تايه
              <span className="block text-[0.56em] text-primary">الدليل اللي يوصلك للمحل الصح أسرع</span>
            </h1>

            <p className="mt-5 max-w-[62ch] text-sm leading-8 text-secondary-foreground/78 md:text-base">
              دليل ميداني لسوق الإلكترونيات العراقي. دوّر على المنتج، افحص الثقة، اعرف أقرب شارع أو محافظة،
              ثم افتح صفحة المحل أو الخرائط مباشرة بدون تشتت بين نتائج متفرقة.
            </p>

            <div className="mt-8 grid gap-3 border-y border-white/10 py-4 md:grid-cols-3 md:gap-4 md:py-5">
              {supportPoints.map((point) => (
                <div
                  key={point.label}
                  className="rounded-[1.2rem] border border-white/10 bg-white/6 p-3 text-right md:rounded-none md:border-0 md:bg-transparent md:p-0"
                >
                  <div className="flex items-start gap-3 md:block">
                    <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-primary">
                      <point.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-bold leading-tight text-secondary-foreground md:mt-4 md:text-2xl">
                        {point.label}
                      </h2>
                      <p className="mt-1.5 text-xs leading-6 text-secondary-foreground/72 md:mt-2">{point.note}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 max-w-4xl">
              <HeroSearch />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:hidden">
              {marketEntries.map((entry) => (
                <Link
                  key={entry.title}
                  to={entry.to}
                  className="group flex items-center justify-between gap-3 rounded-[1.3rem] border border-white/12 bg-white/8 px-4 py-3 text-right transition-colors hover:border-primary/35 hover:bg-white/12"
                >
                  <div>
                    <div className="font-display text-lg font-bold leading-none text-secondary-foreground">{entry.title}</div>
                    <div className="mt-1.5 text-[11px] leading-5 text-secondary-foreground/68">{entry.note}</div>
                  </div>
                  <ArrowLeft className="icon-nudge-x h-4 w-4 shrink-0 text-secondary-foreground/56 transition-colors group-hover:text-primary" />
                </Link>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 lg:hidden">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[1.1rem] border border-white/10 bg-white/8 px-3 py-3 text-center">
                  <div className="font-display text-2xl font-bold leading-none text-secondary-foreground">{stat.value}</div>
                  <div className="mt-1.5 text-[11px] leading-5 text-secondary-foreground/62">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-secondary-foreground/68">
              <span className="font-semibold text-secondary-foreground/82">الأكثر بحثاً:</span>
              {SUGGESTED_QUERIES.slice(0, 5).map((query) => (
                <Link
                  key={query}
                  to={`/results?q=${encodeURIComponent(query)}`}
                  className="rounded-full border border-white/14 bg-white/8 px-3 py-1.5 font-semibold text-secondary-foreground/84 transition-colors hover:border-primary/45 hover:text-secondary-foreground"
                >
                  {query}
                </Link>
              ))}
            </div>
          </div>

          <aside className="hidden self-end rounded-[2rem] border border-white/12 bg-[linear-gradient(180deg,hsl(213_28%_16%_/_0.84),hsl(213_32%_13%_/_0.9))] p-6 text-right text-secondary-foreground shadow-[0_30px_80px_-45px_rgba(5,12,20,0.8)] backdrop-blur lg:block">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground/55">
              ابدأ من أين؟
            </div>

            <div className="mt-5 space-y-3">
              {marketEntries.map((entry) => (
                <Link
                  key={entry.title}
                  to={entry.to}
                  className="group flex items-start justify-between gap-4 rounded-[1.3rem] border border-white/10 bg-white/6 px-4 py-4 transition-colors hover:border-primary/35 hover:bg-white/9"
                >
                  <div>
                    <div className="font-display text-2xl font-bold leading-none text-secondary-foreground">
                      {entry.title}
                    </div>
                    <div className="mt-2 text-xs leading-6 text-secondary-foreground/68">{entry.note}</div>
                  </div>
                  <ArrowLeft className="icon-nudge-x mt-1 h-4 w-4 shrink-0 text-secondary-foreground/56 transition-colors group-hover:text-primary" />
                </Link>
              ))}
            </div>

            <div className="mt-6 grid grid-cols-3 gap-2 border-t border-white/10 pt-5">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-[1.2rem] bg-white/6 px-3 py-4 text-center">
                  <div className="font-display text-3xl font-bold leading-none text-secondary-foreground">{stat.value}</div>
                  <div className="mt-2 text-[11px] leading-5 text-secondary-foreground/62">{stat.label}</div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
