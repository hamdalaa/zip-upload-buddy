import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useUserPrefs } from "@/lib/userPrefs";

const LazyCommandPalette = lazy(() =>
  import("./CommandPalette").then((module) => ({ default: module.CommandPalette })),
);
const LazyWelcomeTour = lazy(() =>
  import("./WelcomeTour").then((module) => ({ default: module.WelcomeTour })),
);
const LazyCompareBar = lazy(() =>
  import("./CompareBar").then((module) => ({ default: module.CompareBar })),
);
const LazyRecentlyViewedStrip = lazy(() =>
  import("./RecentlyViewedStrip").then((module) => ({ default: module.RecentlyViewedStrip })),
);
const LazyRootToasters = lazy(() =>
  import("./RootToasters").then((module) => ({ default: module.RootToasters })),
);

function scheduleIdle(callback: () => void, timeout = 2500) {
  if (typeof window === "undefined") return () => undefined;
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(handle);
  }

  const handle = (window as Window).setTimeout(callback, timeout);
  return () => (window as Window).clearTimeout(handle);
}

export function DeferredRootChrome() {
  const location = useLocation();
  const { compare, onboarded, tourTrigger } = useUserPrefs();
  const isAdminRoute = location.pathname === "/67" || location.pathname.startsWith("/dashboard");
  const [commandEnabled, setCommandEnabled] = useState(false);
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [toastersEnabled, setToastersEnabled] = useState(false);
  const [forceCommandOpenToken, setForceCommandOpenToken] = useState(0);

  useEffect(() => {
    const cancelToasters = scheduleIdle(() => setToastersEnabled(true), 900);
    if (isAdminRoute) {
      setCommandEnabled(false);
      setWelcomeEnabled(false);
      return cancelToasters;
    }

    const cancelCommand = scheduleIdle(() => setCommandEnabled(true), 2200);
    const shouldAutoOpenWelcome = !onboarded;
    const cancelWelcome = shouldAutoOpenWelcome || tourTrigger > 0
      ? scheduleIdle(() => setWelcomeEnabled(true), tourTrigger > 0 ? 0 : 1200)
      : () => undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      setCommandEnabled(true);
      setForceCommandOpenToken((token) => token + 1);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      cancelToasters();
      cancelCommand();
      cancelWelcome();
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [isAdminRoute, location.pathname, onboarded, tourTrigger]);

  return (
    <>
      {commandEnabled && (
        <Suspense fallback={null}>
          <LazyCommandPalette forceOpenToken={forceCommandOpenToken} />
        </Suspense>
      )}

      {welcomeEnabled && (
        <Suspense fallback={null}>
          <LazyWelcomeTour autoOpen={!onboarded && !isAdminRoute} />
        </Suspense>
      )}

      {!isAdminRoute && compare.length > 0 && (
        <Suspense fallback={null}>
          <LazyCompareBar />
        </Suspense>
      )}

      {toastersEnabled && (
        <Suspense fallback={null}>
          <LazyRootToasters />
        </Suspense>
      )}

      {!isAdminRoute && (
        <Suspense fallback={null}>
          <LazyRecentlyViewedStrip />
        </Suspense>
      )}
    </>
  );
}
