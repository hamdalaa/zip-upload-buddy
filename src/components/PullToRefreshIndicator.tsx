import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const THRESHOLD = 70;

export function PullToRefreshIndicator() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const tracking = useRef(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return undefined;

    function onTouchStart(event: TouchEvent) {
      if (window.scrollY > 2) return;
      startY.current = event.touches[0].clientY;
      tracking.current = true;
    }

    function onTouchMove(event: TouchEvent) {
      if (!tracking.current || startY.current == null) return;
      const dy = event.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      setPull(Math.min(140, dy * 0.55));
    }

    function onTouchEnd() {
      if (!tracking.current) return;
      tracking.current = false;
      const reached = pull >= THRESHOLD;
      if (reached && !refreshing) {
        setRefreshing(true);
        setPull(THRESHOLD);
        window.location.reload();
        return;
      }
      setPull(0);
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
  }, [pull, refreshing]);

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center lg:hidden"
      style={{
        transform: `translateY(${Math.max(0, pull - 28)}px)`,
        opacity: pull > 8 ? 1 : 0,
        transition: tracking.current ? "none" : "transform 0.4s cubic-bezier(0.32,0.72,0,1), opacity 0.3s",
      }}
      aria-hidden="true"
    >
      <div className="mt-2 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/90 shadow-soft-lg backdrop-blur-xl">
        <RefreshCw
          className={cn("h-4 w-4 text-primary transition-transform", refreshing && "animate-spin")}
          style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  );
}
