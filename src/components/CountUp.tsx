import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/useCountUp";

export function CountUp({
  value,
  className,
  locale = "ar",
  suffix,
}: {
  value: number;
  className?: string;
  locale?: string;
  suffix?: string;
}) {
  const { ref, value: current } = useCountUp(value);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {current.toLocaleString(locale)}
      {suffix ?? ""}
    </span>
  );
}
