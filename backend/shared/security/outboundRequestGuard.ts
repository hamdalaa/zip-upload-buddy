import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { TextDecoder } from "node:util";
import { catalogConfig } from "../config.js";
import { extractDomain, extractRootDomain } from "../catalog/normalization.js";

const decoder = new TextDecoder();
const TEST_ONLY_HOST_SUFFIXES = [".test", ".example", ".invalid"];

export interface GuardedFetchOptions {
  accept: string;
  init?: RequestInit;
  allowedRootDomain?: string;
}

export async function guardedFetch(url: string, options: GuardedFetchOptions): Promise<Response> {
  const maxRedirects = catalogConfig.outbound.maxRedirects;
  let currentUrl = normalizeAndValidateUrl(url);
  let redirectCount = 0;

  while (true) {
    await assertSafeOutboundTarget(currentUrl);
    if (options.allowedRootDomain && !isAllowedRootDomain(currentUrl, options.allowedRootDomain)) {
      throw new Error(`Blocked outbound redirect to unexpected domain: ${currentUrl.toString()}`);
    }

    const response = await fetch(currentUrl, {
      ...options.init,
      redirect: "manual",
      headers: {
        accept: options.accept,
        ...(options.init?.headers ?? {}),
      },
    });

    if (!isRedirectStatus(response.status)) {
      return response;
    }

    const location = response.headers.get("location");
    if (!location) {
      throw new Error(`Redirect response missing location header for ${currentUrl.toString()}`);
    }
    if (redirectCount >= maxRedirects) {
      throw new Error(`Too many redirects while fetching ${url}`);
    }

    currentUrl = normalizeAndValidateUrl(location, currentUrl);
    redirectCount += 1;
  }
}

export async function readTextResponseBounded(response: Response): Promise<string> {
  const maxBytes = catalogConfig.outbound.maxResponseBytes;
  enforceContentLengthLimit(response, maxBytes);

  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      throw new Error(`Outbound response exceeded ${maxBytes} bytes.`);
    }
    chunks.push(value);
  }

  if (chunks.length === 1) {
    return decoder.decode(chunks[0]);
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return decoder.decode(merged);
}

export async function readJsonResponseBounded<T>(response: Response): Promise<T> {
  const text = await readTextResponseBounded(response);
  return JSON.parse(text) as T;
}

export function normalizeAndValidateUrl(rawUrl: string, baseUrl?: URL): URL {
  let parsed: URL;
  try {
    parsed = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);
  } catch {
    throw new Error(`Invalid outbound URL: ${rawUrl}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Blocked outbound URL with unsupported protocol: ${parsed.protocol}`);
  }
  if (parsed.username || parsed.password) {
    throw new Error("Blocked outbound URL containing credentials.");
  }
  if (!parsed.hostname) {
    throw new Error("Blocked outbound URL without hostname.");
  }

  return parsed;
}

export async function assertSafeOutboundTarget(url: URL): Promise<void> {
  const hostname = url.hostname.toLowerCase();
  const ipVersion = isIP(hostname);

  if (isBlockedHostname(hostname)) {
    throw new Error(`Blocked outbound hostname: ${hostname}`);
  }

  if (ipVersion > 0) {
    if (isForbiddenIpAddress(hostname)) {
      throw new Error(`Blocked outbound IP address: ${hostname}`);
    }
    return;
  }

  if (shouldAllowTestHostname(hostname)) {
    return;
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true });
  if (resolved.length === 0) {
    throw new Error(`Unable to resolve outbound hostname: ${hostname}`);
  }

  for (const entry of resolved) {
    if (isForbiddenIpAddress(entry.address)) {
      throw new Error(`Blocked outbound hostname ${hostname} resolving to forbidden IP ${entry.address}`);
    }
  }
}

function enforceContentLengthLimit(response: Response, maxBytes: number) {
  const contentLength = response.headers.get("content-length");
  if (!contentLength) return;
  const parsed = Number(contentLength);
  if (Number.isFinite(parsed) && parsed > maxBytes) {
    throw new Error(`Outbound response content-length ${parsed} exceeded ${maxBytes} bytes.`);
  }
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function isAllowedRootDomain(url: URL, expectedRootDomain: string): boolean {
  const actualDomain = extractDomain(url.toString());
  if (!actualDomain) return false;
  return extractRootDomain(actualDomain) === expectedRootDomain;
}

function isBlockedHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  );
}

function shouldAllowTestHostname(hostname: string): boolean {
  if (process.env.NODE_ENV !== "test") return false;
  return TEST_ONLY_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
}

function isForbiddenIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isForbiddenIpv4(address);
  if (version === 6) return isForbiddenIpv6(address);
  return true;
}

function isForbiddenIpv4(address: string): boolean {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a = -1, b = -1, c = -1] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 192 && b === 0 && c === 2) return true;
  if (a === 198 && b >= 18 && b <= 19) return true;
  if (a === 198 && b === 51 && c === 100) return true;
  if (a === 203 && b === 0 && c === 113) return true;
  if (a >= 224) return true;
  return false;
}

function isForbiddenIpv6(address: string): boolean {
  const normalized = address.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fe80:") ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("2001:db8:") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:192.168.") ||
    normalized.startsWith("::ffff:172.")
  );
}
