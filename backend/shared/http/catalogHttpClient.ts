import { catalogConfig } from "../config.js";

export interface CatalogHttpClientSession {
  cookiesJson?: string;
  headers?: Record<string, string>;
}

export interface CatalogHttpClientOptions {
  /** Maximum total attempts per URL across protocol fallbacks. */
  maxAttempts?: number;
  /** Per-attempt timeout in ms. */
  timeoutMs?: number;
  /** Base delay (ms) for exponential backoff between retries. */
  backoffBaseMs?: number;
  /** Optional override for fetch (test injection). */
  fetchImpl?: typeof fetch;
}

/**
 * Categorized HTTP error so coverage / lifecycle classification can decide
 * whether a domain is dead, blocked, rate-limited, or just transiently failing.
 */
export class CatalogHttpError extends Error {
  readonly url: string;
  readonly status?: number;
  readonly category:
    | "dns_failure"
    | "network_failure"
    | "timeout"
    | "rate_limited"
    | "challenge"
    | "login_wall"
    | "password_wall"
    | "not_found"
    | "server_error"
    | "client_error";

  constructor(args: {
    url: string;
    message: string;
    status?: number;
    category: CatalogHttpError["category"];
    cause?: unknown;
  }) {
    super(args.message, args.cause ? { cause: args.cause } : undefined);
    this.name = "CatalogHttpError";
    this.url = args.url;
    this.status = args.status;
    this.category = args.category;
  }
}

/** Status codes that justify another attempt. */
const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BACKOFF_BASE_MS = 350;

export class CatalogHttpClient {
  private readonly maxAttempts: number;
  private readonly timeoutMs: number;
  private readonly backoffBaseMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(
    private readonly session?: CatalogHttpClientSession,
    options?: CatalogHttpClientOptions,
  ) {
    this.maxAttempts = Math.max(1, options?.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
    this.timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.backoffBaseMs = options?.backoffBaseMs ?? DEFAULT_BACKOFF_BASE_MS;
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  async fetchText(url: string): Promise<string> {
    const response = await this.fetchWithRetry(
      url,
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    );
    return response.text();
  }

  async fetchJson(url: string): Promise<unknown> {
    const response = await this.fetchWithRetry(url, "application/json,text/plain,*/*");
    return response.json();
  }

  withSession(session?: CatalogHttpClientSession): CatalogHttpClient {
    return new CatalogHttpClient(session, {
      maxAttempts: this.maxAttempts,
      timeoutMs: this.timeoutMs,
      backoffBaseMs: this.backoffBaseMs,
      fetchImpl: this.fetchImpl,
    });
  }

  private async fetchWithRetry(url: string, accept: string): Promise<Response> {
    const candidates = buildFetchCandidates(url);
    let lastError: Error | undefined;
    let attempts = 0;

    for (const candidate of candidates) {
      for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
        attempts++;
        try {
          const response = await this.fetchImpl(candidate, {
            headers: {
              "user-agent": catalogConfig.probeUserAgent,
              accept,
              "accept-language": "en-US,en;q=0.9,ar-IQ;q=0.8,ar;q=0.7",
              "cache-control": "no-cache",
              pragma: "no-cache",
              referer: candidate,
              ...(this.session?.headers ?? {}),
              ...(this.session?.cookiesJson ? { cookie: this.session.cookiesJson } : {}),
            },
            signal: AbortSignal.timeout(this.timeoutMs),
            redirect: "follow",
          });

          if (response.ok) return response;

          // Decide if we should retry this status code.
          if (TRANSIENT_STATUS.has(response.status) && attempt < this.maxAttempts) {
            await wait(this.backoffMs(attempt, response));
            continue;
          }

          // Non-retriable HTTP status — translate to a categorized error.
          throw classifyHttpStatus(candidate, response);
        } catch (error) {
          lastError = normalizeError(candidate, error);
          // Only keep retrying transient errors on this candidate; otherwise fall through.
          if (
            attempt < this.maxAttempts &&
            lastError instanceof CatalogHttpError &&
            (lastError.category === "timeout" ||
              lastError.category === "network_failure" ||
              lastError.category === "rate_limited" ||
              lastError.category === "server_error")
          ) {
            await wait(this.backoffMs(attempt));
            continue;
          }
          break;
        }
      }
    }

    throw lastError ?? new CatalogHttpError({
      url,
      message: `Failed to fetch ${url} after ${attempts} attempts.`,
      category: "network_failure",
    });
  }

  private backoffMs(attempt: number, response?: Response): number {
    if (response) {
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (Number.isFinite(seconds) && seconds > 0) {
          return Math.min(seconds * 1000, 5_000);
        }
      }
    }
    const jitter = Math.floor(Math.random() * this.backoffBaseMs);
    return this.backoffBaseMs * 2 ** (attempt - 1) + jitter;
  }
}

function buildFetchCandidates(url: string): string[] {
  const candidates = [url];
  if (url.startsWith("https://")) candidates.push(`http://${url.slice("https://".length)}`);
  else if (url.startsWith("http://")) candidates.push(`https://${url.slice("http://".length)}`);
  return [...new Set(candidates)];
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function classifyHttpStatus(url: string, response: Response): CatalogHttpError {
  const status = response.status;
  const message = `HTTP ${status} from ${url}`;
  if (status === 401) {
    return new CatalogHttpError({ url, status, message, category: "login_wall" });
  }
  if (status === 402) {
    return new CatalogHttpError({ url, status, message, category: "password_wall" });
  }
  if (status === 403) {
    return new CatalogHttpError({ url, status, message, category: "challenge" });
  }
  if (status === 404 || status === 410) {
    return new CatalogHttpError({ url, status, message, category: "not_found" });
  }
  if (status === 429) {
    return new CatalogHttpError({ url, status, message, category: "rate_limited" });
  }
  if (status >= 500) {
    return new CatalogHttpError({ url, status, message, category: "server_error" });
  }
  return new CatalogHttpError({ url, status, message, category: "client_error" });
}

function normalizeError(url: string, error: unknown): CatalogHttpError {
  if (error instanceof CatalogHttpError) return error;
  if (error instanceof Error) {
    const message = error.message;
    if (/aborted|timeout/i.test(message) || error.name === "TimeoutError") {
      return new CatalogHttpError({ url, message: `Timeout fetching ${url}`, category: "timeout", cause: error });
    }
    if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)) {
      return new CatalogHttpError({ url, message: `DNS failure for ${url}`, category: "dns_failure", cause: error });
    }
    if (/ECONNRESET|ECONNREFUSED|EPIPE|socket hang up|fetch failed/i.test(message)) {
      return new CatalogHttpError({
        url,
        message: `Network failure for ${url}: ${message}`,
        category: "network_failure",
        cause: error,
      });
    }
    return new CatalogHttpError({
      url,
      message: `Fetch error for ${url}: ${message}`,
      category: "network_failure",
      cause: error,
    });
  }
  return new CatalogHttpError({
    url,
    message: `Unknown fetch failure for ${url}`,
    category: "network_failure",
    cause: error,
  });
}
