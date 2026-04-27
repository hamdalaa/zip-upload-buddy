import { Skeleton } from "@/components/ui/skeleton";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";

/**
 * Skeleton for the Product Detail page. Mirrors the real page's hero grid
 * (image + content) and offers table to avoid layout shift when data lands.
 */
export function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen atlas-shell" aria-busy="true" aria-live="polite">
      <TopNav />

      {/* Breadcrumbs */}
      <div className="border-b border-border/50 bg-card/40">
        <div className="container flex items-center gap-2 py-2.5">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-32 rounded-full" />
        </div>
      </div>

      <section className="container py-8 sm:py-12">
        <div className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-stretch">
          {/* Left: title + price card */}
          <div className="product-studio-shell order-2 space-y-5 p-5 lg:order-1">
            <Skeleton className="h-4 w-28 rounded-full" />
            <div className="space-y-3">
              <Skeleton className="h-9 w-3/4 rounded-2xl" />
              <Skeleton className="h-9 w-1/2 rounded-2xl" />
            </div>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-20 rounded-full" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-[1.55rem]" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-[1.25rem]" />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-3xl" />
          </div>

          {/* Right: image */}
          <div className="product-studio-shell order-1 p-1.5 lg:order-2">
            <Skeleton className="aspect-[5/4] w-full rounded-[1.8rem] sm:aspect-square" />
          </div>
        </div>

        {/* Offers table */}
        <div className="mt-8 space-y-3">
          <Skeleton className="h-6 w-48 rounded-full" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/**
 * Skeleton for ShopView page. Mirrors hero banner, actions bar, summary tiles
 * and product grid so the user senses immediate progress.
 */
export function ShopViewSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_16%,hsl(var(--surface))_100%)]"
      aria-busy="true"
      aria-live="polite"
    >
      <TopNav />

      {/* Breadcrumbs */}
      <div className="border-b border-border bg-background">
        <div className="container flex items-center gap-2 py-2.5">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-3 w-12 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
        </div>
      </div>

      <main className="container flex-1 space-y-5 py-4 pb-24 md:space-y-6 md:py-8 md:pb-8">
        {/* Hero card */}
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/88 shadow-soft-xl backdrop-blur-sm">
          <Skeleton className="h-44 w-full rounded-none sm:h-72 md:h-96" />

          {/* Actions bar */}
          <div className="flex items-center gap-2 border-t border-border/60 p-4">
            <Skeleton className="h-10 w-32 rounded-full" />
            <Skeleton className="h-10 w-24 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
            <div className="ms-auto flex gap-1.5">
              <Skeleton className="h-10 w-10 rounded-full" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </div>

          {/* Summary tiles */}
          <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Sections */}
        <Skeleton className="h-24 w-full rounded-3xl" />

        {/* Product grid */}
        <div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-soft-lg backdrop-blur-sm md:p-6">
          <Skeleton className="mb-4 h-6 w-40 rounded-full" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * Skeleton for Brand page. Mirrors hero (image + glass content), stats grid,
 * branches grid and products grid.
 */
export function BrandPageSkeleton() {
  return (
    <div
      className="flex min-h-screen flex-col bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_14%,hsl(var(--surface))_100%)]"
      aria-busy="true"
      aria-live="polite"
    >
      <TopNav />

      {/* Breadcrumbs */}
      <div className="border-b border-border bg-background">
        <div className="container flex items-center gap-2 py-2.5">
          <Skeleton className="h-3 w-16 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-24 rounded-full" />
          <Skeleton className="h-3 w-3 rounded-full" />
          <Skeleton className="h-3 w-20 rounded-full" />
        </div>
      </div>

      {/* Hero */}
      <section className="border-b border-border bg-background">
        <div className="container py-8 md:py-12">
          <div className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
            <Skeleton className="order-2 min-h-[280px] rounded-3xl md:min-h-[360px] lg:order-1" />
            <div className="order-1 space-y-4 rounded-3xl border border-border/60 bg-card/90 p-6 shadow-soft-xl md:p-8 lg:order-2">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-2xl md:h-20 md:w-20" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-7 w-3/4 rounded-xl" />
                  <Skeleton className="h-4 w-1/2 rounded-full" />
                </div>
              </div>
              <Skeleton className="h-16 w-full rounded-2xl" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-9 w-32 rounded-full" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
              <div className="flex flex-wrap gap-1.5 border-t border-border/70 pt-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        </div>
      </section>

      <main className="container flex-1 space-y-6 py-6 md:py-8">
        <div className="rounded-3xl border border-border/70 bg-card/85 p-5 shadow-soft-lg backdrop-blur-sm md:p-6">
          <Skeleton className="mb-4 h-6 w-40 rounded-full" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 rounded-2xl" />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * Skeleton for /search results grid. Mirrors the real grid (3 cols on xl,
 * 2 on sm, 1 on mobile) so deferred filter computation does not cause CLS.
 */
export function SearchResultsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/70 bg-card"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-3 w-1/3 rounded-full" />
            <Skeleton className="h-5 w-3/4 rounded-full" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
