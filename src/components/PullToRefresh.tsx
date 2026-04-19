import { useEffect, useRef, useState, type ReactNode } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  children: ReactNode;
  /** Async refresh handler. Defaults to a soft re-render via location.reload(). */
  onRefresh?: () => Promise<void> | void;
  /** Pixels of pull required to trigger refresh. */
  threshold?: number;
  /** Disable on desktop or specific routes. */
  disabled?: boolean;
}

/**
 * iOS-style pull-to-refresh: only active on touch devices at scrollTop=0.
 * Shows a spring indicator that follows the finger, then triggers onRefresh
 * when threshold is crossed. Falls back to window.location.reload().
 */
export function PullToRefresh({
  children,
  onRefresh,
  threshold = 70,
  disabled = false,
}: PullToRefreshProps) {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);

  useEffect(() => {
    if (disabled) return;

    function onTouchStart(e: TouchEvent) {
      if (window.scrollY > 2) return;
      startY.current = e.touches[0].clientY;
      tracking.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking.current || startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // Resistance curve — feels like iOS rubber band
      const resisted = Math.min(140, dy * 0.55);
      setPull(resisted);
    }

    async function onTouchEnd() {
      if (!tracking.current) return;
      tracking.current = false;
      const reached = pull >= threshold;
      if (reached && !refreshing) {
        setRefreshing(true);
        setPull(threshold);
        try {
          if (onRefresh) {
            await onRefresh();
          } else {
            // Soft refresh: reload current route
            window.location.reload();
          }
        } finally {
          setTimeout(() => {
            setRefreshing(false);
            setPull(0);
          }, 400);
        }
      } else {
        setPull(0);
      }
      startY.current = null;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pull, threshold, refreshing, onRefresh, disabled]);

  const progress = Math.min(1, pull / threshold);

  return (
    <>
      {/* Indicator — fixed top, follows pull distance */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center lg:hidden"
        style={{
          transform: `translateY(${Math.max(0, pull - 28)}px)`,
          opacity: pull > 8 ? 1 : 0,
          transition: tracking.current ? "none" : "transform 0.4s cubic-bezier(0.32,0.72,0,1), opacity 0.3s",
        }}
        aria-hidden="true"
      >
        <div
          className={cn(
            "mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/90 shadow-soft-lg backdrop-blur-xl",
          )}
        >
          <RefreshCw
            className={cn(
              "h-4 w-4 text-primary transition-transform",
              refreshing && "animate-spin",
            )}
            style={{
              transform: refreshing ? undefined : `rotate(${progress * 270}deg)`,
            }}
          />
        </div>
      </div>

      {/* Children — translate down while pulling for tactile feel */}
      <div
        style={{
          transform: pull > 0 ? `translateY(${pull * 0.5}px)` : undefined,
          transition: tracking.current ? "none" : "transform 0.4s cubic-bezier(0.32,0.72,0,1)",
        }}
      >
        {children}
      </div>
    </>
  );
}
