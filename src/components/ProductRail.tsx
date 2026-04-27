import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { ProductRailSkeleton } from "./ProductRailSkeleton";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import type { ScoredProduct } from "@/lib/search";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  seeAllTo?: string;
  products: ScoredProduct[];
}

export function ProductRail({ title, seeAllTo, products }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const loading = useFakeLoading(600);
  const { ref: revealRef, revealed } = useScrollReveal<HTMLElement>();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);

  const updatePaging = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
    const pages = Math.max(1, Math.ceil(el.scrollWidth / Math.max(el.clientWidth, 1)));
    setPageCount(pages);
    const idx = maxScroll <= 1 ? 0 : Math.round((el.scrollLeft / maxScroll) * (pages - 1));
    setPageIndex(Math.min(pages - 1, Math.max(0, idx)));
  }, []);

  // Track scroll position -> derive page count + active dot.
  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    updatePaging();
    el.addEventListener("scroll", updatePaging, { passive: true });
    const ro = new ResizeObserver(updatePaging);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updatePaging);
      ro.disconnect();
    };
  }, [products.length, updatePaging]);

  if (loading) return <ProductRailSkeleton />;
  if (products.length === 0) return null;

  const goToPage = (nextPage: number) => {
    const element = railRef.current;
    if (!element) return;
    const maxScroll = Math.max(0, element.scrollWidth - element.clientWidth);
    const next = Math.min(pageCount - 1, Math.max(0, nextPage));
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pageStep = Math.max(1, element.clientWidth * 0.88);
    const dotTarget = pageCount <= 1 ? 0 : (maxScroll * next) / (pageCount - 1);
    const directionalTarget =
      Math.abs(next - pageIndex) === 1
        ? element.scrollLeft + (next > pageIndex ? pageStep : -pageStep)
        : dotTarget;
    const left = Math.min(maxScroll, Math.max(0, directionalTarget));

    element.scrollTo({
      left,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
    setPageIndex(next);
    window.setTimeout(updatePaging, prefersReducedMotion ? 0 : 320);
  };

  const canGoPrevious = pageIndex > 0;
  const canGoNext = pageIndex < pageCount - 1;

  return (
    <section
      ref={revealRef}
      className={cn("atlas-panel max-w-full overflow-hidden py-4 sm:py-5 reveal-init", revealed && "reveal-on")}
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6">
        <div className="text-right min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground sm:text-[11px]">رف مختار</div>
          <h2 className="font-display mt-1 text-xl font-bold leading-tight text-foreground sm:mt-2 sm:text-2xl md:text-3xl">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {pageCount > 1 && (
            <div className="hidden items-center gap-1 rounded-full bg-white/74 p-1 shadow-[0_10px_24px_-22px_rgba(23,32,23,0.34),inset_0_0_0_1px_hsl(var(--border)/0.22),inset_0_1px_0_rgba(255,255,255,0.72)] sm:flex">
              <button
                type="button"
                onClick={() => goToPage(pageIndex - 1)}
                disabled={!canGoPrevious}
                aria-label="الرجوع للمنتجات السابقة"
                className="ios-tap inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-[scale,background-color,color,opacity,box-shadow] hover:bg-card hover:text-foreground hover:shadow-[0_8px_18px_-14px_rgba(23,32,23,0.4)] disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => goToPage(pageIndex + 1)}
                disabled={!canGoNext}
                aria-label="عرض المنتجات التالية"
                className="ios-tap inline-flex h-10 w-10 items-center justify-center rounded-full bg-foreground text-background shadow-[0_12px_24px_-18px_rgba(15,23,42,0.7)] transition-[scale,background-color,color,opacity,box-shadow] hover:bg-foreground/90 hover:shadow-[0_16px_28px_-18px_rgba(15,23,42,0.78)] disabled:pointer-events-none disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          {seeAllTo && (
            <Link
              to={seeAllTo}
              className="group/all inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold text-foreground transition-[background-color,border-color,color,transform] hover:-translate-y-0.5 hover:border-border/60 hover:bg-surface sm:text-sm"
            >
              شوف الكل
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-300 group-hover/all:-translate-x-1" />
            </Link>
          )}
        </div>
      </div>

      <div className="relative mt-4 sm:mt-5 group/rail">
        <div
          ref={railRef}
          dir="ltr"
          className="flex max-w-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-3 pb-3 pt-1 sm:gap-4 sm:px-5 md:px-6"
          style={{ scrollbarWidth: "none", scrollPaddingInline: "1rem" }}
        >
          {products.map((product) => (
            <div
              key={product.id}
              dir="rtl"
              className="min-w-0 max-w-[calc(100vw-2.75rem)] shrink-0 snap-start basis-[min(82vw,18rem)] sm:basis-[18.5rem] md:basis-[20rem] lg:basis-[calc((100%_-_2rem)/3)] xl:basis-[calc((100%_-_3rem)/4)] 2xl:basis-[calc((100%_-_4rem)/5)]"
            >
              <ProductCard product={product} compact />
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => goToPage(pageIndex - 1)}
          disabled={pageIndex === 0}
          aria-label="الرجوع للمنتجات السابقة"
          className="ios-tap absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/96 text-foreground shadow-[0_18px_36px_-26px_rgba(23,32,23,0.5),inset_0_0_0_1px_hsl(var(--border)/0.24),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-md transition-[scale,background-color,color,opacity,box-shadow,transform] duration-200 hover:bg-white hover:text-primary hover:shadow-[0_24px_44px_-28px_rgba(23,32,23,0.55),inset_0_0_0_1px_hsl(var(--primary)/0.18)] disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => goToPage(pageIndex + 1)}
          disabled={pageIndex >= pageCount - 1}
          aria-label="عرض المنتجات التالية"
          className="ios-tap absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-card/96 text-foreground shadow-[0_18px_36px_-26px_rgba(23,32,23,0.5),inset_0_0_0_1px_hsl(var(--border)/0.24),inset_0_1px_0_rgba(255,255,255,0.72)] backdrop-blur-md transition-[scale,background-color,color,opacity,box-shadow,transform] duration-200 hover:bg-white hover:text-primary hover:shadow-[0_24px_44px_-28px_rgba(23,32,23,0.55),inset_0_0_0_1px_hsl(var(--primary)/0.18)] disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {pageCount > 1 && (
        <div className="mt-3 flex justify-center px-4 sm:mt-4">
          <div className="rail-dots" role="tablist" aria-label="صفحات الرف">
            {Array.from({ length: pageCount }).map((_, i) => (
              <button
                type="button"
                key={i}
                className="rail-dot"
                data-active={i === pageIndex ? "true" : "false"}
                aria-current={i === pageIndex ? "page" : undefined}
                aria-label={`اذهب إلى صفحة المنتجات ${i + 1}`}
                onClick={() => goToPage(i)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
