import { catalogConfig } from "../config.js";

export interface CatalogHttpClientSession {
  cookiesJson?: string;
  headers?: Record<string, string>;
}

export interface CatalogHttpClientLike {
  fetchText(url: string): Promise<string>;
  fetchJson(url: string, init?: RequestInit): Promise<unknown>;
  withSession(session?: CatalogHttpClientSession): CatalogHttpClientLike;
}

export class CatalogHttpClient implements CatalogHttpClientLike {
  constructor(private readonly session?: CatalogHttpClientSession) {}

  async fetchText(url: string): Promise<string> {
    const response = await this.fetchWithRetry(url, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    return response.text();
  }

  async fetchJson(url: string, init?: RequestInit): Promise<unknown> {
    const response = await this.fetchWithRetry(url, "application/json,text/plain,*/*", init);
    return response.json();
  }

  private async fetchWithRetry(url: string, accept: string, init?: RequestInit): Promise<Response> {
    const candidates = buildFetchCandidates(url);
    let lastError: Error | undefined;

    for (const candidate of candidates) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const response = await fetch(candidate, {
            method: init?.method ?? "GET",
            body: init?.body,
            headers: {
              "user-agent": catalogConfig.probeUserAgent,
              accept,
              "accept-language": "en-US,en;q=0.9,ar-IQ;q=0.8,ar;q=0.7",
              "cache-control": "no-cache",
              pragma: "no-cache",
              referer: candidate,
              ...(init?.headers ?? {}),
              ...(this.session?.headers ?? {}),
              ...(this.session?.cookiesJson ? { cookie: this.session.cookiesJson } : {}),
            },
            signal: init?.signal ?? AbortSignal.timeout(20_000),
          });

          if (shouldRetryStatus(response.status) && attempt < 2) {
            await sleep(resolveRetryDelayMs(response.headers.get("retry-after"), attempt));
            continue;
          }

          if (!response.ok) {
            throw new Error(`Failed to fetch ${candidate}: ${response.status}`);
          }

          return response;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          if (attempt < 2) {
            await sleep((attempt + 1) * 1000);
            continue;
          }
        }
      }
    }

    throw lastError ?? new Error(`Failed to fetch ${url}`);
  }

  withSession(session?: CatalogHttpClientSession): CatalogHttpClientLike {
    return new CatalogHttpClient(session);
  }
}

function buildFetchCandidates(url: string): string[] {
  const candidates = [url];
  if (url.startsWith("https://")) candidates.push(`http://${url.slice("https://".length)}`);
  else if (url.startsWith("http://")) candidates.push(`https://${url.slice("http://".length)}`);
  return [...new Set(candidates)];
}

function shouldRetryStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

function resolveRetryDelayMs(retryAfter: string | null, attempt: number): number {
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) {
      return seconds * 1000;
    }
    const targetAt = Date.parse(retryAfter);
    if (Number.isFinite(targetAt)) {
      return Math.max(targetAt - Date.now(), 1000);
    }
  }
  return Math.min(8000, 1000 * 2 ** attempt);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
