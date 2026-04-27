import { cn } from "@/lib/utils";
import { getDisplayPriceText, hasComparableDiscount, isValidPrice } from "@/lib/prices";

export function PriceBlock({
  priceText,
  priceValue,
  originalPriceValue,
  size = "md",
  className,
}: {
  priceText?: string;
  priceValue?: number;
  originalPriceValue?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const main = size === "lg" ? "text-[1.65rem]" : size === "sm" ? "text-[15px]" : "text-xl";
  const fmt = (n: number) => `${n.toLocaleString("en-US")} IQD`;
  const displayPrice = getDisplayPriceText(priceText, priceValue);
  const normalizedPrice = isValidPrice(priceValue) ? priceValue : undefined;
  const normalizedOriginal =
    isValidPrice(originalPriceValue) && isValidPrice(normalizedPrice) && originalPriceValue > normalizedPrice
      ? originalPriceValue
      : undefined;

  if (!displayPrice && !normalizedPrice) {
    return <div className={cn("text-xs text-muted-foreground", className)}>السعر غير معلن</div>;
  }

  const savings = normalizedPrice && normalizedOriginal && hasComparableDiscount(normalizedPrice, normalizedOriginal)
    ? Math.round(((normalizedOriginal - normalizedPrice) / normalizedOriginal) * 100)
    : 0;

  return (
    <div className={cn("flex flex-col items-start", className)}>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "font-numeric font-semibold leading-none tracking-tight text-foreground tabular-stable",
            main,
          )}
        >
          {displayPrice ?? (normalizedPrice ? fmt(normalizedPrice) : "")}
        </span>
        {savings > 0 && (
          <span className="glow-emerald rounded-full bg-success-soft px-2 py-0.5 text-[10px] font-semibold text-success">
            −{savings}%
          </span>
        )}
      </div>
      {normalizedOriginal && savings > 0 && (
        <span className="mt-1 text-xs text-muted-foreground/80 line-through tabular-stable">
          {fmt(normalizedOriginal)}
        </span>
      )}
    </div>
  );
}
