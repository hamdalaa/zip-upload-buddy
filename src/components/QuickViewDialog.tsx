/**
 * QuickViewDialog — modal preview opened from any product card via the
 * "👁 معاينة سريعة" hover button. Loads the full UnifiedProduct + offers on
 * open so the user gets price, brand, top 3 stores, and quick actions
 * (favorite, compare, open full page) without leaving the listing.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Award, Heart, Loader2, Scale, ShieldCheck, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useUserPrefs } from "@/lib/userPrefs";
import { getProductFull } from "@/lib/unifiedSearch";
import type { UnifiedOffer, UnifiedProduct } from "@/lib/unifiedSearch";
import { getProductImageNotFound, getRenderableProductImageCandidates } from "@/lib/productVisuals";
import { decodeHtmlEntities } from "@/lib/textDisplay";
import { cn } from "@/lib/utils";
import { formatCurrencyPrice } from "@/lib/prices";
import { toast } from "sonner";
import { useSequentialImage } from "@/hooks/use-sequential-image";

interface Props {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional pre-loaded product to skip network when opened from a card already holding the data. */
  initialProduct?: UnifiedProduct | null;
}

export function QuickViewDialog({ productId, open, onOpenChange, initialProduct }: Props) {
  const [product, setProduct] = useState<UnifiedProduct | null>(initialProduct ?? null);
  const [offers, setOffers] = useState<UnifiedOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const { isFavorite, toggleFavorite, isInCompare, toggleCompare, compare } = useUserPrefs();

  useEffect(() => {
    if (!open || !productId) return;
    let cancelled = false;
    setLoading(true);
    const request = initialProduct
      ? getProductFull(productId).then((payload) => ({
          product: payload?.product ?? initialProduct,
          offers: payload?.offers ?? [],
        }))
      : getProductFull(productId);

    request
      .then((payload) => {
        if (cancelled) return;
        setProduct(payload?.product ?? null);
        setOffers(payload?.offers ?? []);
      })
      .catch(() => {
        if (!cancelled) toast.error("تعذّر تحميل المنتج");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, productId, initialProduct]);

  const fav = productId ? isFavorite(productId) : false;
  const inCmp = productId ? isInCompare(productId) : false;

  function onFav() {
    if (!productId) return;
    toggleFavorite(productId);
    toast(fav ? "تم الحذف من المفضلة" : "تمت الإضافة للمفضلة", { duration: 1500 });
  }

  function onCmp() {
    if (!productId) return;
    if (!inCmp && compare.length >= 4) {
      toast.error("يمكن مقارنة 4 منتجات فقط");
      return;
    }
    toggleCompare(productId);
    toast(inCmp ? "تمت الإزالة من المقارنة" : "تمت الإضافة إلى المقارنة", { duration: 1500 });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-3xl border-border/60 bg-background p-0 sm:max-w-3xl">
        {loading && !product ? (
          <div className="grid place-items-center px-10 py-24">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !product ? (
          <div className="px-10 py-12 text-center">
            <DialogHeader>
              <DialogTitle className="text-base">المنتج غير متاح</DialogTitle>
              <DialogDescription>تعذّر تحميل بيانات هذا المنتج.</DialogDescription>
            </DialogHeader>
          </div>
        ) : (
          <QuickViewBody
            product={product}
            offers={offers}
            onFav={onFav}
            onCmp={onCmp}
            fav={fav}
            inCmp={inCmp}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function QuickViewBody({
  product,
  offers,
  onFav,
  onCmp,
  fav,
  inCmp,
  onClose,
}: {
  product: UnifiedProduct;
  offers: UnifiedOffer[];
  onFav: () => void;
  onCmp: () => void;
  fav: boolean;
  inCmp: boolean;
  onClose: () => void;
}) {
  const fallback = getProductImageNotFound();
  const { src: heroImage, onError: onImageError } = useSequentialImage(
    getRenderableProductImageCandidates(product),
    {
      fallbackSrc: fallback,
      optimize: { width: 720, height: 720 },
      resetKey: product.id,
    },
  );
  const title = decodeHtmlEntities(product.title);
  const brand = decodeHtmlEntities(product.brand);
  const category = decodeHtmlEntities(product.category);
  const topOffers = offers
    .filter((o) => o.stock !== "out_of_stock")
    .slice(0, 3);
  const savings =
    product.highestPrice && product.lowestPrice && product.highestPrice > product.lowestPrice
      ? Math.round(((product.highestPrice - product.lowestPrice) / product.highestPrice) * 100)
      : 0;

  return (
    <div className="grid gap-6 p-5 sm:grid-cols-[260px_1fr] sm:gap-7 sm:p-7">
      {/* Image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted/30">
        <img
          src={heroImage}
          alt={title}
          className="h-full w-full object-contain p-4"
          onError={onImageError}
        />
        {savings > 5 && (
          <span className="absolute start-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold text-background">
            -{savings}%
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-col">
        <DialogHeader className="text-right">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium text-muted-foreground">
            {brand && <span className="font-semibold text-foreground/75">{brand}</span>}
            {brand && category && (
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" aria-hidden />
            )}
            {category && <span>{category}</span>}
          </div>
          <DialogTitle className="text-balance text-lg font-semibold leading-tight tracking-tight sm:text-xl">
            {title}
          </DialogTitle>
          <DialogDescription className="text-[12px]">
            معاينة سريعة — اضغط "افتح صفحة كاملة" لتشوف كل العروض والمواصفات.
          </DialogDescription>
        </DialogHeader>

        {/* Price */}
        <div className="mt-4 flex items-baseline gap-3">
          <span className="font-numeric text-3xl font-semibold tabular-nums tracking-tight text-foreground">
            {product.lowestPrice ? formatCurrencyPrice(product.lowestPrice, product.priceCurrency) : "—"}
          </span>
          {product.highestPrice && product.highestPrice > (product.lowestPrice ?? 0) && (
            <span className="font-numeric text-sm tabular-nums text-muted-foreground/70 line-through">
              {formatCurrencyPrice(product.highestPrice, product.priceCurrency)}
            </span>
          )}
        </div>

        {/* Top 3 offers */}
        {topOffers.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              أفضل 3 عروض
            </div>
            <ul className="mt-2 divide-y divide-border/40 overflow-hidden rounded-xl border border-border/60 bg-card">
              {topOffers.map((o, idx) => (
                <li
                  key={o.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-[13px]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {o.officialDealer ? (
                      <Award className="h-3.5 w-3.5 shrink-0 text-primary" />
                    ) : o.verified ? (
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent-emerald" />
                    ) : (
                      <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-medium text-foreground">
                      {decodeHtmlEntities(o.storeName)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 font-semibold tabular-nums",
                      idx === 0 ? "text-accent-emerald" : "text-foreground",
                    )}
                  >
                    {formatCurrencyPrice(o.price, o.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button asChild variant="primary" size="sm" className="rounded-full">
            <Link to={`/product/${product.id}`} onClick={onClose}>
              افتح صفحة كاملة
              <ArrowLeft className="ms-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            type="button"
            onClick={onFav}
            variant={fav ? "secondary" : "outline"}
            size="sm"
            className="rounded-full"
          >
            <Heart className={cn("me-1 h-3.5 w-3.5", fav && "fill-current text-rose")} />
            {fav ? "بالمفضلة" : "حفظ"}
          </Button>
          <Button
            type="button"
            onClick={onCmp}
            variant={inCmp ? "secondary" : "outline"}
            size="sm"
            className="rounded-full"
          >
            <Scale className="me-1 h-3.5 w-3.5" />
            {inCmp ? "بالمقارنة" : "قارن"}
          </Button>
        </div>
      </div>
    </div>
  );
}
