import { cn } from "@/lib/utils";

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
  const main = size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";
  const fmt = (n: number) => `${n.toLocaleString("en-US")} IQD`;

  if (!priceText && !priceValue) {
    return <div className={cn("text-xs text-muted-foreground", className)}>السعر غير معلن</div>;
  }

  const savings =
    priceValue && originalPriceValue && originalPriceValue > priceValue
      ? Math.round(((originalPriceValue - priceValue) / originalPriceValue) * 100)
      : 0;

  return (
    <div className={cn("flex flex-col items-start", className)}>
      <div className="flex items-baseline gap-2">
        <span className={cn("font-display font-bold leading-none text-foreground", main)}>
          {priceText ?? (priceValue ? fmt(priceValue) : "")}
        </span>
        {savings > 0 && (
          <span className="rounded-full border border-destructive/20 bg-destructive/10 px-2 py-1 text-[10px] font-bold text-destructive">
            -{savings}%
          </span>
        )}
      </div>
      {originalPriceValue && savings > 0 && (
        <span className="mt-1 text-xs text-muted-foreground line-through">{fmt(originalPriceValue)}</span>
      )}
    </div>
  );
}
