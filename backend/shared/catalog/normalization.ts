import { createHash, randomUUID } from "node:crypto";

const SECOND_LEVEL_SUFFIXES = new Set(["com.iq", "net.iq", "org.iq", "edu.iq", "gov.iq"]);
const SOCIAL_HOST_PATTERNS = [
  /(^|\.)facebook\.com$/i,
  /(^|\.)m\.facebook\.com$/i,
  /(^|\.)fb\.com$/i,
  /(^|\.)instagram\.com$/i,
  /(^|\.)tiktok\.com$/i,
  /(^|\.)x\.com$/i,
  /(^|\.)twitter\.com$/i,
  /(^|\.)snapchat\.com$/i,
  /(^|\.)linktr\.ee$/i,
  /(^|\.)solo\.to$/i,
  /(^|\.)t\.me$/i,
  /(^|\.)wa\.me$/i,
  /(^|\.)youtube\.com$/i,
  /(^|\.)youtu\.be$/i,
  /(^|\.)viber\.com$/i,
  /(^|\.)heylink\.me$/i,
  /(^|\.)instabio\.cc$/i,
  /(^|\.)opn\.so$/i,
];

export function nowIso(): string {
  return new Date().toISOString();
}

export function createId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function normalizeArabic(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ىئ]/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ـ/g, "");
}

export function normalizeText(input: string): string {
  return normalizeArabic(input.toLowerCase())
    .replace(/\s+/g, " ")
    .trim();
}

export function compactText(input: string): string {
  return normalizeText(input).replace(/[^\p{L}\p{N}]+/gu, "");
}

export function slugify(input: string): string {
  return normalizeText(input)
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function tokenizeModel(input: string): string[] {
  return normalizeText(input)
    .split(/[\s/_\-(),]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function parseNumberish(input: unknown): number | undefined {
  if (typeof input === "number" && Number.isFinite(input)) return input;
  if (typeof input !== "string") return undefined;
  const match = input.match(/-?\d[\d.,،]*/);
  if (!match) return undefined;
  let numeric = match[0].replace(/،/g, ",");
  const hasDot = numeric.includes(".");
  const hasComma = numeric.includes(",");

  if (hasDot && hasComma) {
    const lastDot = numeric.lastIndexOf(".");
    const lastComma = numeric.lastIndexOf(",");
    const decimalSeparator = lastDot > lastComma ? "." : ",";
    const thousandsSeparator = decimalSeparator === "." ? "," : ".";
    numeric = numeric
      .replace(new RegExp(`\\${thousandsSeparator}`, "g"), "")
      .replace(decimalSeparator, ".");
  } else if (hasDot && /^-?\d{1,3}(?:\.\d{3})+$/.test(numeric)) {
    numeric = numeric.replace(/\./g, "");
  } else if (hasComma && /^-?\d{1,3}(?:,\d{3})+$/.test(numeric)) {
    numeric = numeric.replace(/,/g, "");
  } else {
    numeric = numeric.replace(/,/g, "");
  }

  const parsed = Number(numeric);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function extractDomain(url: string): string | undefined {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

export function extractRootDomain(domain: string): string {
  const normalized = domain.replace(/^www\./, "").toLowerCase();
  const parts = normalized.split(".");
  if (parts.length <= 2) return normalized;
  const lastTwo = parts.slice(-2).join(".");
  const lastThree = parts.slice(-3).join(".");
  return SECOND_LEVEL_SUFFIXES.has(lastTwo) ? lastThree : lastTwo;
}

export function classifyWebsiteType(url?: string): "official" | "social" | "missing" {
  if (!url) return "missing";
  const normalized = normalizeWebsiteUrl(url);
  const domain = extractDomain(normalized);
  if (domain && SOCIAL_HOST_PATTERNS.some((pattern) => pattern.test(domain))) {
    return "social";
  }
  return "official";
}

export function sha256Hex(payload: Buffer | string): string {
  return createHash("sha256").update(payload).digest("hex");
}

export function normalizeWebsiteUrl(url?: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "www.google.com" && parsed.pathname === "/url") {
      const target = parsed.searchParams.get("url") ?? parsed.searchParams.get("q");
      if (target) return normalizeWebsiteUrl(target);
    }
    parsed.hash = "";
    if (SOCIAL_HOST_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
      return parsed.toString();
    }
    if (parsed.pathname === "/") parsed.search = "";
    return parsed.toString();
  } catch {
    return url.trim();
  }
}
