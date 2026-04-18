import { Link } from "react-router-dom";
import { Award, Check, ExternalLink, Heart, MapPin, Scale, Star, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StarRating } from "./StarRating";
import { PriceBlock } from "./PriceBlock";
import { StaleBadge } from "./Badges";
import { isStale, relativeArabicTime, type ScoredProduct } from "@/lib/search";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { useUserPrefs } from "@/lib/userPrefs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  shopGoogleMapsUrl,
  bestPrice = false,
  layout = "grid",
}: {
  product: ScoredProduct;
  shopGoogleMapsUrl?: string;
  bestPrice?: boolean;
  layout?: "grid" | "list";
}) {
  const stale = isStale(product.crawledAt);
  const rawImg = product.imageUrl ?? CATEGORY_IMAGES[product.category];
  const img = optimizeImageUrl(rawImg, { width: 640, height: 640 }) ?? rawImg;
  const { isFavorite, toggleFavorite, isInCompare, toggleCompare, compare } = useUserPrefs();
  const fav = isFavorite(product.id);
  const inCompare = isInCompare(product.id);

  function onFav(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    toggleFavorite(product.id);
    toast(fav ? "تم الحذف من المفضلة" : "تمت الإضافة للمفضلة", { duration: 1500 });
  }

  function onCompare(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!inCompare && compare.length >= 4) {
      toast.error("يمكن مقارنة 4 منتجات فقط");
      return;
    }

    toggleCompare(product.id);
    toast(inCompare ? "تمت الإزالة من المقارنة" : "تمت الإضافة إلى المقارنة", { duration: 1500 });
  }

  if (layout === "list") {
    return (
      <article
        className={cn(
          "group grid gap-4 rounded-[1.7rem] border border-border/75 bg-card/94 p-3 shadow-soft-lg transition-all duration-300 md:grid-cols-[170px_minmax(0,1fr)]",
          inCompare && "ring-1 ring-primary/60",
        )}
      >
        <Link to={`/shop-view/${product.shopId}`} className="relative block overflow-hidden rounded-[1.4rem] bg-surface-2">
          <img src={img} alt={product.name} loading="lazy" decoding="async" width={640} height={640} className="smooth-img h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
          {bestPrice && (
            <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[10px] font-bold text-white">
              <Award className="h-3 w-3" />
              أفضل سعر
            </span>
          )}
          {stale && <span className="absolute left-3 top-3"><StaleBadge /></span>}
        </Link>

        <div className="flex min-w-0 flex-col text-right">
          <div className="flex flex-wrap items-center gap-2">
            {product.brand && (
              <span className="rounded-full bg-secondary/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                {product.brand}
              </span>
            )}
            <span className="text-[11px] font-semibold text-muted-foreground">{product.category}</span>
            {product.rating && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                <Star className="h-3 w-3 fill-warning text-warning" />
                {product.rating.toFixed(1)}
              </span>
            )}
          </div>

          <h3 className="mt-3 line-clamp-2 font-display text-3xl font-bold leading-[0.92] text-foreground">
            {product.name}
          </h3>

          {product.rating && <div className="mt-3"><StarRating rating={product.rating} reviews={product.reviewCount} size="xs" /></div>}

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-t border-border/65 pt-4">
            <div className="space-y-2">
              <PriceBlock
                priceText={product.priceText}
                priceValue={product.priceValue}
                originalPriceValue={product.originalPriceValue}
                size="lg"
              />
              <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Store className="h-3.5 w-3.5 text-accent" />
                {product.shopName}
              </div>
              <div className="text-[11px] text-muted-foreground">آخر فهرسة {relativeArabicTime(product.crawledAt)}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <QuickActions fav={fav} inCompare={inCompare} onFav={onFav} onCompare={onCompare} />
              {shopGoogleMapsUrl && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-full border-border/75 bg-background px-4 hover:border-accent/35 hover:text-accent"
                >
                  <a href={shopGoogleMapsUrl} target="_blank" rel="noreferrer noopener">
                    <MapPin className="h-4 w-4" />
                    خرائط
                  </a>
                </Button>
              )}
              {product.productUrl && (
                <Button asChild size="sm" className="h-10 rounded-full bg-secondary px-4 text-secondary-foreground hover:bg-secondary/94">
                  <a href={product.productUrl} target="_blank" rel="noreferrer noopener">
                    <ExternalLink className="h-4 w-4" />
                    افتح المنتج
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "group tilt-3d relative overflow-hidden rounded-[1.55rem] border border-border/75 bg-card/94 shadow-soft-lg transition-all duration-300 sm:rounded-[1.7rem]",
        inCompare && "ring-1 ring-primary/60",
      )}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />

      {bestPrice && (
        <span className="ribbon ribbon-emerald">
          <Award className="h-3 w-3" />
          أفضل سعر
        </span>
      )}

      <Link to={`/shop-view/${product.shopId}`} className="relative block aspect-[1/1.02] overflow-hidden bg-surface-2 sm:aspect-[1/1.06]">
        <img src={img} alt={product.name} loading="lazy" decoding="async" width={640} height={640} className="smooth-img h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_18%,rgba(6,17,28,0.08)_46%,rgba(6,17,28,0.72)_100%)]" />

        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          {stale && <StaleBadge />}
        </div>

        <div className="absolute left-3 top-3 z-10 flex flex-col gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:opacity-100">
          <QuickActions fav={fav} inCompare={inCompare} onFav={onFav} onCompare={onCompare} floating />
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 p-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {product.brand && (
                <div className="mb-2 inline-flex rounded-full bg-white/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                  {product.brand}
                </div>
              )}
              <h3 className="line-clamp-2 font-display text-[1.35rem] font-bold leading-[0.96] drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)] sm:text-2xl sm:leading-[0.92]">
                {product.name}
              </h3>
            </div>
            {product.rating && (
              <div className="rounded-full bg-black/28 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">
                {product.rating.toFixed(1)}
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-3.5 text-right sm:p-4">
        <div className="flex items-center justify-between gap-3">
          <Link to={`/shop-view/${product.shopId}`} className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
            <Store className="h-3.5 w-3.5 text-accent" />
            <span className="truncate">{product.shopName}</span>
          </Link>
          <span className="text-[11px] font-semibold text-muted-foreground">{product.category}</span>
        </div>

        {product.rating && <StarRating rating={product.rating} reviews={product.reviewCount} size="xs" />}

        <div className="atlas-separator pb-3">
          <PriceBlock
            priceText={product.priceText}
            priceValue={product.priceValue}
            originalPriceValue={product.originalPriceValue}
            size="md"
          />
        </div>

        <div className="flex items-center gap-2">
          {product.productUrl && (
            <Button asChild size="sm" className="h-10 flex-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/94">
              <a href={product.productUrl} target="_blank" rel="noreferrer noopener">
                افتح المنتج
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </Button>
          )}
          {shopGoogleMapsUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-10 rounded-full border-border/75 bg-background px-3 hover:border-accent/35 hover:text-accent"
                >
                  <a href={shopGoogleMapsUrl} target="_blank" rel="noreferrer noopener" aria-label="خرائط Google">
                    <MapPin className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>افتح موقع المحل بخرائط Google</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </article>
  );
}

function QuickActions({
  fav,
  inCompare,
  onFav,
  onCompare,
  floating = false,
}: {
  fav: boolean;
  inCompare: boolean;
  onFav: (event: React.MouseEvent) => void;
  onCompare: (event: React.MouseEvent) => void;
  floating?: boolean;
}) {
  const base = floating
    ? "h-9 w-9 rounded-full border border-white/16 bg-black/30 text-white backdrop-blur-sm"
    : "h-10 w-10 rounded-full border border-border/75 bg-background text-foreground";

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onFav}
            aria-label={fav ? "حذف من المفضلة" : "إضافة للمفضلة"}
            className={cn(
              "flex items-center justify-center transition-colors",
              base,
              fav && !floating && "border-destructive/20 bg-destructive/10 text-destructive",
            )}
          >
            <Heart className={cn("h-4 w-4", fav && "fill-current")} />
          </button>
        </TooltipTrigger>
        <TooltipContent>{fav ? "إزالة من المفضلة" : "إضافة للمفضلة"}</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onCompare}
            aria-label={inCompare ? "إزالة من المقارنة" : "أضف للمقارنة"}
            className={cn(
              "flex items-center justify-center transition-colors",
              base,
              inCompare && !floating && "border-primary/20 bg-primary/10 text-primary",
            )}
          >
            {inCompare ? <Check className="h-4 w-4" /> : <Scale className="h-4 w-4" />}
          </button>
        </TooltipTrigger>
        <TooltipContent>{inCompare ? "ضمن المقارنة" : "أضف للمقارنة"}</TooltipContent>
      </Tooltip>
    </>
  );
}
