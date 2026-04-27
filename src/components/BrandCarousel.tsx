import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BrandShowcaseCard } from "./BrandShowcaseCard";
import { cn } from "@/lib/utils";
import type { BrandDealer } from "@/lib/types";

interface Props {
  brands: BrandDealer[];
  /** Hide the carousel on this breakpoint and above (parent renders grid). */
  hideAbove?: "sm" | "md" | "lg";
}

const MAX_DOTS = 7;

/** Premium snap carousel for Brand cards (mobile + tablet). Mirrors ShopCarousel UX. */
export function BrandCarousel({ brands, hideAbove = "lg" }: Props) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const absScroll = Math.abs(scrollLeft);
    const maxScroll = scrollWidth - clientWidth;
    const ratio = maxScroll <= 0 ? 0 : Math.min(1, absScroll / maxScroll);
    setProgress(ratio);

    const items = Array.from(el.querySelectorAll<HTMLElement>("[data-carousel-item]"));
    if (items.length > 0) {
      const containerRect = el.getBoundingClientRect();
      const containerCenter = containerRect.left + containerRect.width / 2;
      let closest = 0;
      let closestDist = Infinity;
      items.forEach((item, idx) => {
        const r = item.getBoundingClientRect();
        const itemCenter = r.left + r.width / 2;
        const dist = Math.abs(itemCenter - containerCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closest = idx;
        }
      });
      setActiveIndex(closest);
    }

    setCanPrev(ratio > 0.02);
    setCanNext(ratio < 0.98);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateState();
    el.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);
    return () => {
      el.removeEventListener("scroll", updateState);
      window.removeEventListener("resize", updateState);
    };
  }, [updateState, brands.length]);

  const scrollByDir = useCallback((dir: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-carousel-item]");
    const first = items[0];
    if (!first) return;
    const step = first.getBoundingClientRect().width + 14;
    const direction = dir === "next" ? -1 : 1;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  }, []);

  const scrollToIndex = useCallback((idx: number) => {
    const el = scrollerRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-carousel-item]");
    const target = items[idx];
    if (!target) return;
    const containerRect = el.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    el.scrollBy({ left: targetRect.left - containerRect.left, behavior: "smooth" });
  }, []);

  const hideClass =
    hideAbove === "sm" ? "sm:hidden" : hideAbove === "md" ? "md:hidden" : "lg:hidden";

  if (brands.length === 0) return null;

  const useDots = brands.length <= MAX_DOTS;
  const total = brands.length;

  return (
    <div className={cn("relative", hideClass)} dir="rtl">
      <div className="relative">
        <div
          ref={scrollerRef}
          className="-mx-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-2 scroll-smooth"
          style={{ scrollPaddingInline: "1.25rem", WebkitOverflowScrolling: "touch" }}
          role="region"
          aria-label="قائمة البراندات قابلة للتمرير"
        >
          {brands.map((brand, idx) => (
            <div
              key={brand.slug}
              data-carousel-item
              className="snap-center shrink-0 basis-[80%] sm:basis-[58%] md:basis-[44%]"
              aria-roledescription="slide"
              aria-label={`${idx + 1} من ${total}`}
            >
              <BrandShowcaseCard brand={brand} index={idx} />
            </div>
          ))}
          <div className="shrink-0 w-1" aria-hidden />
        </div>
      </div>

      {/* Footer control bar */}
      <div className="mt-5 flex items-center justify-between gap-3 px-1">
        <div className="flex flex-1 items-center min-w-0">
          {useDots ? (
            <div className="flex items-center gap-0.5" role="tablist" aria-label="انتقال بين البراندات">
              {brands.map((_, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`اذهب إلى البراند ${idx + 1}`}
                    onClick={() => scrollToIndex(idx)}
                    className="group flex h-7 w-7 items-center justify-center rounded-full transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] hover:bg-surface/70"
                  >
                    <span
                      className={cn(
                        "h-1 rounded-full transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300",
                        isActive ? "w-6 bg-foreground" : "w-1 bg-border group-hover:bg-muted-foreground/50",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="relative h-0.5 w-full max-w-[200px] overflow-hidden rounded-full bg-border">
              <div
                className="absolute inset-y-0 right-0 rounded-full bg-foreground transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(6, progress * 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-card/80 p-0.5 shadow-sm backdrop-blur-md">
          <button
            type="button"
            onClick={() => scrollByDir("prev")}
            disabled={!canPrev}
            aria-label="السابق"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter]",
              "hover:bg-surface hover:text-primary active:scale-[0.96]",
              "disabled:opacity-30 disabled:pointer-events-none",
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <div className="px-2 text-[11px] font-bold tabular-nums text-foreground/90">
            <span>{(activeIndex + 1).toLocaleString("ar")}</span>
            <span className="mx-1 text-muted-foreground/50">/</span>
            <span className="text-muted-foreground">{total.toLocaleString("ar")}</span>
          </div>

          <button
            type="button"
            onClick={() => scrollByDir("next")}
            disabled={!canNext}
            aria-label="التالي"
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter]",
              "hover:bg-surface hover:text-primary active:scale-[0.96]",
              "disabled:opacity-30 disabled:pointer-events-none",
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
