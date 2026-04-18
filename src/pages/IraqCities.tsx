import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Home, MapPin, Sparkles, Store } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { CITIES } from "@/lib/cityData";

// Local, optimized landmark images (generated)
import baghdadImg from "@/assets/cities/baghdad.jpg";
import erbilImg from "@/assets/cities/erbil.jpg";
import basraImg from "@/assets/cities/basra.jpg";
import najafImg from "@/assets/cities/najaf.jpg";
import karbalaImg from "@/assets/cities/karbala.jpg";
import mosulImg from "@/assets/cities/mosul.jpg";
import sulaymaniyahImg from "@/assets/cities/sulaymaniyah.jpg";
import baqubahImg from "@/assets/cities/baqubah.jpg";
import kirkukImg from "@/assets/cities/kirkuk.jpg";
import nasiriyahImg from "@/assets/cities/nasiriyah.jpg";

const CITY_IMAGES: Record<string, string> = {
  baghdad: baghdadImg,
  erbil: erbilImg,
  basra: basraImg,
  najaf: najafImg,
  karbala: karbalaImg,
  mosul: mosulImg,
  sulaymaniyah: sulaymaniyahImg,
  baqubah: baqubahImg,
  kirkuk: kirkukImg,
  nasiriyah: nasiriyahImg,
};

// Short descriptive tagline per city — gives the page a guided, friendly feel.
const CITY_TAGLINE: Record<string, string> = {
  baghdad: "العاصمة • أكبر تجمع للمحلات",
  erbil: "عاصمة كردستان • أسواق حديثة",
  basra: "بوابة الجنوب • محلات الكورنيش",
  najaf: "مدينة العلم • أسواق نشطة",
  karbala: "مدينة الزائرين • تشكيلة واسعة",
  mosul: "عروس الشمال • نهضة تجارية",
  sulaymaniyah: "جوهرة كردستان • تكنولوجيا حديثة",
  baqubah: "ديالى • محلات محلية مميزة",
  kirkuk: "ملتقى الثقافات • أسواق متنوعة",
  nasiriyah: "ذي قار • تراث وحداثة",
};

export default function IraqCities() {
  const total = useMemo(
    () => CITIES.reduce((sum, c) => sum + c.count, 0),
    [],
  );

  const filtered = useMemo(
    () => [...CITIES].sort((a, b) => b.count - a.count),
    [],
  );

  return (
    <div className="min-h-screen flex flex-col atlas-shell">
      <TopNav />

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <div className="container py-2.5 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
            <Home className="h-3 w-3" />
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground font-semibold">كل محلات العراق</span>
        </div>
      </div>

      {/* Hero — premium */}
      <section className="relative overflow-hidden border-b border-border">
        {/* Layered backgrounds */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
        {/* Soft radial glow */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.20), transparent 70%)" }}
          aria-hidden
        />

        <div className="container relative py-10 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[11px] font-bold text-primary shadow-[0_4px_18px_-6px_hsl(var(--primary)/0.4)] backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              <span className="tracking-wide">دليل وطني شامل</span>
            </div>

            <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.95] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              كل محلات <span className="text-primary">العراق</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              اختار محافظتك وشوف أقرب محلات الإلكترونيات إلك — صور حقيقية،
              تقييمات، مواعيد، وأرقام تواصل مباشرة.
            </p>

            {/* Stat chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <div className="group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-3.5 py-2 text-xs font-semibold shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.25)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                  <Store className="h-3 w-3 text-primary" />
                </span>
                <span className="text-foreground tabular-nums">
                  {total.toLocaleString("ar")}
                </span>
                <span className="text-muted-foreground">محل</span>
              </div>
              <div className="group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-3.5 py-2 text-xs font-semibold shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] backdrop-blur-sm transition-all hover:border-accent/40 hover:shadow-[0_6px_20px_-6px_hsl(var(--accent)/0.25)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15">
                  <MapPin className="h-3 w-3 text-accent" />
                </span>
                <span className="text-foreground tabular-nums">{CITIES.length}</span>
                <span className="text-muted-foreground">محافظات</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      <main className="flex-1 container py-6 md:py-10">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              ما لكينا محافظة بهذا الاسم. جرّب اسم ثاني.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c, idx) => {
              const img = CITY_IMAGES[c.slug];
              const tagline = CITY_TAGLINE[c.slug];
              return (
                <Link
                  key={c.slug}
                  to={`/city/${c.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_hsl(var(--primary)/0.25)] hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background animate-fade-in"
                  style={{
                    animationDelay: `${Math.min(idx * 50, 400)}ms`,
                    animationFillMode: "backwards",
                  }}
                  aria-label={`عرض محلات ${c.cityAr} — ${c.count} محل`}
                >
                  <div className="relative aspect-[4/3] sm:aspect-[5/4] overflow-hidden bg-muted">
                    {img && (
                      <img
                        src={img}
                        alt={`معلم من ${c.cityAr}`}
                        loading={idx < 4 ? "eager" : "lazy"}
                        decoding="async"
                        width={1024}
                        height={768}
                        className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.12]"
                      />
                    )}

                    {/* Premium multi-stop overlay */}
                    <div
                      className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 via-40% to-transparent"
                      aria-hidden
                    />
                    {/* Subtle vignette */}
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{ background: "radial-gradient(ellipse at center, transparent 50%, hsl(0 0% 0% / 0.35) 100%)" }}
                      aria-hidden
                    />

                    {/* Top-right count badge */}
                    <div className="absolute top-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-[0_4px_14px_-4px_hsl(0_0%_0%/0.3)] backdrop-blur-md ring-1 ring-white/10">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15">
                        <Store className="h-2.5 w-2.5 text-primary" />
                      </span>
                      <span className="tabular-nums">{c.count.toLocaleString("ar")}</span>
                      <span className="font-medium text-muted-foreground">محل</span>
                    </div>

                    {/* Bottom block */}
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <div className="flex items-end justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/70">
                            <MapPin className="h-3 w-3" />
                            محافظة
                          </div>
                          <h3 className="mt-1.5 font-display text-2xl sm:text-[1.75rem] font-extrabold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.5)]">
                            {c.cityAr}
                          </h3>
                          {tagline && (
                            <p className="mt-1.5 line-clamp-1 text-[11px] sm:text-xs text-white/80 leading-relaxed">
                              {tagline}
                            </p>
                          )}
                        </div>
                        <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.6)] ring-2 ring-white/25 transition-all duration-500 group-hover:scale-110 group-hover:-translate-x-1.5 group-hover:ring-white/40">
                          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                      </div>
                    </div>

                    {/* Top hairline highlight */}
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      aria-hidden
                    />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Helpful hint */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          * بغداد (شارع الصناعة + الربيعي) لها صفحات مفصّلة بالرئيسية.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
