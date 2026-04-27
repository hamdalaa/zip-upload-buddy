import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { Clock, X } from "lucide-react";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { useDataStore } from "@/lib/dataStore";
import { getProductImageNotFound, getRenderableProductImageCandidates } from "@/lib/productVisuals";
import { decodeHtmlEntities } from "@/lib/textDisplay";
import { useSequentialImage } from "@/hooks/use-sequential-image";
import type { ProductIndex } from "@/lib/types";

/**
 * Floating strip of last viewed products — appears at the bottom-left
 * (above CompareBar / BottomTabBar). Hidden on landing & empty.
 */
export function RecentlyViewedStrip() {
  const { ids, clear } = useRecentlyViewed();
  const { products } = useDataStore();
  const loc = useLocation();

  const items = useMemo(
    () =>
      ids
        .map((id) => products.find((p) => p.id === id))
        .filter(Boolean)
        .slice(0, 6) as typeof products,
    [ids, products],
  );

  // Hide on home, product detail, and dashboard pages
  const hide =
    loc.pathname === "/" ||
    loc.pathname.startsWith("/product/") ||
    loc.pathname.startsWith("/dashboard");

  if (hide || items.length < 2) return null;

  return (
    <aside
      className="reveal-init reveal-on fixed z-30 hidden lg:block bottom-4 left-4 max-w-[22rem]"
      aria-label="آخر منتجات شفتها"
    >
      <div className="rounded-2xl border border-border/70 bg-card/85 p-2.5 shadow-soft-xl backdrop-blur-2xl">
        <header className="flex items-center justify-between gap-2 px-1.5 pb-2">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
            <Clock className="h-3.5 w-3.5 text-primary" />
            آخر ما شفته
          </div>
          <button
            onClick={clear}
            className="ios-tap inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="إفراغ"
          >
            <X className="h-3 w-3" />
          </button>
        </header>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {items.map((p) => {
            return (
              <RecentlyViewedItem key={p.id} product={p} />
            );
          })}
        </div>
      </div>
    </aside>
  );
}

function RecentlyViewedItem({ product }: { product: ProductIndex }) {
  const fallback = getProductImageNotFound();
  const { src, onError } = useSequentialImage(getRenderableProductImageCandidates(product), {
    fallbackSrc: fallback,
    optimize: { width: 96, height: 96 },
    resetKey: product.id,
  });

  return (
    <Link
      to={`/shop-view/${product.shopId}`}
      className="group relative shrink-0"
      title={decodeHtmlEntities(product.name)}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        onError={onError}
        className="h-11 w-11 rounded-xl border border-border/70 object-cover transition-[transform,border-color] group-hover:-translate-y-0.5 group-hover:border-primary/50"
      />
    </Link>
  );
}
