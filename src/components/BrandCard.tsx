import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { BrandDealer } from "@/lib/types";
import { BRAND_LOGOS } from "@/lib/mockData";

export function BrandCard({ brand }: { brand: BrandDealer }) {
  const logo = BRAND_LOGOS[brand.brandName];

  return (
    <Link
      to={`/brand/${brand.slug}`}
      className="group card-elevate relative overflow-hidden rounded-[1.75rem] border border-border/75 bg-card/92 p-4 shadow-soft-lg sm:p-5"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent" />
      <div className="pointer-events-none absolute -left-14 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-primary/14 blur-3xl" />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex h-[4.5rem] w-[4.5rem] shrink-0 items-center justify-center overflow-hidden rounded-[1.35rem] border border-border/75 bg-background p-3 shadow-soft">
          {logo ? (
            <img src={logo} alt={brand.brandName} loading="lazy" width={72} height={72} className="h-full w-full object-contain" />
          ) : (
            <span className="font-display text-2xl font-bold text-foreground">{brand.brandName.slice(0, 1)}</span>
          )}
        </div>

        <div className="relative min-w-0 flex-1 text-right">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-display text-2xl font-bold leading-none text-foreground">{brand.brandName}</h3>
            {brand.verificationStatus === "verified" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[10px] font-bold text-success">
                <ShieldCheck className="h-3.5 w-3.5" />
                رسمي
              </span>
            )}
          </div>

          <p className="mt-2 text-sm font-semibold text-foreground/72">{brand.dealerName}</p>
          <p className="mt-3 line-clamp-2 text-xs leading-6 text-muted-foreground">{brand.coverage}</p>
        </div>

        <div className="relative flex items-center justify-between gap-3 border-t border-border/60 pt-3 text-right sm:flex-col sm:items-end sm:justify-start sm:border-t-0 sm:pt-0">
          <div className="rounded-[1rem] border border-border/75 bg-background px-3 py-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">مدن</div>
            <div className="mt-1 font-display text-2xl font-bold leading-none text-foreground">
              {brand.cities.length.toLocaleString("ar")}
            </div>
          </div>
          <ArrowLeft className="icon-nudge-x h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-accent" />
        </div>
      </div>
    </Link>
  );
}
