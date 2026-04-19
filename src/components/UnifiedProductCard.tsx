import { Link } from "react-router-dom";
import { Store, TrendingDown, Package, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatIQD, type UnifiedProduct } from "@/lib/unifiedSearch";

interface Props {
  product: UnifiedProduct;
}

export function UnifiedProductCard({ product }: Props) {
  const savings = product.highestPrice && product.lowestPrice
    ? Math.round(((product.highestPrice - product.lowestPrice) / product.highestPrice) * 100)
    : 0;

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-soft-xl"
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-surface">
        <img
          src={product.images[0]}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        {savings > 5 && (
          <div className="absolute start-3 top-3 flex items-center gap-1 rounded-full bg-accent-rose px-2.5 py-1 text-[11px] font-bold text-white shadow-soft-md">
            <TrendingDown className="h-3 w-3" />
            وفّر {savings}%
          </div>
        )}
        <div className="absolute end-3 top-3 flex items-center gap-1 rounded-full bg-card/95 px-2 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm">
          <Store className="h-3 w-3 text-primary" />
          {product.offerCount} عرض
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          {product.brand && (
            <Badge variant="outline" className="rounded-full border-border bg-surface px-2 py-0 text-[10px] font-semibold uppercase tracking-wide">
              {product.brand}
            </Badge>
          )}
          {product.rating != null && (
            <div className="flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span className="font-semibold text-foreground">{product.rating.toFixed(1)}</span>
              <span>({product.reviewCount})</span>
            </div>
          )}
        </div>

        <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
          {product.title}
        </h3>

        <div className="mt-auto flex items-end justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">يبدأ من</span>
            <span className="text-lg font-extrabold text-foreground">{formatIQD(product.lowestPrice ?? 0)}</span>
          </div>
          {product.inStockCount > 0 ? (
            <Badge className="gap-1 bg-accent-emerald-soft text-accent-emerald hover:bg-accent-emerald-soft">
              <Package className="h-3 w-3" />
              متوفر
            </Badge>
          ) : (
            <Badge variant="outline" className="border-destructive/30 text-destructive">نفد</Badge>
          )}
        </div>

        {/* Bottom strip — store stack */}
        <div className="-mx-4 -mb-4 mt-1 flex items-center justify-between border-t border-border bg-surface/50 px-4 py-2.5">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-accent-emerald" />
            <span>قارن {product.offerCount} عرض من {product.offerCount} محل</span>
          </div>
          <span className="text-[11px] font-semibold text-primary transition-transform group-hover:-translate-x-0.5">
            عرض ←
          </span>
        </div>
      </div>
    </Link>
  );
}
