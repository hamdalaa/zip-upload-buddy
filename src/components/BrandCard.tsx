import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Sparkles } from "lucide-react";
import type { BrandDealer } from "@/lib/types";
import { useBrandLogo } from "@/hooks/useBrandLogo";

export function BrandCard({ brand }: { brand: BrandDealer }) {
  const logo = useBrandLogo(brand.slug, brand.brandName, "default");
  const isVerified = brand.verificationStatus === "verified";

  return (
    <Link
      to={`/brand/${brand.slug}`}
      className="group atlas-card tilt-3d relative flex flex-col overflow-hidden p-5 text-right shadow-soft-md"
    >
      {isVerified && (
        <span className="ribbon ribbon-violet">
          <Sparkles className="h-3 w-3" />
          وكيل
        </span>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-gradient-to-br from-violet-soft to-card p-2.5 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
          {logo ? (
            <img src={logo} alt={brand.brandName} loading="lazy" width={56} height={56} className="h-full w-full object-contain" />
          ) : (
            <span className="font-display text-2xl font-semibold text-foreground">{brand.brandName.slice(0, 1)}</span>
          )}
        </div>

        <div className="text-right">
          <div className="font-numeric tabular-nums text-2xl font-semibold leading-none text-foreground sm:text-3xl">
            {brand.cities.length.toLocaleString("ar")}
          </div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">مدينة</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-balance text-xl font-semibold leading-tight text-foreground transition-colors group-hover:text-violet sm:text-2xl">{brand.brandName}</h3>
          {isVerified && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-soft px-2 py-0.5 text-[10px] font-semibold text-emerald">
              <ShieldCheck className="h-3 w-3" />
              رسمي
            </span>
          )}
        </div>

        <p className="mt-2 text-sm font-medium text-foreground/72">{brand.dealerName}</p>
        <p className="mt-2 line-clamp-2 text-pretty text-xs leading-6 text-muted-foreground">{brand.coverage}</p>
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground group-hover:text-violet transition-colors">
          عرض الوكيل
        </span>
        <ArrowLeft className="icon-nudge-x h-4 w-4 text-muted-foreground group-hover:text-violet" />
      </div>
    </Link>
  );
}
