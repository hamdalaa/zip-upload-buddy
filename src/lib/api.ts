/**
 * Public backend base URL. Leave this empty in production so browser requests
 * stay same-origin (`/public/*`) behind the VPS reverse proxy. Local dev keeps
 * working through the Vite proxy unless VITE_PUBLIC_API_BASE_URL is set.
 */
export const PUBLIC_API_BASE_URL: string = (() => {
  const raw = (import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "";
})();

interface JsonCacheEntry {
  payload: unknown;
  expiresAt: number;
  staleUntil: number;
}

const inflightGetRequests = new Map<string, Promise<unknown>>();
const responseCache = new Map<string, JsonCacheEntry>();
const MAX_RESPONSE_CACHE_ENTRIES = 120;

function isCacheableJsonGet(method: string | undefined, init?: RequestInit) {
  return (!method || method.toUpperCase() === "GET") && !init?.body && init?.cache !== "no-store";
}

function clonePayload<T>(payload: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(payload);
  }
  return JSON.parse(JSON.stringify(payload)) as T;
}

function parseCacheControl(value: string | null) {
  if (!value) return null;
  const maxAgeMatch = value.match(/max-age=(\d+)/i);
  const swrMatch = value.match(/stale-while-revalidate=(\d+)/i);
  if (!maxAgeMatch && !swrMatch) return null;

  const maxAgeMs = maxAgeMatch ? Number(maxAgeMatch[1]) * 1000 : 0;
  const staleWhileRevalidateMs = swrMatch ? Number(swrMatch[1]) * 1000 : 0;
  return { maxAgeMs, staleWhileRevalidateMs };
}

function pruneResponseCache() {
  const now = Date.now();
  for (const [key, entry] of responseCache.entries()) {
    if (entry.staleUntil <= now) {
      responseCache.delete(key);
    }
  }

  while (responseCache.size > MAX_RESPONSE_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (!oldestKey) break;
    responseCache.delete(oldestKey);
  }
}

/**
 * Resolve a request input against the public backend base URL.
 * - Absolute URLs (http/https) are returned as-is.
 * - Strings starting with `/` are prefixed with the backend base.
 * - URL objects pass through untouched.
 */
function resolveRequestUrl(input: RequestInfo | URL): RequestInfo | URL {
  if (typeof input !== "string") return input;
  if (/^https?:\/\//i.test(input)) return input;
  if (!PUBLIC_API_BASE_URL) return input;
  if (input.startsWith("/")) return `${PUBLIC_API_BASE_URL}${input}`;
  return input;
}

function getRequestCacheKey(input: RequestInfo | URL, init?: RequestInit) {
  if (!isCacheableJsonGet(init?.method, init)) return null;
  const resolved = resolveRequestUrl(input);
  if (typeof resolved === "string") return resolved;
  if (resolved instanceof URL) return resolved.toString();
  return null;
}

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

export async function fetchJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const cacheKey = getRequestCacheKey(input, init);
  const now = Date.now();

  if (cacheKey) {
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      return clonePayload(cached.payload) as T;
    }
    if (cached && cached.staleUntil > now) {
      if (!inflightGetRequests.has(cacheKey)) {
        void fetchJson<T>(input, {
          ...init,
          cache: "no-store",
        }).catch(() => {
          // Ignore background refresh failures.
        });
      }
      return clonePayload(cached.payload) as T;
    }

    const inflight = inflightGetRequests.get(cacheKey);
    if (inflight) {
      return inflight as Promise<T>;
    }
  }

  const runRequest = async () => {
    const response = await fetch(resolveRequestUrl(input), {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const message =
        typeof payload === "object" && payload && "error" in payload
          ? String((payload as { error?: unknown }).error)
          : `Request failed with status ${response.status}`;
      throw new ApiError(message, response.status, payload);
    }

    if (cacheKey && isJson) {
      const policy = parseCacheControl(response.headers.get("cache-control"));
      if (policy && (policy.maxAgeMs > 0 || policy.staleWhileRevalidateMs > 0)) {
        responseCache.set(cacheKey, {
          payload,
          expiresAt: Date.now() + policy.maxAgeMs,
          staleUntil: Date.now() + policy.maxAgeMs + policy.staleWhileRevalidateMs,
        });
        pruneResponseCache();
      }
    }

    return payload as T;
  };

  const promise = runRequest();
  if (cacheKey) inflightGetRequests.set(cacheKey, promise);

  try {
    return await promise;
  } finally {
    if (cacheKey) inflightGetRequests.delete(cacheKey);
  }
}

export function withQuery(path: string, query: Record<string, string | number | boolean | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === "") continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
