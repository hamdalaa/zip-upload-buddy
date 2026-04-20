import { useEffect } from "react";
import Lenis from "lenis";

export function SmoothScroll() {
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) return;

    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      allowNestedScroll: true,
      lerp: 0.2,
      smoothWheel: true,
      syncTouch: false,
      stopInertiaOnNavigate: true,
      wheelMultiplier: 0.85,
    });

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        lenis.stop();
        return;
      }

      lenis.start();
    };

    mediaQuery.addEventListener?.("change", handleMotionPreferenceChange);

    return () => {
      mediaQuery.removeEventListener?.("change", handleMotionPreferenceChange);
      lenis.destroy();
    };
  }, []);

  return null;
}
