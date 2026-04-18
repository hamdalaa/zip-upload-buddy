import type { Area, Category, ProductIndex } from "./types";

// ============================================================
// Brand aliases — bilingual (en/ar) + common misspellings.
// Used for "brand intent" detection from a free-text query.
// ============================================================
const BRAND_ALIASES: Record<string, string[]> = {
  apple: ["apple", "ابل", "آبل", "ابيل", "iphone", "ايفون", "آيفون", "ipad", "ايباد", "macbook", "ماك", "airpods"],
  samsung: ["samsung", "سامسونج", "سامسونغ", "سامسنج", "galaxy", "جالكسي", "كالاكسي"],
  asus: ["asus", "اسوس", "أسوس", "ايسوس", "rog", "tuf", "zenbook"],
  msi: ["msi", "ام اس اي", "إم إس آي"],
  amd: ["amd", "ryzen", "رايزن", "رايزين", "radeon"],
  nvidia: ["nvidia", "rtx", "geforce", "gtx", "انفيديا", "نفيديا"],
  intel: ["intel", "core", "i3", "i5", "i7", "i9", "انتل", "إنتل"],
  anker: ["anker", "انكر", "أنكر", "انكور"],
  ugreen: ["ugreen", "يوغرين", "يو غرين"],
  "tp-link": ["tp-link", "tplink", "تي بي لينك", "تيبي لينك"],
  honor: ["honor", "هونر", "هونور"],
  xiaomi: ["xiaomi", "شاومي", "redmi", "ريدمي", "poco", "بوكو"],
  huawei: ["huawei", "هواوي", "هواوى"],
  oppo: ["oppo", "اوبو", "أوبو"],
  realme: ["realme", "ريلمي"],
  lenovo: ["lenovo", "لينوفو"],
  hp: ["hp", "اتش بي", "إتش بي"],
  dell: ["dell", "ديل"],
  acer: ["acer", "ايسر", "أيسر"],
  logitech: ["logitech", "لوجيتك"],
  razer: ["razer", "ريزر"],
  jbl: ["jbl", "جي بي ال"],
  sony: ["sony", "سوني", "سونى", "playstation", "بلايستيشن", "ps5", "ps4"],
};

// ============================================================
// Arabic normalization — collapses common variants so that
// "آيفون" / "ايفون" / "أيفون" all match the same key.
// ============================================================
function normalizeArabic(s: string): string {
  return s
    // strip diacritics (tashkeel)
    .replace(/[\u064B-\u065F\u0670]/g, "")
    // unify alef variants → ا
    .replace(/[إأآا]/g, "ا")
    // ya variants → ي
    .replace(/[ىئ]/g, "ي")
    // ta marbuta → ha
    .replace(/ة/g, "ه")
    // hamza on waw → و
    .replace(/ؤ/g, "و")
    // tatweel
    .replace(/ـ/g, "");
}

/** Compact form: lowercase + Arabic-normalized + strip non-alphanumerics. */
export function compact(s: string): string {
  return normalizeArabic(s.toLowerCase())
    .replace(/\s+/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

/** Tokenize on whitespace and common separators after normalization. */
export function tokens(s: string): string[] {
  return normalizeArabic(s.toLowerCase())
    .split(/[\s\-_/,.()×x]+/i)
    .filter(Boolean);
}

// Stop-words ignored when matching tokens (low signal).
const STOP = new Set([
  "the", "and", "for", "new", "with", "of", "in", "on", "to",
  "في", "من", "الى", "إلى", "على", "عن", "مع", "هذا", "هذه",
]);

function isMeaningful(t: string): boolean {
  if (STOP.has(t)) return false;
  // keep short tokens only if numeric (e.g. "4060", "i7", "ps5")
  if (t.length <= 2) return /\d/.test(t);
  return true;
}

/** Numeric tokens like model numbers — high-signal matches. */
function numbers(s: string): string[] {
  return Array.from(s.matchAll(/\d{2,}/g)).map((m) => m[0]);
}

/**
 * Levenshtein distance ≤ maxDist? Returns true if within budget.
 * Used for typo tolerance on tokens of length ≥ 4.
 */
function withinEditDistance(a: string, b: string, maxDist: number): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > maxDist) return false;
  const m = a.length;
  const n = b.length;
  // single row DP
  const prev = new Array(n + 1);
  const curr = new Array(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= n; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
      if (curr[j] < rowMin) rowMin = curr[j];
    }
    if (rowMin > maxDist) return false;
    for (let j = 0; j <= n; j++) prev[j] = curr[j];
  }
  return prev[n] <= maxDist;
}

function freshnessBonus(crawledAtISO: string): number {
  const days = (Date.now() - new Date(crawledAtISO).getTime()) / 86400_000;
  if (days <= 14) return 1.5;
  if (days <= 30) return 0.8;
  if (days <= 60) return 0.2;
  return 0;
}

export interface SearchOpts {
  q: string;
  area?: Area | "all";
  category?: Category | "all";
  sort?: "relevance" | "price" | "freshness" | "rating";
  includeStale?: boolean;
  /** Optional resolver: shopId → Google rating (0..5). Used when sort === "rating". */
  ratingByShopId?: (shopId: string) => number | undefined;
}

export interface ScoredProduct extends ProductIndex {
  score: number;
}

// ============================================================
// Scoring weights — single source of truth, easy to tune.
// ============================================================
const W = {
  exactPhrase: 12,        // full normalized query appears verbatim
  compactSubstring: 6,    // q (no spaces) is substring of name (no spaces)
  skuExact: 10,           // SKU compact-equals q
  skuPartial: 5,          // SKU contains q
  numericMatch: 4,        // each shared numeric token (e.g. "4060")
  brandIntent: 3,         // product brand matches inferred brand from query
  tokenExact: 2.2,        // each query token equals a name token
  tokenPrefix: 1.4,       // query token is prefix of name token (or vice-versa)
  tokenContains: 0.9,     // looser substring overlap
  tokenFuzzy: 0.7,        // Levenshtein-1 typo match
  shopMatch: 1.5,         // query overlaps shop name
  inStockBonus: 0.4,
};

// Minimum score for a result to be considered "meaningful" when q is non-empty.
const MIN_SCORE = 1.0;

export function searchProducts(products: ProductIndex[], opts: SearchOpts): ScoredProduct[] {
  const { q, area = "all", category = "all", sort = "relevance", includeStale = false, ratingByShopId } = opts;
  const qTrim = q.trim();
  const qCompact = compact(qTrim);
  const qTokens = tokens(qTrim).filter(isMeaningful);
  const qNums = numbers(qTrim);

  // Brand intent: which brand keys appear (compact-substring) in the query?
  const intentBrands = new Set<string>();
  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const a of aliases) {
      const ac = compact(a);
      if (ac && qCompact.includes(ac)) {
        intentBrands.add(brand);
        break;
      }
    }
  }

  // Pre-filter: area / category / staleness
  const filtered = products.filter((p) => {
    if (area !== "all" && p.area !== area) return false;
    if (category !== "all" && p.category !== category) return false;
    if (!includeStale && sort !== "freshness") {
      const days = (Date.now() - new Date(p.crawledAt).getTime()) / 86400_000;
      if (days > 60) return false;
    }
    return true;
  });

  const scored: ScoredProduct[] = filtered.map((p) => {
    if (!qTrim) return { ...p, score: freshnessBonus(p.crawledAt) };

    const nameCompact = compact(p.name);
    const nameTokens = tokens(p.name).filter(isMeaningful);
    const nameNums = numbers(p.name);
    const shopCompact = compact(p.shopName);
    const skuCompact = p.sku ? compact(p.sku) : "";

    let score = 0;

    // 1) Exact phrase / compact substring on the product name
    if (qCompact.length >= 2 && nameCompact.includes(qCompact)) {
      score += qCompact.length >= 4 ? W.exactPhrase : W.compactSubstring;
    }

    // 2) SKU matching — strongest precise signal
    if (skuCompact && qCompact.length >= 2) {
      if (skuCompact === qCompact) score += W.skuExact;
      else if (skuCompact.includes(qCompact) || qCompact.includes(skuCompact)) score += W.skuPartial;
    }

    // 3) Numeric tokens (model numbers like "4060", "256", "65")
    for (const n of qNums) {
      if (nameNums.includes(n)) score += W.numericMatch;
      else if (nameCompact.includes(n)) score += W.numericMatch * 0.6;
    }

    // 4) Token-level matching with tiered bonuses
    let tokenHits = 0;
    for (const qt of qTokens) {
      let best = 0;
      for (const nt of nameTokens) {
        if (qt === nt) { best = Math.max(best, W.tokenExact); continue; }
        if (nt.startsWith(qt) || qt.startsWith(nt)) { best = Math.max(best, W.tokenPrefix); continue; }
        if (nt.includes(qt) || qt.includes(nt)) { best = Math.max(best, W.tokenContains); continue; }
        // Fuzzy: only for alphabetic tokens of length ≥ 4 (avoid noisy digit fuzz)
        if (qt.length >= 4 && nt.length >= 4 && !/\d/.test(qt) && !/\d/.test(nt)) {
          if (withinEditDistance(qt, nt, 1)) best = Math.max(best, W.tokenFuzzy);
        }
      }
      if (best > 0) {
        score += best;
        tokenHits++;
      }
    }
    // Coverage bonus: reward when most query tokens were matched
    if (qTokens.length > 0) {
      const coverage = tokenHits / qTokens.length;
      if (coverage >= 0.75) score += 1.5;
      else if (coverage >= 0.5) score += 0.7;
    }

    // 5) Brand intent
    if (p.brand && intentBrands.has(p.brand.toLowerCase())) score += W.brandIntent;

    // 6) Shop-name overlap (e.g. user types a known shop)
    if (qCompact.length >= 3 && shopCompact.includes(qCompact)) score += W.shopMatch;

    // 7) Light bonuses
    if (p.inStock) score += W.inStockBonus;
    score += freshnessBonus(p.crawledAt);

    return { ...p, score };
  });

  const meaningful = qTrim ? scored.filter((p) => p.score >= MIN_SCORE) : scored;

  if (sort === "price") {
    return meaningful.sort((a, b) => (a.priceValue ?? Infinity) - (b.priceValue ?? Infinity));
  }
  if (sort === "freshness") {
    return meaningful.sort((a, b) => new Date(b.crawledAt).getTime() - new Date(a.crawledAt).getTime());
  }
  if (sort === "rating" && ratingByShopId) {
    return meaningful.sort((a, b) => {
      const ra = ratingByShopId(a.shopId) ?? -1;
      const rb = ratingByShopId(b.shopId) ?? -1;
      if (rb !== ra) return rb - ra;
      return b.score - a.score;
    });
  }
  // Tiebreak: score desc, then freshness desc, then price asc
  return meaningful.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const tDiff = new Date(b.crawledAt).getTime() - new Date(a.crawledAt).getTime();
    if (tDiff !== 0) return tDiff;
    return (a.priceValue ?? Infinity) - (b.priceValue ?? Infinity);
  });
}

/** Group results that look like the same product across different shops. */
export function groupComparable(results: ScoredProduct[]): {
  groups: { key: string; brand?: string; representativeName: string; items: ScoredProduct[] }[];
  loose: ScoredProduct[];
} {
  const buckets = new Map<string, ScoredProduct[]>();
  for (const r of results) {
    const sig = tokens(r.name).filter((t) => t.length > 2 && !STOP.has(t));
    const nums = numbers(r.name);
    // Key includes brand + top significant tokens + numeric model parts
    // (numbers strongly identify the same SKU across shops)
    const key = `${(r.brand ?? "").toLowerCase()}::${sig.slice(0, 4).sort().join("|")}::${nums.sort().join(",")}`;
    const arr = buckets.get(key) ?? [];
    arr.push(r);
    buckets.set(key, arr);
  }
  const groups: { key: string; brand?: string; representativeName: string; items: ScoredProduct[] }[] = [];
  const loose: ScoredProduct[] = [];
  for (const [key, items] of buckets) {
    if (items.length >= 2) {
      const sorted = [...items].sort((a, b) => (a.priceValue ?? Infinity) - (b.priceValue ?? Infinity));
      groups.push({ key, brand: sorted[0].brand, representativeName: sorted[0].name, items: sorted });
    } else {
      loose.push(items[0]);
    }
  }
  groups.sort((a, b) => Math.max(...b.items.map((i) => i.score)) - Math.max(...a.items.map((i) => i.score)));
  return { groups, loose };
}

export function relativeArabicTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `منذ ${days} يوم`;
  const months = Math.floor(days / 30);
  return `منذ ${months} شهر`;
}

export function isStale(iso: string, thresholdDays = 30): boolean {
  return (Date.now() - new Date(iso).getTime()) / 86400_000 > thresholdDays;
}

export const SUGGESTED_QUERIES = [
  "RTX 5090",
  "MacBook Air M5",
  "iPhone 17 Pro Max",
  "Galaxy S26 Ultra",
  "RX 9070 XT",
  "PlayStation 5 Pro",
];
