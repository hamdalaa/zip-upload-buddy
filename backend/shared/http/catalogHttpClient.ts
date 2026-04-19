import { catalogConfig } from "../config.js";

export interface CatalogHttpClientSession {
  cookiesJson?: string;
  headers?: Record<string, string>;
}

export class CatalogHttpClient {
  constructor(private readonly session?: CatalogHttpClientSession) {}

  async fetchText(url: string): Promise<string> {
    const response = await this.fetchWithRetry(url, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8");
    return response.text();
  }

  async fetchJson(url: string): Promise<unknown> {
    const response = await this.fetchWithRetry(url, "application/json,text/plain,*/*");
    return response.json();
  }

  private async fetchWithRetry(url: string, accept: string): Promise<Response> {
    const candidates = buildFetchCandidates(url);
    let lastError: Error | undefined;

    for (const candidate of candidates) {
      try {
        const response = await fetch(candidate, {
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
          signal: AbortSignal.timeout(20_000),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch ${candidate}: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }

    throw lastError ?? new Error(`Failed to fetch ${url}`);
  }

  withSession(session?: CatalogHttpClientSession): CatalogHttpClient {
    return new CatalogHttpClient(session);
  }
}

function buildFetchCandidates(url: string): string[] {
  const candidates = [url];
  if (url.startsWith("https://")) candidates.push(`http://${url.slice("https://".length)}`);
  else if (url.startsWith("http://")) candidates.push(`https://${url.slice("http://".length)}`);
  return [...new Set(candidates)];
}
