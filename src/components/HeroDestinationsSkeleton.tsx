import { Skeleton } from "@/components/ui/skeleton";

/**
 * Layout-matched skeleton for HeroDestinations — same grid, aspect-ratio,
 * and footer rhythm as the real cards so swapping in real content causes
 * zero layout shift on slow image loads.
 */
export function HeroDestinationsSkeleton() {
  return (
    <div
      className="mx-auto mt-10 grid w-full max-w-5xl grid-cols-1 gap-4 sm:mt-20 sm:grid-cols-3 sm:gap-5"
      aria-busy="true"
      aria-live="polite"
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/60 bg-card"
        >
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
            <Skeleton className="h-3.5 w-20 rounded-full" />
            <Skeleton className="h-3 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}