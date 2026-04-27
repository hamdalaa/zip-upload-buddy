import { extractDomain, extractRootDomain } from "./normalization.js";

const SCRAPE_EXCLUDED_REASON_PREFIX = "scrape_excluded:";

const SCRAPE_EXCLUDED_HOSTNAMES = new Set([
  "junaid-phone.odoo.com",
]);

const SCRAPE_EXCLUDED_ROOT_DOMAINS = new Set([
  "cbazar.net",
  "dashsecureai.com",
  "sarmadstore-iq.com",
  "abraj-alahram.com",
  "mtciraq.com",
  "opticalnetiq.com",
]);

export interface ScrapeExclusionMatch {
  kind: "hostname" | "rootDomain" | "manual";
  value: string;
}

export function getScrapeExclusionMatch(url?: string): ScrapeExclusionMatch | undefined {
  if (!url) return undefined;
  const hostname = extractDomain(url);
  if (!hostname) return undefined;

  if (SCRAPE_EXCLUDED_HOSTNAMES.has(hostname)) {
    return {
      kind: "hostname",
      value: hostname,
    };
  }

  const rootDomain = extractRootDomain(hostname);
  if (SCRAPE_EXCLUDED_ROOT_DOMAINS.has(rootDomain)) {
    return {
      kind: "rootDomain",
      value: rootDomain,
    };
  }

  return undefined;
}

export function isScrapeExcludedWebsite(url?: string): boolean {
  return Boolean(getScrapeExclusionMatch(url));
}

export function getManualScrapeExclusionMatch(blockedReason?: string): ScrapeExclusionMatch | undefined {
  if (!blockedReason?.startsWith(SCRAPE_EXCLUDED_REASON_PREFIX)) return undefined;
  return {
    kind: "manual",
    value: blockedReason.slice(SCRAPE_EXCLUDED_REASON_PREFIX.length) || "manual",
  };
}

export function getStoreScrapeExclusionMatch(store: {
  website?: string;
  blockedReason?: string;
}): ScrapeExclusionMatch | undefined {
  return getManualScrapeExclusionMatch(store.blockedReason) ?? getScrapeExclusionMatch(store.website);
}

export function isScrapeExcludedStore(store: {
  website?: string;
  blockedReason?: string;
}): boolean {
  return Boolean(getStoreScrapeExclusionMatch(store));
}
