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
  topOffers?: TopOfferPreview[];
}

export function UnifiedProductCard({ product, topOffers }: Props) {
  const lowest = product.lowestPrice ?? 0;
  const highest = product.highestPrice ?? 0;
  const savings =
    highest && lowest && highest > lowest
      ? Math.round(((highest - lowest) / highest) * 100)
      : 0;

  const inStock = product.inStockCount > 0;

  return (
    <article className="group atlas-card relative flex flex-col overflow-hidden text-right shadow-soft-md">
      {savings >= 8 && (
        <span className="ribbon ribbon-amber">
          <TrendingDown className="h-3 w-3" />
          وفّر {savings}%
        </span>
      )}

      {/* IMAGE — square, calm bg, single floating chip */}
      <Link
        to={`/product/${product.id}`}
        className="relative block aspect-square overflow-hidden bg-surface-2"
        aria-label={`${product.title} — افتح صفحة المنتج`}
      >
        <img
          src={product.images[0]}
          alt={product.title}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="smooth-img h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
        />

        <div className="absolute bottom-2.5 right-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-background/95 px-2 py-1 text-[10px] font-semibold text-foreground shadow-soft-sm backdrop-blur-sm">
            <Store className="h-3 w-3 text-primary" />
            {product.offerCount} محل
          </span>
        </div>
      </Link>

      {/* BODY */}
      <div className="flex flex-1 flex-col gap-2.5 p-4">
        {/* Brand chip — single, calm, neutral */}
        {product.brand && (
          <span className="inline-flex w-fit items-center gap-1 rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </span>
        )}

        {/* Title */}
        <h3 className="font-display text-[15px] sm:text-base font-semibold leading-snug text-foreground line-clamp-2 min-h-[2.6em] group-hover:text-primary transition-colors">
          {product.title}
        </h3>

        {/* Rating — small, inline */}
        {product.rating != null && (
          <div className="text-[11px]">
            <StarRating rating={product.rating} reviews={product.reviewCount ?? 0} size="xs" />
          </div>
        )}

        {/* PRICE — hero element */}
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-display text-xl font-bold leading-none text-foreground">
            {formatIQD(lowest)}
          </span>
          {highest > lowest && (
            <span className="text-xs text-muted-foreground line-through">
              {formatIQD(highest)}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">أقل سعر من {product.offerCount} محل</p>

        {/* TOP OFFERS — only when supplied */}
        {topOffers && topOffers.length > 0 && (
          <ul className="mt-1 space-y-1 rounded-lg bg-surface/60 px-2 py-1.5">
            {topOffers.slice(0, 3).map((o, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 text-[11.5px]">
                <span className="flex min-w-0 items-center gap-1 text-foreground">
                  {o.officialDealer ? (
                    <Award className="h-3 w-3 shrink-0 text-primary" />
                  ) : o.verified ? (
                    <ShieldCheck className="h-3 w-3 shrink-0 text-success" />
                  ) : (
                    <Store className="h-3 w-3 shrink-0 text-muted-foreground" />
                  )}
                  <span className="truncate">{o.storeName}</span>
                </span>
                <span className={idx === 0 ? "shrink-0 font-bold text-primary" : "shrink-0 font-semibold text-foreground"}>
                  {formatIQD(o.price)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Stock dot */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className={`h-1.5 w-1.5 rounded-full ${inStock ? "bg-success" : "bg-destructive"}`} />
          {inStock ? `متوفر بـ ${product.inStockCount} محل` : "نفد من كل المحلات"}
        </div>

        {/* CTA */}
        <Link
          to={`/product/${product.id}`}
          className="btn-ripple mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-foreground text-sm font-semibold text-background transition-colors hover:bg-primary"
        >
          قارن الأسعار
          <ArrowLeft className="icon-nudge-x h-3.5 w-3.5" />
        </Link>
      </div>
    </article>
  );
}
