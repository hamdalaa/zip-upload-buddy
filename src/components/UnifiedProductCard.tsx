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
import { optimizeImageUrl } from "@/lib/imageUrl";
import { getFallbackProductImage, isRenderableProductImage } from "@/lib/productVisuals";
import { decodeHtmlEntities } from "@/lib/textDisplay";

interface Props {
  product: UnifiedProduct;
  /** Optional preview of top offers — shown as compact compare strip */
  topOffers?: { storeName: string; price: number; verified?: boolean; officialDealer?: boolean }[];
}

const PRODUCT_STAGE_TONES: Record<string, string> = {
  "Smart Phones": "from-rose-50 via-white to-slate-100",
  Accessories: "from-amber-50 via-white to-stone-100",
  "Computer & Laptops": "from-sky-50 via-white to-slate-100",
  "Camera & Photo": "from-zinc-100 via-white to-slate-100",
  Audio: "from-neutral-100 via-white to-zinc-100",
  Gaming: "from-violet-50 via-white to-slate-100",
};

export function UnifiedProductCard({ product, topOffers }: Props) {
  const title = decodeHtmlEntities(product.title);
  const brand = decodeHtmlEntities(product.brand);
  const savings =
    product.highestPrice && product.lowestPrice && product.highestPrice > product.lowestPrice
      ? Math.round(((product.highestPrice - product.lowestPrice) / product.highestPrice) * 100)
      : 0;

  const priceSpread =
    product.highestPrice && product.lowestPrice ? product.highestPrice - product.lowestPrice : 0;

  const inStockRatio =
    product.offerCount > 0 ? Math.round((product.inStockCount / product.offerCount) * 100) : 0;
  const fallbackImage = getFallbackProductImage(product.category);
  const primaryImage =
    product.images.find((image) => isRenderableProductImage(image)) ??
    fallbackImage;
  const displayImage = optimizeImageUrl(primaryImage, { width: 720, height: 576 }) ?? primaryImage;
  const stageTone = PRODUCT_STAGE_TONES[product.category] ?? "from-slate-50 via-white to-stone-100";

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-soft-xl"
    >
      {/* ===== Image area ===== */}
      <div className="relative aspect-[5/4] overflow-hidden border-b border-border/60 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.96),rgba(245,247,250,0.92)_52%,rgba(232,236,241,0.9)_100%)]">
        <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-white/90 via-white/35 to-transparent" />
        <div className="absolute inset-x-[18%] bottom-4 h-6 rounded-full bg-slate-950/10 blur-2xl" />
        <div className={`absolute inset-x-4 bottom-4 top-7 rounded-[28px] border border-white/80 bg-gradient-to-br ${stageTone} shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_22px_45px_rgba(148,163,184,0.16)]`} />

        <div className="relative z-[1] flex h-full items-center justify-center px-4 pb-4 pt-10 sm:px-5 sm:pb-5 sm:pt-11">
          <img
            src={displayImage}
            alt={title}
            loading="lazy"
            decoding="async"
            width={720}
            height={576}
            onError={(event) => {
              if (event.currentTarget.src !== fallbackImage) {
                event.currentTarget.src = fallbackImage;
              }
            }}
            className="relative z-[2] max-h-[76%] w-auto max-w-[80%] object-contain object-center mix-blend-multiply drop-shadow-[0_18px_26px_rgba(15,23,42,0.12)] transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-[1.05] sm:max-h-[79%] sm:max-w-[82%] sm:drop-shadow-[0_24px_36px_rgba(15,23,42,0.14)]"
          />
        </div>

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
        <div className="flex items-center justify-between gap-2">
          {product.brand ? (
            <Badge
              variant="outline"
              className="rounded-full border-border bg-surface px-1.5 py-0 text-[9px] font-bold uppercase tracking-wide text-foreground sm:px-2 sm:text-[10px]"
            >
              {brand}
            </Badge>
          ) : <span />}
          {product.category && (
            <span className="hidden text-[11px] font-medium text-muted-foreground sm:inline">
              {product.category}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 min-h-[2.6em] text-[13px] font-bold leading-snug text-foreground transition-colors group-hover:text-primary sm:text-[15px]">
          {title}
        </h3>

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
