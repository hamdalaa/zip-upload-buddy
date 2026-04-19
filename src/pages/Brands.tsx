import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Home, MapPin, ShieldCheck, Sparkles, Store } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useDataStore } from "@/lib/dataStore";
import { OFFICIAL_DEALER_BRANCHES } from "@/lib/officialDealers";
import { getBrandLogo, getTheSvgUrl } from "@/lib/brandLogos";
import { getBrandBackground } from "@/lib/brandBackgrounds";
import type { BrandDealer } from "@/lib/types";

const arabicNumber = new Intl.NumberFormat("ar");
const formatCount = (value: number) => arabicNumber.format(value);

interface EnrichedBrand extends BrandDealer {
  branchCount: number;
  cityCount: number;
  previewImage: string | null;
}

const getTagline = (brand: EnrichedBrand): string => {
  if (brand.branchCount > 0 && brand.cityCount > 0) {
    return `${formatCount(brand.branchCount)} فرع رسمي • ${formatCount(brand.cityCount)} مدن`;
  }
  if (brand.branchCount > 0) return `${formatCount(brand.branchCount)} فرع رسمي`;
  if (brand.cityCount > 0) return `${formatCount(brand.cityCount)} مدن ضمن التغطية`;
  return "وكيل رسمي معتمد";
};

export default function Brands() {
  const { brands } = useDataStore();

  const enrichedBrands = useMemo<EnrichedBrand[]>(
    () =>
      brands
        .map((brand) => ({
          ...brand,
          branchCount: OFFICIAL_DEALER_BRANCHES.filter((entry) => entry.brandSlug === brand.slug).length,
          cityCount: brand.cities.length,
          previewImage:
            getBrandBackground(brand.slug) ??
            OFFICIAL_DEALER_BRANCHES.find(
              (entry) => entry.brandSlug === brand.slug && entry.mainImage && entry.mainImage !== "Not found",
            )?.mainImage ?? null,
        }))
        .sort((a, b) => {
          if (b.branchCount !== a.branchCount) return b.branchCount - a.branchCount;
          if (b.cityCount !== a.cityCount) return b.cityCount - a.cityCount;
          return a.brandName.localeCompare(b.brandName);
        }),
    [brands],
  );

  const totalBranches = useMemo(
    () => enrichedBrands.reduce((sum, b) => sum + b.branchCount, 0),
    [enrichedBrands],
  );

  const totalCities = useMemo(
    () => new Set(enrichedBrands.flatMap((b) => b.cities)).size,
    [enrichedBrands],
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
          <span className="text-foreground font-semibold">وكلاء البراندات</span>
        </div>
      </div>

      {/* Hero — same structure as /iraq */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" aria-hidden />
        <div className="absolute inset-0 bg-grid opacity-30" aria-hidden />
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.20), transparent 70%)" }}
          aria-hidden
        />

        <div className="container relative py-10 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-[11px] font-bold text-primary shadow-[0_4px_18px_-6px_hsl(var(--primary)/0.4)] backdrop-blur-sm">
              <Sparkles className="h-3 w-3" />
              <span className="tracking-wide">دليل البراندات الرسمية</span>
            </div>

            <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.95] tracking-tight text-foreground sm:text-5xl md:text-6xl">
              وكلاء <span className="text-primary">البراندات</span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
              اختار البراند وادخل مباشرة على صفحة الوكيل والفروع الرسمية والتغطية داخل العراق.
            </p>

            {/* Stat chips */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <div className="group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-3.5 py-2 text-xs font-semibold shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.25)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                </span>
                <span className="text-foreground tabular-nums">{formatCount(enrichedBrands.length)}</span>
                <span className="text-muted-foreground">براند</span>
              </div>
              <div className="group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-3.5 py-2 text-xs font-semibold shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] backdrop-blur-sm transition-all hover:border-accent/40 hover:shadow-[0_6px_20px_-6px_hsl(var(--accent)/0.25)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent/15">
                  <Store className="h-3 w-3 text-accent" />
                </span>
                <span className="text-foreground tabular-nums">{formatCount(totalBranches)}</span>
                <span className="text-muted-foreground">فرع</span>
              </div>
              <div className="group inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/90 px-3.5 py-2 text-xs font-semibold shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.25)]">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15">
                  <MapPin className="h-3 w-3 text-primary" />
                </span>
                <span className="text-foreground tabular-nums">{formatCount(totalCities)}</span>
                <span className="text-muted-foreground">مدن</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 container py-6 md:py-10">
        {enrichedBrands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">ماكو براندات حالياً.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {enrichedBrands.map((brand, idx) => {
              const img = brand.previewImage;
              const logo = getTheSvgUrl(brand.slug, "default") ?? getBrandLogo(brand.slug);
              const tagline = getTagline(brand);
              const isVerified = brand.verificationStatus === "verified";

              return (
                <Link
                  key={brand.slug}
                  to={`/brand/${brand.slug}`}
                  className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_hsl(var(--primary)/0.25)] hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background animate-fade-in"
                  style={{
                    animationDelay: `${Math.min(idx * 50, 400)}ms`,
                    animationFillMode: "backwards",
                  }}
                  aria-label={`عرض ${brand.brandName} — ${tagline}`}
                >
                  <div className="relative aspect-[4/3] sm:aspect-[5/4] overflow-hidden bg-muted">
                    {img ? (
                      <img
                        src={img}
                        alt={brand.brandName}
                        loading={idx < 4 ? "eager" : "lazy"}
                        decoding="async"
                        width={1024}
                        height={768}
                        className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.12]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30" aria-hidden />
                    )}

                    {/* Premium multi-stop overlay — same as /iraq */}
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

                    {/* Top-right branch count badge */}
                    <div className="absolute top-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-[0_4px_14px_-4px_hsl(0_0%_0%/0.3)] backdrop-blur-md ring-1 ring-white/10">
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15">
                        <Store className="h-2.5 w-2.5 text-primary" />
                      </span>
                      <span className="tabular-nums">{formatCount(brand.branchCount)}</span>
                      <span className="font-medium text-muted-foreground">فرع</span>
                    </div>

                    {/* Top-left verified pill */}
                    {isVerified && (
                      <div className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full bg-success px-2 py-1 text-[10px] font-bold text-white shadow-[0_4px_14px_-4px_hsl(0_0%_0%/0.3)] backdrop-blur-md ring-1 ring-white/20">
                        <ShieldCheck className="h-3 w-3" />
                        موثّق
                      </div>
                    )}

                    {/* Bottom block — clean lockup: logo chip + name + tagline */}
                    <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                      <div className="flex items-end justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {/* Compact logo chip */}
                          <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/95 p-2 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.6)] ring-1 ring-white/20 backdrop-blur-sm transition-transform duration-500 group-hover:scale-105">
                            {logo ? (
                              <img
                                src={logo}
                                alt={`${brand.brandName} logo`}
                                loading={idx < 4 ? "eager" : "lazy"}
                                decoding="async"
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <span className="font-display text-lg font-bold text-foreground">
                                {brand.brandName.slice(0, 1)}
                              </span>
                            )}
                          </div>

                          {/* Name + tagline */}
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-display text-lg sm:text-xl font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                              {brand.brandName}
                            </h3>
                            <p className="mt-0.5 line-clamp-1 text-[11px] sm:text-xs font-medium text-white/85">
                              {tagline}
                            </p>
                          </div>
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

        <p className="mt-8 text-center text-xs text-muted-foreground">
          * كل البراندات هنا وكلاء رسميون داخل العراق.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
