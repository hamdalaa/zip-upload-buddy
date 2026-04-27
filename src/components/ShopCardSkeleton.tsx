import { Skeleton } from "@/components/ui/skeleton";

export function ShopCardSkeleton() {
  return (
    <div className="atlas-card overflow-hidden">
      <div className="shimmer-bg aspect-[4/3] w-full" />
      <div className="space-y-3 p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-10" />
        </div>
        <Skeleton className="h-4 w-1/3" />
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-12 rounded-full" />
        </div>
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ShopCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ShopCardSkeleton key={i} />
      ))}
    </div>
  );
}
