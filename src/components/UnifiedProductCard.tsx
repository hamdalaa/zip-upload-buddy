import { Link } from "react-router-dom";
import { ArrowLeft, Store, ShieldCheck, Award, TrendingDown } from "lucide-react";
import { StarRating } from "./StarRating";
import { formatIQD, type UnifiedProduct } from "@/lib/unifiedSearch";

interface TopOfferPreview {
  storeName: string;
  price: number;
  verified?: boolean;
  officialDealer?: boolean;
}

interface Props {
  product: UnifiedProduct;
  /** Optional preview of top offers — shown as compact compare strip */
  topOffers?: TopOfferPreview[];
}

export function UnifiedProductCard({ product, topOffers }: Props) {
  const savings =
    product.highestPrice && product.lowestPrice && product.highestPrice > product.lowestPrice
      ? Math.round(((product.highestPrice - product.lowestPrice) / product.highestPrice) * 100)
      : 0;

  // Ribbon — same language as ShopCard (verified > top-deal > none)
  const ribbon = savings > 10
    ? { className: "ribbon ribbon-amber", icon: TrendingDown, label: `وفّر ${savings}%` }
    : product.inStockCount >= 3
      ? { className: "ribbon ribbon-emerald", icon: ShieldCheck, label: "متوفر بكثرة" }
      : null;

  return (
    <article className="group atlas-card relative overflow-hidden text-right shadow-soft-md">
      {ribbon && (
        <span className={ribbon.className}>
          <ribbon.icon className="h-3 w-3" />
          {ribbon.label}
        </span>
      )}

      <Link
        to={`/product/${product.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-surface-2"
        aria-label={`${product.title} — افتح صفحة المنتج`}
      >
        <img
          src={product.images[0]}
          alt={product.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="smooth-img h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-transparent to-transparent" />

        {/* Bottom-left: store-count chip (mirrors ShopCard area chip) */}
        <div className="absolute bottom-3 left-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-soft-md backdrop-blur-sm">
            <Store className="h-3 w-3 text-primary" />
            {product.offerCount} محل
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-4 sm:p-5">
        {/* Brand + category — mirrors ShopCard chip row */}
        <div className="flex flex-wrap items-center gap-1.5">
          {product.brand && (
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-semibold text-primary">
              {product.brand}
            </span>
          )}
          {product.category && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {product.category}
            </span>
          )}
        </div>

        <h3 className="font-display text-lg sm:text-xl font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {product.title}
        </h3>

        {product.rating != null && (
          <StarRating rating={product.rating} reviews={product.reviewCount ?? 0} size="xs" />
        )}

        {/* Price — minimal, no extra chrome */}
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            يبدأ من
          </span>
          <span className="text-xl font-bold text-foreground">
            {formatIQD(product.lowestPrice ?? 0)}
          </span>
          {product.highestPrice && product.highestPrice > (product.lowestPrice ?? 0) && (
            <span className="text-xs text-muted-foreground line-through">
              {formatIQD(product.highestPrice)}
            </span>
          )}
        </div>

        {/* Top offers preview — compact compare strip (only when provided) */}
        {topOffers && topOffers.length > 0 && (
          <ul className="space-y-1 rounded-xl border border-border/60 bg-surface/60 px-2.5 py-2">
            {topOffers.slice(0, 3).map((o, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 text-[12px]">
                <div className="flex min-w-0 items-center gap-1.5 text-foreground">
                  {o.officialDealer ? (
                    <Award className="h-3 w-3 shrink-0 text-primary" />
                  ) : o.verified ? (
                    <ShieldCheck className="h-3 w-3 shrink-0 text-success" />
                  ) : (
                    <Store className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate font-medium">{o.storeName}</span>
                </div>
                <span className={idx === 0 ? "shrink-0 font-bold text-primary" : "shrink-0 font-semibold text-foreground"}>
                  {formatIQD(o.price)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Meta row — small, calm, like ShopCard */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          {product.inStockCount > 0 ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              متوفر بـ {product.inStockCount} محل
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              نفد من كل المحلات
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3 w-3 text-success" />
            تحقّقت من المصدر
          </span>
        </div>

        {/* CTA — same shape as ShopCard */}
        <div className="pt-1">
          <Link
            to={`/product/${product.id}`}
            className="btn-ripple inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-foreground text-sm font-semibold text-background transition-colors hover:bg-primary"
          >
            قارن {product.offerCount} عرض
            <ArrowLeft className="icon-nudge-x h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </article>
  );
}
