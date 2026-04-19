import { Link } from "react-router-dom";
import {
  Store,
  TrendingDown,
  Package,
  ShieldCheck,
  Star,
  Award,
  ArrowLeft,
  Tag,
  CircleDot,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatIQD, type UnifiedProduct } from "@/lib/unifiedSearch";

interface Props {
  product: UnifiedProduct;
  /** Optional preview of top offers — shown as compact compare strip */
  topOffers?: { storeName: string; price: number; verified?: boolean; officialDealer?: boolean }[];
}

export function UnifiedProductCard({ product, topOffers }: Props) {
  const savings =
    product.highestPrice && product.lowestPrice && product.highestPrice > product.lowestPrice
      ? Math.round(((product.highestPrice - product.lowestPrice) / product.highestPrice) * 100)
      : 0;

  const priceSpread =
    product.highestPrice && product.lowestPrice ? product.highestPrice - product.lowestPrice : 0;

  const inStockRatio =
    product.offerCount > 0 ? Math.round((product.inStockCount / product.offerCount) * 100) : 0;

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-soft-xl"
    >
      {/* ===== Image area ===== */}
      <div className="relative aspect-[4/3] overflow-hidden bg-surface">
        <img
          src={product.images[0]}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Top-left: discount badge */}
        {savings > 5 && (
          <div className="absolute start-2 top-2 flex items-center gap-0.5 rounded-full bg-accent-rose px-2 py-0.5 text-[10px] font-bold text-white shadow-soft-md sm:start-3 sm:top-3 sm:gap-1 sm:px-2.5 sm:py-1 sm:text-[11px]">
            <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            <span>-{savings}%</span>
          </div>
        )}

        {/* Top-right: offer count chip */}
        <div className="absolute end-2 top-2 flex items-center gap-0.5 rounded-full bg-card/95 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-soft-sm backdrop-blur-sm sm:end-3 sm:top-3 sm:gap-1 sm:px-2 sm:py-1 sm:text-[11px]">
          <Store className="h-2.5 w-2.5 text-primary sm:h-3 sm:w-3" />
          {product.offerCount}
        </div>

        {/* Bottom-left: stock pill */}
        <div className="absolute bottom-2 start-2 sm:bottom-3 sm:start-3">
          {product.inStockCount > 0 ? (
            <div className="flex items-center gap-1 rounded-full bg-card/95 px-1.5 py-0.5 text-[10px] font-medium text-accent-emerald shadow-soft-sm backdrop-blur-sm sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px]">
              <CircleDot className="h-2.5 w-2.5 fill-accent-emerald text-accent-emerald sm:h-3 sm:w-3" />
              <span className="sm:hidden">{product.inStockCount} متوفر</span>
              <span className="hidden sm:inline">متوفر بـ {product.inStockCount} محل</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-full bg-card/95 px-1.5 py-0.5 text-[10px] font-medium text-destructive shadow-soft-sm backdrop-blur-sm sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-[11px]">
              <CircleDot className="h-2.5 w-2.5 fill-destructive text-destructive sm:h-3 sm:w-3" />
              نفد
            </div>
          )}
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="flex flex-1 flex-col gap-2 p-2.5 sm:gap-3 sm:p-4">
        {/* Brand on the start, category on the end (rating removed). */}
        <div className="flex items-center justify-between gap-2">
          {product.brand ? (
            <Badge
              variant="outline"
              className="rounded-full border-border bg-surface px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-foreground sm:px-2 sm:text-[10px]"
            >
              {product.brand}
            </Badge>
          ) : <span />}
          {product.category && (
            <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
              {product.category}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-[15px]">
          {product.title}
        </h3>

        {/* ===== Price block ===== */}
        <div className="flex items-end justify-between gap-3 rounded-lg bg-surface/60 px-2 py-2 sm:rounded-xl sm:px-3 sm:py-2.5">
          <div className="flex flex-col">
            <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground sm:text-[10px]">
              يبدأ من
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-extrabold leading-none text-foreground sm:text-xl">
                {formatIQD(product.lowestPrice ?? 0)}
              </span>
            </div>
          </div>
        </div>

        {/* ===== Top offers preview (compact compare strip) ===== */}
        {topOffers && topOffers.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2">
            {topOffers.slice(0, 3).map((o, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between gap-2 text-[12px]"
              >
                <div className="flex min-w-0 items-center gap-1.5">
                  {o.officialDealer ? (
                    <Award className="h-3 w-3 shrink-0 text-primary" />
                  ) : o.verified ? (
                    <ShieldCheck className="h-3 w-3 shrink-0 text-accent-emerald" />
                  ) : (
                    <Store className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-medium text-foreground">{o.storeName}</span>
                </div>
                <span
                  className={
                    idx === 0
                      ? "shrink-0 font-bold text-accent-emerald"
                      : "shrink-0 font-semibold text-foreground"
                  }
                >
                  {formatIQD(o.price)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* ===== Trust meta row ===== */}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-muted-foreground sm:gap-x-3 sm:text-[11px]">
          {inStockRatio > 0 && (
            <span className="flex items-center gap-1">
              <Package className="h-3 w-3 text-accent-emerald" />
              {inStockRatio}% توفر
            </span>
          )}
          <span className="flex items-center gap-1">
            <Tag className="h-3 w-3 text-primary" />
            {product.offerCount} عرض
          </span>
          <span className="hidden items-center gap-1 sm:flex">
            <ShieldCheck className="h-3 w-3 text-accent-emerald" />
            تحقّقت من المصدر
          </span>
        </div>
      </div>

      {/* ===== Bottom CTA strip ===== */}
      <div className="flex items-center justify-between border-t border-border bg-gradient-to-l from-primary/5 to-transparent px-2.5 py-2 sm:px-4 sm:py-2.5">
        <span className="hidden text-[11px] font-semibold text-muted-foreground sm:inline">
          قارن {product.offerCount} عرض جنب بعض
        </span>
        <span className="text-[11px] font-semibold text-muted-foreground sm:hidden">
          قارن {product.offerCount} عرض
        </span>
        <span className="flex items-center gap-1 text-[11px] font-bold text-primary transition-transform group-hover:-translate-x-0.5 sm:text-[12px]">
          عرض التفاصيل
          <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
        </span>
      </div>
    </Link>
  );
}
