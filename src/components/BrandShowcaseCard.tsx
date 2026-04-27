import { Link } from "react-router-dom";
import { ChevronLeft, ShieldCheck, Store } from "lucide-react";
import type { BrandDealer } from "@/lib/types";
import { OFFICIAL_DEALER_BRANCHES } from "@/lib/officialDealers";
import { getBrandBackground } from "@/lib/brandBackgrounds";
import { useBrandLogo } from "@/hooks/useBrandLogo";

const arabicNumber = new Intl.NumberFormat("ar");
const formatCount = (value: number) => arabicNumber.format(value);

interface Props {
  brand: BrandDealer;
  index?: number;
}

/** Premium image-led brand card — same DNA as /brands page. */
export function BrandShowcaseCard({ brand, index = 0 }: Props) {
  const branchCount = OFFICIAL_DEALER_BRANCHES.filter((entry) => entry.brandSlug === brand.slug).length;
  const cityCount = brand.cities.length;
  const previewImage =
    getBrandBackground(brand.slug) ??
    OFFICIAL_DEALER_BRANCHES.find(
      (entry) => entry.brandSlug === brand.slug && entry.mainImage && entry.mainImage !== "Not found",
    )?.mainImage ??
    null;
  const logo = useBrandLogo(brand.slug, brand.brandName, "default");
  const isVerified = brand.verificationStatus === "verified";

  const tagline = (() => {
    if (branchCount > 0 && cityCount > 0) {
      return `${formatCount(branchCount)} فرع رسمي • ${formatCount(cityCount)} مدن`;
    }
    if (branchCount > 0) return `${formatCount(branchCount)} فرع رسمي`;
    if (cityCount > 0) return `${formatCount(cityCount)} مدن ضمن التغطية`;
    return "وكيل رسمي معتمد";
  })();

  return (
    <Link
      to={`/brand/${brand.slug}`}
      className="group relative block h-full overflow-hidden rounded-2xl border border-border/70 bg-card shadow-[0_2px_10px_-4px_hsl(220_30%_20%/0.08)] transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-500 hover:-translate-y-1.5 hover:border-primary/50 hover:shadow-[0_20px_40px_-15px_hsl(var(--primary)/0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`عرض ${brand.brandName} — ${tagline}`}
    >
      <div className="relative aspect-[4/3] sm:aspect-[5/4] overflow-hidden bg-muted">
        {previewImage ? (
          <img
            src={previewImage}
            alt={brand.brandName}
            loading={index < 3 ? "eager" : "lazy"}
            decoding="async"
            width={1024}
            height={768}
            className="h-full w-full object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.12]"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-secondary/20 to-accent/30" aria-hidden />
        )}

        {/* Multi-stop overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 via-40% to-transparent" aria-hidden />
        <div
          className="absolute inset-0 opacity-60"
          style={{ background: "radial-gradient(ellipse at center, transparent 50%, hsl(0 0% 0% / 0.35) 100%)" }}
          aria-hidden
        />

        {/* Branch count badge */}
        <div className="absolute top-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1.5 text-[11px] font-bold text-foreground shadow-[0_4px_14px_-4px_hsl(0_0%_0%/0.3)] backdrop-blur-md ring-1 ring-white/10">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary/15">
            <Store className="h-2.5 w-2.5 text-primary" />
          </span>
          <span className="tabular-nums">{formatCount(branchCount)}</span>
          <span className="font-medium text-muted-foreground">فرع</span>
        </div>

        {isVerified && (
          <div className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full bg-success px-2 py-1 text-[10px] font-bold text-white shadow-[0_4px_14px_-4px_hsl(0_0%_0%/0.3)] backdrop-blur-md ring-1 ring-white/20">
            <ShieldCheck className="h-3 w-3" />
            موثّق
          </div>
        )}

        {/* Bottom lockup: logo + name + tagline + arrow */}
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-black p-2 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.6)] ring-1 ring-white/15 backdrop-blur-sm transition-transform duration-500 group-hover:scale-105">
                {logo ? (
                  <img
                    src={logo}
                    alt={`${brand.brandName} logo`}
                    loading={index < 3 ? "eager" : "lazy"}
                    decoding="async"
                    className={`h-full w-full object-contain ${brand.slug === "anker" ? "" : "brightness-0 invert"}`}
                  />
                ) : (
                  <span className="font-display text-lg font-bold text-white">
                    {brand.brandName.slice(0, 1)}
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="truncate font-display text-lg sm:text-xl font-bold leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                  {brand.brandName}
                </h3>
                <p className="mt-0.5 line-clamp-1 text-[11px] sm:text-xs font-medium text-white/85">
                  {tagline}
                </p>
              </div>
            </div>

            <div className="flex h-10 w-10 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.6)] ring-2 ring-white/25 transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-500 group-hover:scale-110 group-hover:-translate-x-1.5 group-hover:ring-white/40">
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
          </div>
        </div>

        {/* Top hairline */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"
          aria-hidden
        />
      </div>
    </Link>
  );
}
