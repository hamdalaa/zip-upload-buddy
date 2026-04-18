import { Skeleton } from "@/components/ui/skeleton";
import { ProductSkeleton } from "./ProductSkeleton";

export function ProductRailSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="flex gap-3 overflow-hidden px-4 pb-4">
        {Array.from({ length: items }).map((_, i) => (
          <div key={i} className="shrink-0 w-[150px] sm:w-[170px] md:w-[190px]">
            <ProductSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
