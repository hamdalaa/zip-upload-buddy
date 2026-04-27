import { ApiError, PUBLIC_API_BASE_URL } from "./api";
import type {
  AdminAuditLog,
  AdminCatalogStats,
  AdminCoverageSummary,
  AdminDomainEvidence,
  AdminHealth,
  AdminPullProductsJob,
  AdminPullProductsJobAccepted,
  AdminSessionState,
  AdminSiteSettings,
  AdminSiteSettingsPayload,
  AdminStoreListResponse,
} from "./adminTypes";

const CSRF_HEADER = "x-admin-csrf";
const adminApiBaseUrl =
  (import.meta.env.VITE_ADMIN_API_BASE_URL as string | undefined)?.trim()?.replace(/\/+$/, "") ||
  PUBLIC_API_BASE_URL;

let adminCsrfToken: string | null = null;

function toAdminUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return adminApiBaseUrl ? `${adminApiBaseUrl}${normalizedPath}` : normalizedPath;
}

function isUnsafeMethod(method?: string) {
  const normalized = (method ?? "GET").toUpperCase();
  return !["GET", "HEAD", "OPTIONS"].includes(normalized);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    const message =
      typeof payload === "object" && payload && "error" in payload
        ? String((payload as { error?: unknown }).error)
        : `Request failed with status ${response.status}`;
    throw new ApiError(message, response.status, payload);
  }
  return payload as T;
}

async function ensureAdminCsrfToken() {
  if (adminCsrfToken) return adminCsrfToken;
  const session = await getAdminSession();
  if (!session.authenticated || !session.csrfToken) {
    throw new ApiError("admin_session_required", 401, session);
  }
  return session.csrfToken;
}

async function adminFetchJson<T>(path: string, init?: RequestInit, retries = 2): Promise<T> {
  const method = init?.method ?? "GET";
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (isUnsafeMethod(method)) {
    headers[CSRF_HEADER] = await ensureAdminCsrfToken();
  }

  try {
    const response = await fetch(toAdminUrl(path), {
      ...init,
      method,
      credentials: "include",
      headers,
    });
    return await parseJsonResponse<T>(response);
  } catch (error) {
    const shouldRetry =
      retries > 0 &&
      (!(error instanceof ApiError) || error.status >= 500);
    if (shouldRetry) {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      return adminFetchJson<T>(path, init, retries - 1);
    }
    throw error;
  }
}

export async function loginAdmin(secret: string) {
  const response = await fetch(toAdminUrl("/internal/auth/login"), {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({ secret }),
  });
  const payload = await parseJsonResponse<{ ok: boolean; csrfToken: string; expiresAt: string }>(response);
  adminCsrfToken = payload.csrfToken;
  return payload;
}

export async function getAdminSession(): Promise<AdminSessionState> {
  const response = await fetch(toAdminUrl("/internal/auth/session"), {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const payload = await parseJsonResponse<AdminSessionState>(response);
  adminCsrfToken = payload.authenticated ? payload.csrfToken ?? null : null;
  return payload;
}

export async function logoutAdmin() {
  await adminFetchJson<{ ok: boolean }>("/internal/auth/logout", { method: "POST" }, 0);
  adminCsrfToken = null;
}

export function getAdminHealth() {
  return adminFetchJson<AdminHealth>("/internal/health");
}

export function getAdminCatalogStats() {
  return adminFetchJson<AdminCatalogStats>("/internal/catalog/stats");
}

export function getIndexedStores(query?: { q?: string; limit?: number; offset?: number }) {
  const url = new URL("/internal/stores/with-products", "https://admin.local");
  if (query?.q) url.searchParams.set("q", query.q);
  if (query?.limit) url.searchParams.set("limit", String(query.limit));
  if (query?.offset) url.searchParams.set("offset", String(query.offset));
  return adminFetchJson<AdminStoreListResponse>(`${url.pathname}${url.search}`);
}

export function getMissingProductStores(query?: { q?: string; status?: string; limit?: number; offset?: number }) {
  const url = new URL("/internal/stores/missing-products", "https://admin.local");
  if (query?.q) url.searchParams.set("q", query.q);
  if (query?.status) url.searchParams.set("status", query.status);
  if (query?.limit) url.searchParams.set("limit", String(query.limit));
  if (query?.offset) url.searchParams.set("offset", String(query.offset));
  return adminFetchJson<AdminStoreListResponse>(`${url.pathname}${url.search}`);
}

export function getStoreDetail(storeId: string) {
  return adminFetchJson<{ store: Record<string, unknown>; connectorProfile?: unknown; size?: unknown }>(`/internal/stores/${encodeURIComponent(storeId)}`);
}

export function updateStore(storeId: string, body: Record<string, unknown>) {
  return adminFetchJson<{ store: Record<string, unknown>; connectorProfile?: unknown; size?: unknown }>(`/internal/stores/${encodeURIComponent(storeId)}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, 0);
}

export function getCoverageSummary() {
  return adminFetchJson<AdminCoverageSummary>("/internal/coverage/summary");
}

export function getCoverageBacklog() {
  return adminFetchJson<AdminDomainEvidence[]>("/internal/domains/backlog");
}

export function getDomainEvidence(storeId: string) {
  return adminFetchJson<AdminDomainEvidence>(`/internal/domains/${encodeURIComponent(storeId)}/evidence`);
}

export function probeStore(storeId: string) {
  return adminFetchJson(`/internal/stores/${encodeURIComponent(storeId)}/probe`, { method: "POST" }, 0);
}

export function syncStore(storeId: string) {
  return adminFetchJson(`/internal/stores/${encodeURIComponent(storeId)}/sync`, { method: "POST" }, 0);
}

export function triggerCurrentSync(body?: { limit?: number; concurrency?: number; dedupeByDomain?: boolean; officialOnly?: boolean }) {
  return adminFetchJson("/internal/catalog/sync-current", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }, 0);
}

export function triggerRetryFailed(body?: { includeZeroProducts?: boolean; limit?: number; concurrency?: number }) {
  return adminFetchJson("/internal/catalog/retry-failed", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }, 0);
}

export function triggerStoreIntake(body: Record<string, unknown>) {
  return adminFetchJson("/internal/stores/intake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, 0);
}

export function registerDomainSession(storeId: string, body: Record<string, unknown>) {
  return adminFetchJson(`/internal/domains/${encodeURIComponent(storeId)}/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, 0);
}

export function configureFeedSync(storeId: string, body: Record<string, unknown>) {
  return adminFetchJson(`/internal/domains/${encodeURIComponent(storeId)}/feed-sync`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, 0);
}

export function internalSearch(query: { q: string; limit?: number; storeId?: string }) {
  const url = new URL("/internal/search", "https://admin.local");
  url.searchParams.set("q", query.q);
  if (query.limit) url.searchParams.set("limit", String(query.limit));
  if (query.storeId) url.searchParams.set("storeId", query.storeId);
  return adminFetchJson<{ total: number; hits: Array<Record<string, unknown>> }>(`${url.pathname}${url.search}`);
}

export function triggerProductPull(body?: {
  concurrency?: number;
  currentLimit?: number;
  zeroLimit?: number;
  includeZeroProducts?: boolean;
  includeUnofficial?: boolean;
}) {
  return adminFetchJson<AdminPullProductsJobAccepted>("/internal/catalog/pull-products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }, 0);
}

export function getProductPullJob(jobId: string) {
  return getCatalogJob(jobId);
}

export function triggerPullStoreUrl(body: {
  website: string;
  name?: string;
  city?: string;
  cityAr?: string;
  area?: string;
  primaryCategory?: string;
  note?: string;
  highPriority?: boolean;
}) {
  return adminFetchJson<AdminPullProductsJobAccepted>("/internal/catalog/pull-store-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }, 0);
}

export function triggerStoreByStoreUpdate(body?: {
  limit?: number;
  concurrency?: number;
  dedupeByDomain?: boolean;
  officialOnly?: boolean;
  includeZeroProducts?: boolean;
  zeroLimit?: number;
  includeUnofficial?: boolean;
}) {
  return adminFetchJson<AdminPullProductsJobAccepted>("/internal/catalog/update-stores", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  }, 0);
}

export function getCatalogJob(jobId: string) {
  return adminFetchJson<AdminPullProductsJob>(`/internal/catalog/jobs/${encodeURIComponent(jobId)}`);
}

export function getSiteSettings() {
  return adminFetchJson<AdminSiteSettings>("/internal/settings/site");
}

export function updateSiteSettings(payload: AdminSiteSettingsPayload) {
  return adminFetchJson<AdminSiteSettings>("/internal/settings/site", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  }, 0);
}

export function getAuditLogs(query?: { limit?: number; offset?: number }) {
  const url = new URL("/internal/audit-logs", "https://admin.local");
  if (query?.limit) url.searchParams.set("limit", String(query.limit));
  if (query?.offset) url.searchParams.set("offset", String(query.offset));
  return adminFetchJson<{ items: AdminAuditLog[]; limit: number; offset: number }>(`${url.pathname}${url.search}`);
}
