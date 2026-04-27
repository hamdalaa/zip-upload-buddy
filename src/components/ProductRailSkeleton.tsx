import { Skeleton } from "@/components/ui/skeleton";
import { ProductSkeleton } from "./ProductSkeleton";

export function ProductRailSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex gap-3 overflow-hidden px-4 pb-4 sm:gap-4 sm:px-6">
        {Array.from({ length: items }).map((_, i) => (
          <div
            key={i}
            className="min-w-0 shrink-0 basis-[78%] sm:basis-[calc((100%-1rem)/2)] lg:basis-[calc((100%-2rem)/3)] xl:basis-[calc((100%-3rem)/4)] 2xl:basis-[calc((100%-4rem)/5)]"
          >
            <ProductSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
