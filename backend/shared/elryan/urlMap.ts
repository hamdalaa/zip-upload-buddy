import fs from "node:fs";
import path from "node:path";

interface ElryanUrlEntry {
  url?: string;
}

export interface ElryanUrlMap {
  path: string;
  size: number;
  urlsByKey: Map<string, string>;
}

let cachedMap: ElryanUrlMap | null | undefined;

export function loadElryanUrlMap() {
  if (cachedMap !== undefined) return cachedMap;

  for (const candidate of getElryanUrlMapCandidates()) {
    const resolved = path.resolve(candidate);
    if (!fs.existsSync(resolved)) continue;

    try {
      const parsed = JSON.parse(fs.readFileSync(resolved, "utf8")) as ElryanUrlEntry[];
      const urlsByKey = buildUrlMap(parsed);
      cachedMap = {
        path: resolved,
        size: urlsByKey.size,
        urlsByKey,
      };
      return cachedMap;
    } catch {
      continue;
    }
  }

  cachedMap = null;
  return cachedMap;
}

export function resolveElryanMappedUrl(keys: Array<string | undefined>, urlMap = loadElryanUrlMap()) {
  if (!urlMap) return undefined;
  for (const key of keys) {
    const normalized = normalizeUrlKey(key);
    if (!normalized) continue;
    const mapped = urlMap.urlsByKey.get(normalized);
    if (mapped) return mapped;
  }
  return undefined;
}

export function resetElryanUrlMapCacheForTests() {
  cachedMap = undefined;
}

function getElryanUrlMapCandidates() {
  return [
    process.env.CATALOG_ELRYAN_URL_MAP_PATH,
    "/root/apps/iraq-catalog-backend/shared/catalog-output/elryan/real_product_urls.json",
    "/Volumes/SSD/elryan/real_product_urls.json",
    ".catalog-output/elryan/real_product_urls.json",
  ].filter((value): value is string => Boolean(value));
}

function buildUrlMap(entries: ElryanUrlEntry[]) {
  const urlsByKey = new Map<string, string>();
  for (const entry of entries) {
    const url = entry.url?.trim();
    if (!url) continue;
    const keys = getUrlKeys(url);
    for (const key of keys) {
      if (!urlsByKey.has(key)) urlsByKey.set(key, url);
    }
  }
  return urlsByKey;
}

function getUrlKeys(value: string) {
  try {
    const parsed = new URL(value);
    const pathname = decodeURIComponent(parsed.pathname);
    const basename = pathname.split("/").filter(Boolean).at(-1);
    return [
      normalizeUrlKey(pathname),
      normalizeUrlKey(basename),
      normalizeUrlKey(basename?.replace(/\.html$/i, "")),
    ].filter((key): key is string => Boolean(key));
  } catch {
    return [
      normalizeUrlKey(value),
      normalizeUrlKey(value.split("/").filter(Boolean).at(-1)),
    ].filter((key): key is string => Boolean(key));
  }
}

function normalizeUrlKey(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const withoutOrigin = trimmed.replace(/^https?:\/\/(?:www\.)?elryan\.com\/ar\/?/i, "");
  const withoutLeadingSlash = withoutOrigin.replace(/^\/+/, "").replace(/^ar\//i, "");
  return withoutLeadingSlash.toLowerCase();
}
