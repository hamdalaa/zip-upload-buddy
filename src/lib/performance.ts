import { PUBLIC_API_BASE_URL } from "./api";
import {
  PERSIST_TTL,
  prefetchCityList,
  queryKeys,
} from "./catalogQueries";
import { queryClient } from "./queryClient";
import { readPersistedQuery } from "./queryStorage";

type NavigatorWithConnection = Navigator & {
  connection?: {
    saveData?: boolean;
    effectiveType?: string;
  };
  deviceMemory?: number;
};

function scheduleIdle(callback: () => void, timeout = 1800) {
  if (typeof window === "undefined") return () => undefined;
  if ("requestIdleCallback" in window) {
    const handle = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback?.(handle);
  }
  const handle = window.setTimeout(callback, timeout);
  return () => window.clearTimeout(handle);
}

function injectResourceHint(rel: "preconnect" | "dns-prefetch", href: string, crossOrigin?: boolean) {
  if (typeof document === "undefined" || !href) return;
  const selector = `link[rel="${rel}"][href="${href}"]`;
  if (document.head.querySelector(selector)) return;
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (crossOrigin) link.crossOrigin = "anonymous";
  document.head.appendChild(link);
}

function getConnectionInfo() {
  if (typeof navigator === "undefined") return null;
  return navigator as NavigatorWithConnection;
}

export function canRunSpeculativeWork() {
  if (typeof document !== "undefined" && document.visibilityState === "hidden") return false;
  const navigatorInfo = getConnectionInfo();
  const connection = navigatorInfo?.connection;
  if (connection?.saveData) return false;
  if (connection?.effectiveType && /(^|-)2g$|slow-2g/i.test(connection.effectiveType)) return false;
  if (typeof navigatorInfo?.deviceMemory === "number" && navigatorInfo.deviceMemory <= 4) return false;
  return true;
}

export function shouldAutoPrefetchCatalog(totalProducts: number) {
  if (!canRunSpeculativeWork()) return false;
  if (typeof window !== "undefined" && PUBLIC_API_BASE_URL) {
    try {
      const apiOrigin = new URL(PUBLIC_API_BASE_URL, window.location.origin).origin;
      if (apiOrigin !== window.location.origin) return false;
    } catch {
      return false;
    }
  }
  return totalProducts <= 50_000;
}

export function hydrateCriticalQueryCache() {
  const bootstrap = readPersistedQuery(queryKeys.bootstrap, PERSIST_TTL.bootstrap);
  if (bootstrap) {
    queryClient.setQueryData(queryKeys.bootstrap, bootstrap.data, { updatedAt: bootstrap.updatedAt });
  }

  const cityList = readPersistedQuery(queryKeys.cityList, PERSIST_TTL.cityList);
  if (cityList) {
    queryClient.setQueryData(queryKeys.cityList, cityList.data, { updatedAt: cityList.updatedAt });
  }
}

export function primeNetworkHints() {
  if (typeof window === "undefined") return;

  const candidates = new Set<string>();
  if (PUBLIC_API_BASE_URL) {
    candidates.add(new URL(PUBLIC_API_BASE_URL, window.location.origin).origin);
  }

  for (const origin of candidates) {
    injectResourceHint("dns-prefetch", origin);
    injectResourceHint("preconnect", origin, true);
  }
}

export function scheduleAppWarmup() {
  if (typeof window === "undefined" || !canRunSpeculativeWork()) return;

  scheduleIdle(() => {
    void prefetchCityList();
  }, 8000);
}
