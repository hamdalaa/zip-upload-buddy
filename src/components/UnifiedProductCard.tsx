import { lazy, memo, Suspense, useState } from "react";
import { Link } from "react-router-dom";
import {
  Store,
  TrendingDown,
  ShieldCheck,
  Award,
  ArrowLeft,
  Eye,
  Sparkles,
  Flame,
} from "lucide-react";
import { formatIQD, type UnifiedProduct } from "@/lib/unifiedSearch";
import { getProductImageNotFound, getRenderableProductImageCandidates } from "@/lib/productVisuals";
import { decodeHtmlEntities } from "@/lib/textDisplay";
import { useSequentialImage } from "@/hooks/use-sequential-image";
import { formatCurrencyPrice, isValidPrice } from "@/lib/prices";

const LazyQuickViewDialog = lazy(() =>
  import("@/components/QuickViewDialog").then((module) => ({ default: module.QuickViewDialog })),
);

interface Props {
  product: UnifiedProduct;
  /** Optional preview of top offers — shown as compact compare strip */
  topOffers?: { storeName: string; price: number; verified?: boolean; officialDealer?: boolean }[];
}

export const UnifiedProductCard = memo(function UnifiedProductCard({ product, topOffers }: Props) {
  const [quickOpen, setQuickOpen] = useState(false);
  const title = decodeHtmlEntities(product.title);
  const brand = decodeHtmlEntities(product.brand);
  const lowestPrice = isValidPrice(product.lowestPrice) ? product.lowestPrice : undefined;
  const highestPrice = isValidPrice(product.highestPrice) ? product.highestPrice : undefined;
  const visibleOffers = topOffers?.filter((offer) => isValidPrice(offer.price)) ?? [];
  const savings =
    highestPrice && lowestPrice && highestPrice > lowestPrice
      ? Math.round(((highestPrice - lowestPrice) / highestPrice) * 100)
      : 0;

  const priceSpread =
    highestPrice && lowestPrice ? highestPrice - lowestPrice : 0;

  const inStockRatio =
    product.offerCount > 0 ? Math.round((product.inStockCount / product.offerCount) * 100) : 0;
  const fallbackImage = getProductImageNotFound();
  const { src: displayImage, onError: onImageError } = useSequentialImage(
    getRenderableProductImageCandidates(product),
    {
      fallbackSrc: fallbackImage,
      optimize: { width: 720, height: 576 },
      resetKey: product.id,
    },
  );

  // Heuristic badges: HOT = lots of offers, NEW = no rating yet, SALE handled by `savings`
  const isHot = product.offerCount >= 8;
  const isNew = !product.rating || product.rating === 0;

  return (
    <>
    <Link
      to={`/product/${product.id}`}
      className="cv-card-product search-card-shell group relative flex h-full flex-col overflow-hidden p-1.5 will-change-transform sm:p-2"
    >
      {/* ===== Image area ===== */}
      <div className="product-media-well relative aspect-[5/4] overflow-hidden">
        <div className="pointer-events-none absolute inset-x-6 top-4 h-px bg-white/80" />
        <div className="relative z-[1] h-full w-full overflow-hidden">
          <img
            src={displayImage}
            alt={title}
            loading="lazy"
            decoding="async"
            width={720}
            height={576}
            onError={onImageError}
            className="relative z-[2] h-full w-full object-cover object-center drop-shadow-[0_22px_24px_rgba(15,23,42,0.10)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.055]"
          />
        </div>

        {/* Top-left: status badges (SALE / HOT / NEW) */}
        <div className="absolute start-3 top-3 z-10 flex flex-col items-start gap-1">
          {savings > 5 && (
            <span className="flex items-center gap-1 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-semibold text-background shadow-[0_10px_18px_-14px_hsl(var(--foreground)/0.75)] sm:text-[11px]">
              <TrendingDown className="h-2.5 w-2.5" />
              <span className="tabular-nums">-{savings}%</span>
            </span>
          )}
          {isHot && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/75 bg-card/92 px-1.5 py-0.5 text-[10px] font-black text-rose shadow-[0_12px_24px_-18px_hsl(var(--accent-rose)/0.5)] backdrop-blur-sm sm:px-2">
              <span className="grid h-3.5 w-3.5 place-items-center rounded-full bg-rose-soft text-rose">
                <Flame className="h-2.5 w-2.5" strokeWidth={2.4} />
              </span>
              <span>رائج</span>
            </span>
          )}
          {isNew && !isHot && savings <= 5 && (
            <span className="flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-[0_10px_18px_-14px_hsl(var(--primary)/0.75)] sm:text-[11px]">
              <Sparkles className="h-2.5 w-2.5" />
              جديد
            </span>
          )}
        </div>

        {/* Top-right: offer count chip */}
        <div className="absolute end-3 top-3 z-10 flex items-center gap-1 rounded-full bg-foreground/90 px-2 py-1 text-[10px] font-semibold text-background shadow-[0_12px_24px_-18px_hsl(var(--foreground)/0.8)] sm:text-[11px]">
          <Store className="h-3 w-3" />
          <span className="tabular-nums">{product.offerCount}</span>
          <span className="hidden sm:inline">محل</span>
        </div>

        {/* Bottom-left: stock pill */}
        <div className="absolute bottom-3 start-3">
        {product.inStockCount > 0 ? (
            <div className="flex items-center gap-1.5 rounded-full border border-white/70 bg-card/92 px-2 py-0.5 text-[10px] font-semibold text-accent-emerald shadow-soft sm:text-[11px]">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent-emerald" />
              <span className="tabular-nums">متوفر</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-white/70 bg-card/92 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shadow-soft sm:text-[11px]">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              نفد
            </div>
          )}
        </div>

        {/* Bottom-right: Quick View button (visible on hover/tap) */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setQuickOpen(true);
          }}
          aria-label="معاينة سريعة"
          className="absolute bottom-3 end-3 z-10 inline-flex h-8 items-center gap-1 rounded-full border border-white/70 bg-background/96 px-2.5 text-[11px] font-semibold text-foreground opacity-0 shadow-soft-md transition-[opacity,transform,background-color,color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground hover:text-background group-hover:opacity-100 group-focus-within:opacity-100 sm:translate-y-1 sm:group-hover:translate-y-0"
        >
          <Eye className="h-3 w-3" />
          معاينة
        </button>
      </div>

      {/* ===== Body ===== */}
      <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2 pt-4 sm:gap-2.5 sm:px-3.5">
        {/* Brand + category — dot-separated */}
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-muted-foreground sm:text-[11px]">
          {product.brand && (
            <span className="max-w-[58%] truncate font-semibold tracking-wide text-foreground/78">{brand}</span>
          )}
          {product.brand && product.category && (
            <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" aria-hidden />
          )}
          {product.category && <span className="truncate text-muted-foreground/80">{product.category}</span>}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 min-h-[2.7em] text-balance text-[13.5px] font-semibold leading-snug tracking-normal text-foreground sm:text-[14.75px]">
          {title}
        </h3>

        {/* Price */}
        <div className="flex items-end justify-between gap-3 rounded-[1.05rem] bg-white/58 px-3 py-2.5 ring-1 ring-border/55">
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-muted-foreground/70">يبدأ من</span>
            <span className="font-numeric tabular-nums text-[18px] font-black leading-tight tracking-normal text-foreground sm:text-[20px]">
              {formatCurrencyPrice(lowestPrice, product.priceCurrency)}
            </span>
          </div>
          {priceSpread > 0 && highestPrice && (
            <span className="tabular-nums text-[10px] text-muted-foreground/60 line-through sm:text-[11px]">
              {formatCurrencyPrice(highestPrice, product.priceCurrency)}
            </span>
          )}
        </div>

        {visibleOffers.length > 0 && (
          <ul className="flex flex-col gap-1.5 rounded-[1rem] border border-border/50 bg-surface/66 px-2.5 py-2">
            {visibleOffers.slice(0, 3).map((o, idx) => (
              <li key={idx} className="flex items-center justify-between gap-2 text-[12px]">
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

        {/* Meta — dot-separated */}
        <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-border/40 pt-2.5 text-[10px] text-muted-foreground sm:text-[11px]">
          {inStockRatio > 0 && (
            <>
              <span className="flex items-center gap-1">
                <span className="tabular-nums font-semibold text-foreground/75">{inStockRatio}%</span>
                <span className="text-muted-foreground/80">توفر</span>
              </span>
              <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/30" aria-hidden />
            </>
          )}
          <span className="flex items-center gap-1">
            <span className="tabular-nums font-semibold text-foreground/75">{product.offerCount}</span>
            <span className="text-muted-foreground/80">عرض</span>
          </span>
        </div>

        {/* CTA — colored full-width view details button */}
        <span className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-[1rem] bg-foreground px-3 py-2 text-[12px] font-semibold text-background shadow-[0_14px_30px_-24px_hsl(var(--foreground)/0.8)] transition-[background-color,transform,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:bg-foreground/90 group-hover:shadow-[0_18px_36px_-26px_hsl(var(--foreground)/0.9)] sm:text-[13px]">
          <span>عرض التفاصيل</span>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-background/10">
            <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-0.5" />
          </span>
        </span>
      </div>

    </Link>
    {quickOpen && (
      <Suspense fallback={null}>
        <LazyQuickViewDialog
          productId={product.id}
          open={quickOpen}
          onOpenChange={setQuickOpen}
          initialProduct={product}
        />
      </Suspense>
    )}
    </>
  );
});
