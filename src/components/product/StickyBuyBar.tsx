/**
 * StickyBuyBar — appears on the ProductDetail page after the user scrolls
 * past the hero. Shows thumbnail + title + lowest price + primary CTA
 * (open best offer) + secondary CTA (compare offers in-page anchor).
 * Hidden on mobile to avoid colliding with BottomTabBar.
 */
import { useEffect, useState } from "react";
import { ExternalLink, Scale } from "lucide-react";
import type { UnifiedOffer, UnifiedProduct } from "@/lib/unifiedSearch";
import { getProductImageNotFound, getRenderableProductImageCandidates } from "@/lib/productVisuals";
import { decodeHtmlEntities } from "@/lib/textDisplay";
import { cn } from "@/lib/utils";
import { formatCurrencyPrice } from "@/lib/prices";
import { useSequentialImage } from "@/hooks/use-sequential-image";

interface Props {
  product: UnifiedProduct;
  bestOffer?: UnifiedOffer;
  /** Anchor id of the offers list — used by the "compare" CTA. */
  offersAnchorId?: string;
}

export function StickyBuyBar({ product, bestOffer, offersAnchorId = "all-offers" }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        // Show after scrolling past 600px (approx. past the hero)
        setVisible(window.scrollY > 600);
        ticking = false;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fallback = getProductImageNotFound();
  const { src: thumb, onError: onImageError } = useSequentialImage(
    getRenderableProductImageCandidates(product),
    {
      fallbackSrc: fallback,
      optimize: { width: 80, height: 80 },
      resetKey: product.id,
    },
  );
  const title = decodeHtmlEntities(product.title);

  return (
    <div
      role="region"
      aria-label="شريط الشراء السريع"
      className={cn(
        "fixed inset-x-0 bottom-4 z-40 hidden transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] md:block",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0",
      )}
    >
      <div className="container">
        <div className="mx-auto max-w-[1180px] rounded-[2rem] bg-surface-2/62 p-1 shadow-[0_24px_70px_-48px_hsl(var(--foreground)/0.36)] ring-1 ring-border/52">
          <div className="flex items-center gap-3 rounded-[1.65rem] bg-card/92 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.76)]">
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-[1.15rem] bg-surface ring-1 ring-border/50">
              <img
                src={thumb}
                alt=""
                className="h-full w-full object-cover object-center"
                onError={onImageError}
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col">
              <div className="line-clamp-1 text-[13px] font-black leading-tight text-foreground">
                {title}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-[10px] text-muted-foreground/80">يبدأ من</span>
                <span className="font-numeric text-[16px] font-black tabular-nums text-foreground">
                  {product.lowestPrice ? formatCurrencyPrice(product.lowestPrice, product.priceCurrency) : "—"}
                </span>
                {bestOffer && (
                  <span className="hidden text-[11px] font-semibold text-muted-foreground lg:inline">
                    · {decodeHtmlEntities(bestOffer.storeName)}
                  </span>
                )}
              </div>
            </div>

            <a
              href={`#${offersAnchorId}`}
              className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-card/84 px-4 text-[13px] font-black text-foreground shadow-border transition-[transform,background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-primary-soft hover:text-primary active:scale-[0.96]"
            >
              <span>قارن</span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary-soft transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-0.5">
                <Scale className="h-3.5 w-3.5" strokeWidth={1.9} />
              </span>
            </a>

            {bestOffer ? (
              <a
                href={bestOffer.productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-foreground px-4 ps-5 text-[13px] font-black text-background shadow-[0_16px_34px_-24px_hsl(var(--foreground)/0.82)] transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/90 hover:shadow-[0_20px_42px_-26px_hsl(var(--foreground)/0.9)] active:scale-[0.96]"
              >
                <span>اطلب من {decodeHtmlEntities(bestOffer.storeName)}</span>
                <span className="grid h-8 w-8 place-items-center rounded-full bg-background/10 transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-0.5 group-hover:bg-background/14">
                  <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.9} />
                </span>
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
