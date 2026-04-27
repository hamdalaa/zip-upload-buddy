import { lazy, Suspense, useEffect, useState } from "react";

const LazyDeferredRootChrome = lazy(() =>
  import("./DeferredRootChrome").then((module) => ({ default: module.DeferredRootChrome })),
);
const LazyRouteIntentPrefetch = lazy(() =>
  import("./RouteIntentPrefetch").then((module) => ({ default: module.RouteIntentPrefetch })),
);
const LazyBottomTabBar = lazy(() =>
  import("./BottomTabBar").then((module) => ({ default: module.BottomTabBar })),
);
const LazyPullToRefreshIndicator = lazy(() =>
  import("./PullToRefreshIndicator").then((module) => ({ default: module.PullToRefreshIndicator })),
);

function scheduleAfterFirstPaint(callback: () => void, timeout = 6500) {
  if (typeof window === "undefined") return () => undefined;

  let canceled = false;
  let idleHandle: number | undefined;
  let timerHandle: number | undefined;

  const run = () => {
    if (canceled) return;
    callback();
  };

  const rafOne = window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(run, { timeout });
      } else {
        timerHandle = window.setTimeout(run, Math.min(timeout, 3200));
      }
    });
  });

  return () => {
    canceled = true;
    window.cancelAnimationFrame(rafOne);
    if (idleHandle !== undefined) window.cancelIdleCallback?.(idleHandle);
    if (timerHandle !== undefined) window.clearTimeout(timerHandle);
  };
}

export function AppRuntimeChrome() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => scheduleAfterFirstPaint(() => setEnabled(true)), []);

  if (!enabled) return null;

  return (
    <Suspense fallback={null}>
      <LazyRouteIntentPrefetch />
      <LazyDeferredRootChrome />
      <LazyPullToRefreshIndicator />
      <LazyBottomTabBar />
    </Suspense>
  );
}
