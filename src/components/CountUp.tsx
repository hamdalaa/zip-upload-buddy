import { useCountUp } from "@/hooks/useCountUp";

export function CountUp({
  value,
  className,
  locale = "ar",
}: {
  value: number;
  className?: string;
  locale?: string;
}) {
  const { ref, value: current } = useCountUp(value);
  return (
    <span ref={ref} className={className}>
      {current.toLocaleString(locale)}
    </span>
  );
}
