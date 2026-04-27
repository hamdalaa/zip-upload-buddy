import { useEffect, useState } from "react";

/**
 * Detects scroll direction (up/down) with a small threshold to avoid jitter.
 * Useful for hide-on-scroll headers and sticky-on-scroll-up filters.
 */
export function useScrollDirection(threshold = 6) {
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      setAtTop(y < 8);
      if (Math.abs(y - lastY) > threshold) {
        setDirection(y > lastY ? "down" : "up");
        lastY = y;
      }
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return { direction, atTop };
}