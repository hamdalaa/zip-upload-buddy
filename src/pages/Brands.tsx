import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, Globe, Home, MapPin, ShieldCheck, Sparkles, Store } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useDataStore } from "@/lib/dataStore";
import { OFFICIAL_DEALER_BRANCHES } from "@/lib/officialDealers";
import { getBrandLogo } from "@/lib/brandLogos";
import type { BrandDealer } from "@/lib/types";

const arabicNumber = new Intl.NumberFormat("ar");

interface EnrichedBrand extends BrandDealer {
  branchCount: number;
  cityCount: number;
  domainLabel: string | null;
  previewImage: string | null;
}

const formatCount = (value: number) => arabicNumber.format(value);

const getDomainLabel = (url?: string) => {
  if (!url) return null;

  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0] || null;
  }
};

const getTagline = (brand: EnrichedBrand) => {
  if (brand.branchCount > 0 && brand.cityCount > 0) {
    return `${formatCount(brand.branchCount)} فرع رسمي • ${formatCount(brand.cityCount)} مدن`;
  }

  if (brand.branchCount > 0) {
    return `${formatCount(brand.branchCount)} فرع رسمي`;
  }

  if (brand.cityCount > 0) {
    return `${formatCount(brand.cityCount)} مدن ضمن التغطية`;
  }

  return "ملف وكيل";
};

export default function Brands() {
  const { brands } = useDataStore();

  const enrichedBrands = useMemo(
    () =>
      brands
        .map<EnrichedBrand>((brand) => ({
          ...brand,
          branchCount: OFFICIAL_DEALER_BRANCHES.filter((entry) => entry.brandSlug === brand.slug).length,
          cityCount: brand.cities.length,
          domainLabel: getDomainLabel(brand.website),
          previewImage:
            OFFICIAL_DEALER_BRANCHES.find(
              (entry) => entry.brandSlug === brand.slug && entry.mainImage && entry.mainImage !== "Not found",
            )?.mainImage ?? null,
        }))
        .sort((left, right) => {
          if (right.branchCount !== left.branchCount) return right.branchCount - left.branchCount;
          if (right.cityCount !== left.cityCount) return right.cityCount - left.cityCount;
          return left.brandName.localeCompare(right.brandName);
        }),
    [brands],
  );

  const totalBranches = useMemo(
    () => enrichedBrands.reduce((sum, brand) => sum + brand.branchCount, 0),
    [enrichedBrands],
  );

  const totalCities = useMemo(
    () => new Set(enrichedBrands.flatMap((brand) => brand.cities)).size,
    [enrichedBrands],
  );

  return (
    <div className="min-h-screen flex flex-col atlas-shell">
      <TopNav />

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
                <span className="text-muted-foreground">فرع رسمي</span>
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
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
          {enrichedBrands.map((brand, idx) => {
            const logo = getBrandLogo(brand.slug);
            return (
              <Link
                key={brand.slug}
                to={`/brand/${brand.slug}`}
                className="group relative block overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_40px_-15px_hsl(var(--primary)/0.25)] hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background animate-fade-in"
                style={{
                  animationDelay: `${Math.min(idx * 50, 400)}ms`,
                  animationFillMode: "backwards",
                }}
                aria-label={`عرض ${brand.brandName} — ${getTagline(brand)}`}
              >
                <div className="relative aspect-[4/3] sm:aspect-[5/4] overflow-hidden bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_100%)]">
                  {brand.previewImage ? (
                    <img
                      src={brand.previewImage}
                      alt={brand.brandName}
                      loading={idx < 4 ? "eager" : "lazy"}
                      decoding="async"
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.1]"
                    />
                  ) : null}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, hsl(42 28% 96% / 0.22) 0%, hsl(214 24% 16% / 0.16) 34%, hsl(214 24% 14% / 0.82) 100%)",
                    }}
                    aria-hidden
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "radial-gradient(circle at 16% 16%, hsl(var(--primary) / 0.22), transparent 30%), radial-gradient(circle at 82% 20%, hsl(var(--accent) / 0.12), transparent 26%)",
                    }}
                    aria-hidden
                  />

                  <div className="absolute top-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-[0_4px_14px_-4px_hsl(0_0%_0%/0.15)] backdrop-blur-md ring-1 ring-white/10">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15">
                      <Store className="h-2.5 w-2.5 text-primary" />
                    </span>
                    <span className="tabular-nums">{formatCount(brand.branchCount)}</span>
                    <span className="font-medium text-muted-foreground">فرع</span>
                  </div>

                  <div className="absolute inset-x-0 top-0 p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div />
                      {brand.verificationStatus === "verified" && (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-[10px] font-bold text-success ring-1 ring-success/20">
                          <ShieldCheck className="h-3 w-3" />
                          موثّق
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-x-0 top-1/2 flex -translate-y-[58%] justify-center px-6">
                    <div className="flex min-h-[8.5rem] w-full max-w-[14rem] items-center justify-center rounded-[1.8rem] border border-white/22 bg-[hsl(var(--background)_/_0.84)] px-6 py-5 shadow-[0_24px_50px_-24px_hsl(214_24%_10%/0.75)] backdrop-blur-md sm:min-h-[10rem] sm:max-w-[16rem]">
                      {logo ? (
                        <img
                          src={logo}
                          alt={`${brand.brandName} logo`}
                          loading={idx < 4 ? "eager" : "lazy"}
                          decoding="async"
                          className="max-h-16 w-full object-contain transition-transform duration-500 group-hover:scale-[1.04] sm:max-h-20"
                        />
                      ) : (
                        <span className="font-display text-5xl font-extrabold text-foreground sm:text-6xl">
                          {brand.brandName.slice(0, 1)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0 flex-1 text-right">
                        <div className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-white/68">
                          {brand.domainLabel ?? "Official Dealer"}
                        </div>
                        <h3 className="mt-2 font-display text-xl font-bold text-white sm:text-2xl">
                          {brand.brandName}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-[11px] sm:text-xs text-white/82 leading-relaxed">
                          {getTagline(brand)}
                        </p>
                      </div>

                      <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.6)] ring-2 ring-white/25 transition-all duration-500 group-hover:scale-110 group-hover:-translate-x-1.5 group-hover:ring-white/40">
                        <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                    </div>
                  </div>

                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    aria-hidden
                  />
                </div>

                <div className="border-t border-border/60 px-4 py-3 text-right sm:px-5">
                  <p className="truncate text-sm font-semibold text-foreground/86">{brand.dealerName}</p>
                  <div className="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span>{formatCount(brand.cityCount)} مدن</span>
                    <span>{formatCount(brand.branchCount)} فرع</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
