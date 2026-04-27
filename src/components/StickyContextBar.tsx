import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StickyContextBarProps {
  /** Large title shown above the fold; collapses to compact bar on scroll. */
  title: string;
  /** Optional small label above the large title (eyebrow). */
  eyebrow?: string;
  /** Optional subtitle shown only in the large state. */
  subtitle?: string;
  /** Content rendered inside the sticky compact bar (e.g., filter chips). */
  toolbar?: ReactNode;
  /** Right-aligned actions in the sticky bar (icons/buttons). */
  actions?: ReactNode;
  /** Distance in px from top to start collapsing. */
  threshold?: number;
  className?: string;
}

/**
 * iOS-style "Large Title" pattern: a hero title that gracefully collapses
 * into a compact sticky bar as the user scrolls, mirroring NavigationStack.
 */
export function StickyContextBar({
  title,
  eyebrow,
  subtitle,
  toolbar,
  actions,
  threshold = 60,
  className,
}: StickyContextBarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setCollapsed(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return (
    <div className={cn("relative", className)}>
      {/* Large title — visible at top of scroll */}
      <div
        className={cn(
          "container pt-4 pb-3 transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-500 ios-spring",
          collapsed ? "opacity-0 -translate-y-2 pointer-events-none h-0 overflow-hidden pt-0 pb-0" : "opacity-100",
        )}
      >
        {eyebrow && (
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</div>
        )}
        <h1 className="font-display mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div ref={sentinelRef} />

      {/* Compact sticky bar */}
      <div
        className={cn(
          "sticky top-[58px] z-30 transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 ios-spring",
          collapsed
            ? "border-b border-border/50 bg-background/85 shadow-[0_1px_0_0_hsl(var(--border)/0.4),0_8px_24px_-12px_hsl(var(--foreground)/0.08)] backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="container flex items-center gap-3 py-2.5">
          <div
            className={cn(
              "min-w-0 flex-1 transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 ios-spring",
              collapsed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1 pointer-events-none",
            )}
          >
            <div className="truncate font-display text-sm font-bold text-foreground">{title}</div>
          </div>
          {toolbar && (
            <div className={cn("min-w-0 flex-1 overflow-hidden", collapsed ? "block" : "block")}>
              {toolbar}
            </div>
          )}
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </div>
      </div>
    </div>
  );
}
