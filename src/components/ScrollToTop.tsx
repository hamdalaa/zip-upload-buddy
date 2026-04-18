import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * Scroll management:
 * - PUSH/REPLACE (forward navigation): smooth scroll to top.
 * - POP (back/forward browser button): restore the saved scroll position for that path.
 * Mount once inside <BrowserRouter>.
 */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  const navType = useNavigationType(); // "PUSH" | "REPLACE" | "POP"
  const positions = useRef<Map<string, number>>(new Map());
  const lastKey = useRef<string | null>(null);

  const key = `${pathname}${search}${hash}`;

  // Save scroll position before leaving the current route.
  useEffect(() => {
    const saveCurrent = () => {
      if (lastKey.current) {
        positions.current.set(lastKey.current, window.scrollY);
      }
    };

    // Save on unload too (covers refresh / external nav).
    window.addEventListener("beforeunload", saveCurrent);
    return () => {
      saveCurrent();
      window.removeEventListener("beforeunload", saveCurrent);
    };
  }, [key]);

  // Apply scroll behavior on route change.
  useEffect(() => {
    if (navType === "POP") {
      const saved = positions.current.get(key) ?? 0;
      // Use auto for restoration to feel instant like native browser back.
      window.scrollTo({ top: saved, left: 0, behavior: "auto" });
    } else {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
    lastKey.current = key;
  }, [key, navType]);

  return null;
}
