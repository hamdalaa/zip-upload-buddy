importScripts("/sw-manifest.js");

const manifest = self.__SW_MANIFEST || { version: "dev", assets: ["/", "/index.html"] };
const APP_SHELL_CACHE = `app-shell-${manifest.version}`;
const DATA_CACHE = "public-data-v4";
const STATIC_CACHE = "static-assets-v2";
const IMAGE_CACHE = "runtime-images-v1";
const ALL_CACHES = [APP_SHELL_CACHE, DATA_CACHE, STATIC_CACHE, IMAGE_CACHE];
const MAX_IMAGE_ENTRIES = 160;
const MAX_STATIC_ENTRIES = 120;

function isImmutableAsset(requestUrl) {
  return (
    requestUrl.origin === self.location.origin && (
      requestUrl.pathname.startsWith("/assets/") ||
      requestUrl.pathname.startsWith("/fonts/") ||
      requestUrl.pathname.endsWith(".woff2") ||
      requestUrl.pathname.endsWith(".woff") ||
      requestUrl.pathname.endsWith(".css") ||
      requestUrl.pathname.endsWith(".js") ||
      requestUrl.pathname.endsWith(".webp") ||
      requestUrl.pathname.endsWith(".avif")
    )
  );
}

function isTrustedRuntimeImage(request, requestUrl) {
  if (request.destination !== "image") return false;
  const host = requestUrl.hostname.replace(/^www\./, "");
  return (
    requestUrl.origin === self.location.origin ||
    host === "cdn.shopify.com" ||
    host === "cdn.miswag.me" ||
    host === "lh3.googleusercontent.com" ||
    host === "googleusercontent.com"
  );
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

function isCacheableResponse(response) {
  return response && (response.ok || response.type === "opaque");
}

function withTimeout(promise, timeoutMs) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("network timeout")), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
}

async function cacheFirstBounded(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (isCacheableResponse(response)) {
    cache.put(request, response.clone())
      .then(() => trimCache(cacheName, maxEntries))
      .catch(() => undefined);
  }
  return response;
}

function isLegacyCache(key) {
  return (
    key.startsWith("app-shell-") ||
    key.startsWith("public-data-") ||
    key.startsWith("static-assets-")
  ) && !ALL_CACHES.includes(key);
}

function isNavigationShellRequest(request, requestUrl) {
  return request.mode === "navigate" && requestUrl.origin === self.location.origin;
}

function isPublicApiRequest(requestUrl) {
  return requestUrl.origin === self.location.origin && requestUrl.pathname.startsWith("/public/");
}

function isRealtimePublicApiRequest(requestUrl) {
  return requestUrl.origin === self.location.origin && (
    requestUrl.pathname === "/public/search" ||
    requestUrl.pathname === "/public/bootstrap" ||
    requestUrl.pathname === "/public/bootstrap-lite" ||
    requestUrl.pathname === "/public/cities"
  );
}

function isStaticAssetRequest(requestUrl) {
  return isImmutableAsset(requestUrl);
}

function isAppShellAsset(asset) {
  return typeof asset === "string" && (
    asset === "/" ||
    asset === "/index.html" ||
    asset.startsWith("/fonts/") ||
    asset.endsWith(".css") ||
    asset.endsWith(".js")
  );
}

async function networkFirst(request, cacheName, timeoutMs, preloadResponsePromise) {
  const cache = await caches.open(cacheName);

  try {
    const preloadResponse = preloadResponsePromise ? await preloadResponsePromise : null;
    const response = preloadResponse || await fetchWithTimeout(request, timeoutMs);
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return caches.match("/index.html");
  }
}

function fetchWithTimeout(request, timeoutMs) {
  return withTimeout(fetch(request), timeoutMs);
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || networkPromise;
}

self.addEventListener("install", (event) => {
  const appShellAssets = manifest.assets.filter(isAppShellAsset);
  event.waitUntil(
    caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(appShellAssets)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter(isLegacyCache).map((key) => caches.delete(key)),
        ),
      ),
      self.registration.navigationPreload?.enable?.(),
    ]).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const requestUrl = new URL(request.url);

  if (isNavigationShellRequest(request, requestUrl)) {
    event.respondWith(networkFirst(request, APP_SHELL_CACHE, 3000, event.preloadResponse));
    return;
  }

  if (isRealtimePublicApiRequest(requestUrl)) {
    event.respondWith(networkFirst(request, DATA_CACHE, 4500));
    return;
  }

  if (isPublicApiRequest(requestUrl)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE));
    return;
  }

  if (isStaticAssetRequest(requestUrl)) {
    event.respondWith(cacheFirstBounded(request, STATIC_CACHE, MAX_STATIC_ENTRIES));
    return;
  }

  if (isTrustedRuntimeImage(request, requestUrl)) {
    event.respondWith(cacheFirstBounded(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES));
    return;
  }
});
