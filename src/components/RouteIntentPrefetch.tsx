import { useEffect } from "react";
import { prefetchRouteForPath } from "@/lib/routePrefetch";

function getInternalPathFromTarget(target: EventTarget | null) {
  const element = target instanceof Element ? target.closest("a[href]") : null;
  if (!(element instanceof HTMLAnchorElement)) return null;
  if (element.target && element.target !== "_self") return null;

  const url = new URL(element.href, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  return `${url.pathname}${url.search}`;
}

export function RouteIntentPrefetch() {
  useEffect(() => {
    const handleIntent = (event: Event) => {
      const path = getInternalPathFromTarget(event.target);
      if (!path) return;
      void prefetchRouteForPath(path);
    };

    document.addEventListener("mouseover", handleIntent, { capture: true, passive: true });
    document.addEventListener("focusin", handleIntent, { capture: true, passive: true });
    document.addEventListener("touchstart", handleIntent, { capture: true, passive: true });

    return () => {
      document.removeEventListener("mouseover", handleIntent, true);
      document.removeEventListener("focusin", handleIntent, true);
      document.removeEventListener("touchstart", handleIntent, true);
    };
  }, []);

  return null;
}
