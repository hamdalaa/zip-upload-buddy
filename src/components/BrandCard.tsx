import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { BrandDealer } from "@/lib/types";
import { BRAND_LOGOS } from "@/lib/mockData";

export function BrandCard({ brand }: { brand: BrandDealer }) {
  const logo = BRAND_LOGOS[brand.brandName];

  return (
    <Link
      to={`/brand/${brand.slug}`}
      className="group atlas-card flex flex-col text-right p-5"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-border bg-background p-2">
          {logo ? (
            <img src={logo} alt={brand.brandName} loading="lazy" width={56} height={56} className="h-full w-full object-contain" />
          ) : (
            <span className="font-display text-2xl font-bold text-foreground">{brand.brandName.slice(0, 1)}</span>
          )}
        </div>

        <div className="text-right">
          <div className="font-numeric text-3xl font-bold leading-none text-foreground">
            {brand.cities.length.toLocaleString("ar")}
          </div>
          <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">مدينة</div>
        </div>
      </div>

      <div className="mt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-2xl font-bold leading-tight text-foreground">{brand.brandName}</h3>
          {brand.verificationStatus === "verified" && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
              رسمي
            </span>
          )}
        </div>

        <p className="mt-2 text-sm font-semibold text-foreground/72">{brand.dealerName}</p>
        <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">{brand.coverage}</p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground group-hover:text-primary">
          عرض الوكيل
        </span>
        <ArrowLeft className="icon-nudge-x h-4 w-4 text-muted-foreground group-hover:text-primary" />
      </div>
    </Link>
  );
}
