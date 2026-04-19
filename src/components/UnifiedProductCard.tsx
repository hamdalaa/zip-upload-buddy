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
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft-xl"
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
          <div className="absolute start-3 top-3 flex items-center gap-1 rounded-full bg-accent-rose px-2.5 py-1 text-[11px] font-bold text-white shadow-soft-md">
            <TrendingDown className="h-3 w-3" />
            وفّر حتى {savings}%
          </div>
        )}

        {/* Top-right: offer count chip */}
        <div className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-[11px] font-semibold text-foreground shadow-soft-sm backdrop-blur-sm">
          <Store className="h-3 w-3 text-primary" />
          {product.offerCount} محل
        </div>

        {/* Bottom-left: stock pill */}
        <div className="absolute bottom-3 start-3">
          {product.inStockCount > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-medium text-accent-emerald shadow-soft-sm backdrop-blur-sm">
              <CircleDot className="h-3 w-3 fill-accent-emerald text-accent-emerald" />
              متوفر بـ {product.inStockCount} محل
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-medium text-destructive shadow-soft-sm backdrop-blur-sm">
              <CircleDot className="h-3 w-3 fill-destructive text-destructive" />
              نفد من كل المحلات
            </div>
          )}
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Brand + category + rating */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {product.brand && (
              <Badge
                variant="outline"
                className="rounded-full border-border bg-surface px-2 py-0 text-[10px] font-bold uppercase tracking-wide text-foreground"
              >
                {product.brand}
              </Badge>
            )}
            {product.category && (
              <span className="text-[11px] font-medium text-muted-foreground">
                {product.category}
              </span>
            )}
          </div>
          {product.rating != null && (
            <div className="flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[11px] font-semibold text-foreground">
              <Star className="h-3 w-3 fill-warning text-warning" />
              {product.rating.toFixed(1)}
              {product.reviewCount != null && (
                <span className="text-muted-foreground">({product.reviewCount})</span>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 min-h-[2.6em] text-[15px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary">
          {product.title}
        </h3>

        {/* ===== Price block ===== */}
        <div className="flex items-end justify-between gap-3 rounded-xl bg-surface/60 px-3 py-2.5">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              يبدأ من
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-extrabold leading-none text-foreground">
                {formatIQD(product.lowestPrice ?? 0)}
              </span>
            </div>
            {product.highestPrice && product.highestPrice > (product.lowestPrice ?? 0) && (
              <span className="mt-0.5 text-[11px] text-muted-foreground line-through">
                حتى {formatIQD(product.highestPrice)}
              </span>
            )}
          </div>
          {priceSpread > 0 && (
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                فرق السعر
              </span>
              <span className="text-sm font-bold text-accent-emerald">
                {formatIQD(priceSpread)}
              </span>
            </div>
          )}
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
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
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
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-accent-emerald" />
            تحقّقت من المصدر
          </span>
        </div>
      </div>

      {/* ===== Bottom CTA strip ===== */}
      <div className="flex items-center justify-between border-t border-border bg-gradient-to-l from-primary/5 to-transparent px-4 py-2.5">
        <span className="text-[11px] font-semibold text-muted-foreground">
          قارن {product.offerCount} عرض جنب بعض
        </span>
        <span className="flex items-center gap-1 text-[12px] font-bold text-primary transition-transform group-hover:-translate-x-0.5">
          عرض التفاصيل
          <ArrowLeft className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}
