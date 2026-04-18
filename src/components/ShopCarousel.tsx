import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ShopCard } from "./ShopCard";
import { cn } from "@/lib/utils";
import type { Shop } from "@/lib/types";

interface Props {
  shops: Shop[];
  /** Hide the carousel on this breakpoint and above (parent renders grid). */
  hideAbove?: "sm" | "md" | "lg";
}

const MAX_DOTS = 7;

/**
 * Premium snap carousel for Shop cards (mobile + tablet).
 * - RTL-aware scroll-snap with peek of next card
 * - Smart pagination: dots (≤7 cards) or segmented progress (>7)
 * - Floating arrows on the rail edges
 * - Sticky counter pill ("3 / 30")
 */
export function ShopCarousel({ shops, hideAbove = "lg" }: Props) {
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
  }, [updateState, shops.length]);

  const scrollByDir = useCallback((dir: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const items = el.querySelectorAll<HTMLElement>("[data-carousel-item]");
    const first = items[0];
    if (!first) return;
    const step = first.getBoundingClientRect().width + 16;
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

  if (shops.length === 0) return null;

  const useDots = shops.length <= MAX_DOTS;
  const total = shops.length;

  return (
    <div className={cn("relative", hideClass)} dir="rtl">
      {/* Rail */}
      <div className="relative">
        <div
          ref={scrollerRef}
          className="-mx-5 flex snap-x snap-mandatory gap-3.5 overflow-x-auto px-5 pb-2 scroll-smooth"
          style={{ scrollPaddingInline: "1.25rem", WebkitOverflowScrolling: "touch" }}
          role="region"
          aria-label="قائمة المحلات قابلة للتمرير"
        >
          {shops.map((shop, idx) => (
            <div
              key={shop.id}
              data-carousel-item
              className="snap-center shrink-0 basis-[78%] sm:basis-[58%] md:basis-[44%]"
              aria-roledescription="slide"
              aria-label={`${idx + 1} من ${total}`}
            >
              <ShopCard shop={shop} />
            </div>
          ))}
          <div className="shrink-0 w-1" aria-hidden />
        </div>

        {/* Floating arrows — only on tablet+ where finger reach is harder */}
        <button
          type="button"
          onClick={() => scrollByDir("prev")}
          disabled={!canPrev}
          aria-label="السابق"
          className={cn(
            "hidden sm:flex absolute end-1 top-[40%] -translate-y-1/2 z-10",
            "h-10 w-10 items-center justify-center rounded-full",
            "bg-background/95 backdrop-blur-md shadow-[0_8px_24px_-8px_hsl(220_30%_20%/0.25)] ring-1 ring-border",
            "transition-all hover:scale-105 hover:text-primary hover:ring-primary/40",
            "disabled:opacity-0 disabled:pointer-events-none",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => scrollByDir("next")}
          disabled={!canNext}
          aria-label="التالي"
          className={cn(
            "hidden sm:flex absolute start-1 top-[40%] -translate-y-1/2 z-10",
            "h-10 w-10 items-center justify-center rounded-full",
            "bg-background/95 backdrop-blur-md shadow-[0_8px_24px_-8px_hsl(220_30%_20%/0.25)] ring-1 ring-border",
            "transition-all hover:scale-105 hover:text-primary hover:ring-primary/40",
            "disabled:opacity-0 disabled:pointer-events-none",
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Footer: pagination + counter */}
      <div className="mt-4 flex items-center justify-between gap-4 px-1">
        {/* Pagination — dots OR segmented progress */}
        <div className="flex flex-1 items-center min-w-0">
          {useDots ? (
            <div className="flex items-center gap-1.5" role="tablist" aria-label="انتقال بين المحلات">
              {shops.map((_, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`اذهب إلى المحل ${idx + 1}`}
                    onClick={() => scrollToIndex(idx)}
                    className={cn(
                      "h-1.5 rounded-full transition-all duration-300",
                      isActive
                        ? "w-7 bg-primary shadow-[0_0_10px_-2px_hsl(var(--primary)/0.6)]"
                        : "w-1.5 bg-border hover:bg-muted-foreground/40",
                    )}
                  />
                );
              })}
            </div>
          ) : (
            <div className="relative h-1.5 w-full max-w-[180px] overflow-hidden rounded-full bg-border/70">
              <div
                className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-primary via-primary to-accent transition-[width] duration-300 ease-out"
                style={{ width: `${Math.max(8, progress * 100)}%` }}
              />
            </div>
          )}
        </div>

        {/* Counter pill */}
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-[11px] font-bold tabular-nums shadow-sm">
            <span className="text-primary">{(activeIndex + 1).toLocaleString("ar")}</span>
            <span className="text-muted-foreground/60">/</span>
            <span className="text-foreground/82">{total.toLocaleString("ar")}</span>
          </div>

          {/* Compact arrows for mobile (no floating) */}
          <div className="flex sm:hidden items-center gap-1">
            <button
              type="button"
              onClick={() => scrollByDir("prev")}
              disabled={!canPrev}
              aria-label="السابق"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background transition-all",
                "active:scale-95 hover:text-primary hover:border-primary/40",
                "disabled:opacity-30 disabled:pointer-events-none",
              )}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollByDir("next")}
              disabled={!canNext}
              aria-label="التالي"
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background transition-all",
                "active:scale-95 hover:text-primary hover:border-primary/40",
                "disabled:opacity-30 disabled:pointer-events-none",
              )}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
