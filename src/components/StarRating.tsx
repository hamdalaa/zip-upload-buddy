import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating = 0,
  reviews,
  size = "sm",
  className,
}: {
  rating?: number;
  reviews?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const px = size === "xs" ? "h-3 w-3" : size === "md" ? "h-4 w-4" : "h-3.5 w-3.5";
  const text = size === "xs" ? "text-[10px]" : size === "md" ? "text-sm" : "text-xs";
  const full = Math.floor(rating);
  const hasHalf = rating - full >= 0.5;
  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      <div className="inline-flex">
        {[0, 1, 2, 3, 4].map((i) => {
          const filled = i < full || (i === full && hasHalf);
          return (
            <Star
              key={i}
              className={cn(px, filled ? "fill-warning text-warning" : "text-muted-foreground/30")}
              strokeWidth={1.25}
            />
          );
        })}
      </div>
      <span className={cn(text, "font-numeric font-semibold tabular-stable text-foreground")}>
        {rating.toFixed(1)}
      </span>
      {typeof reviews === "number" && (
        <span className={cn(text, "font-numeric text-muted-foreground tabular-stable")}>
          ({reviews.toLocaleString("en-US")})
        </span>
      )}
    </div>
  );
}
