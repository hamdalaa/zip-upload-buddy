import { compactText, normalizeText } from "../catalog/normalization.js";

const TOKEN_SPLIT_RE = /[\s/_\-(),.]+/;

const QUERY_ALIASES: Record<string, string[]> = {
  mac: ["macbook", "mac mini", "macmini", "imac", "apple", "ماك", "ماكبوك"],
  macbook: ["mac", "apple", "ماك", "ماكبوك"],
  imac: ["mac", "apple", "ماك"],
  apple: ["iphone", "ipad", "macbook", "mac", "ابل", "آبل"],
  iphone: ["apple", "ايفون", "آيفون"],
  xiaomi: ["redmi", "poco", "شاومي", "ريدمي", "ردمي"],
  redmi: ["xiaomi", "شاومي", "ريدمي", "ردمي"],
  readmi: ["redmi", "xiaomi", "شاومي", "ريدمي", "ردمي"],
  poco: ["xiaomi", "شاومي"],
  watch: ["smartwatch", "smart watch", "wearable", "ساعة", "ساعه", "ساعات"],
  smartwatch: ["watch", "smart watch", "wearable", "ساعة", "ساعه", "ساعات"],
  samsung: ["galaxy", "سامسونج", "سامسونغ", "كلاكسي"],
  galaxy: ["samsung", "سامسونج", "سامسونغ", "كلاكسي"],
  s23: ["samsung", "galaxy", "سامسونج", "كلاكسي"],
  s24: ["samsung", "galaxy", "سامسونج", "كلاكسي"],
  s25: ["samsung", "galaxy", "سامسونج", "كلاكسي"],
  "ماك": ["mac", "macbook", "mac mini", "macmini", "imac", "apple", "ماكبوك"],
  "ماكبوك": ["macbook", "mac", "apple", "ماك"],
  "ايفون": ["iphone", "apple"],
  "آيفون": ["iphone", "apple"],
  "شاومي": ["xiaomi", "redmi", "poco", "ريدمي"],
  "ريدمي": ["redmi", "readmi", "xiaomi", "شاومي"],
  "ردمي": ["redmi", "readmi", "xiaomi", "شاومي"],
  "ساعة": ["watch", "smartwatch", "wearable"],
  "ساعه": ["watch", "smartwatch", "wearable"],
  "ساعات": ["watch", "smartwatch", "wearable"],
  "سامسونج": ["samsung", "galaxy", "كلاكسي"],
  "سامسونغ": ["samsung", "galaxy", "كلاكسي"],
  "كلاكسي": ["samsung", "galaxy"],
};

const QUERY_TOKEN_CANONICAL: Record<string, string> = {
  readmi: "redmi",
  "ردمي": "redmi",
};

export interface WeightedSearchField {
  value?: string;
  weight?: number;
}

interface PreparedQuery {
  raw: string;
  normalized: string;
  compact: string;
  baseTokens: string[];
  aliasTokens: string[];
}

export function scoreSearchTextMatch(query: string, fields: WeightedSearchField[]): number {
  const prepared = prepareQuery(query);
  if (!prepared.normalized) return 0;

  let score = 0;
  for (const field of fields) {
    if (!field.value) continue;
    score += scoreFieldMatch(prepared, field.value) * (field.weight ?? 1);
  }
  return score;
}

export interface ProductIntentFields {
  title?: string;
  brand?: string;
  model?: string;
  sku?: string;
  category?: string;
  categoryPath?: string;
  storeName?: string;
}

export function scoreProductIntentMatch(query: string, product: ProductIntentFields): number {
  const prepared = prepareQuery(query);
  if (!prepared.normalized) return 0;

  const title = normalizeText(product.title ?? "");
  const brand = normalizeText(product.brand ?? "");
  const model = normalizeText(product.model ?? "");
  const sku = normalizeText(product.sku ?? "");
  const category = normalizeText([product.category, product.categoryPath].filter(Boolean).join(" "));
  const combined = normalizeText([title, brand, model, sku, category, product.storeName].filter(Boolean).join(" "));
  const combinedCompact = compactText(combined);

  let score = 0;

  if (isShortBrandQuery(prepared)) {
    const queryToken = prepared.baseTokens[0] ?? "";
    if (brand === queryToken) score += 120;
    if (title.split(TOKEN_SPLIT_RE).includes(queryToken)) score += 60;
    if (combined.split(TOKEN_SPLIT_RE).includes(queryToken)) score += 30;
  }

  if (isSamsungGalaxyModelQuery(prepared)) {
    const phoneNeedles = [
      "samsung",
      "galaxy",
      "سامسونج",
      "سامسونغ",
      "كلاكسي",
      "موبايل",
      "هاتف",
      "phone",
      "mobile",
      "smartphone",
    ];
    const phoneCategoryNeedles = ["موبايل", "هاتف", "phone", "mobile", "smartphone"];
    const accessoryNeedles = [
      "case",
      "cover",
      "protector",
      "protection",
      "lens",
      "glass",
      "pen",
      "stylus",
      "كفر",
      "حافظه",
      "حافظة",
      "جراب",
      "قلم",
      "لاصق",
      "حمايه",
      "حماية",
      "بروتكتور",
      "ماكسيف",
      "magsafe",
    ];
    const unrelatedModelNeedles = [
      "split",
      "air conditioner",
      "projector",
      "camera",
      "hair",
      "سبيت",
      "سبلت",
      "مكيف",
      "كاميرا",
      "جهاز عرض",
      "عارض",
      "بروجكتر",
      "مسرح",
      "شعر",
    ];

    const queryRequestsAccessory = containsAny(prepared.normalized, accessoryNeedles);
    const queryRequestsUnrelatedModel = containsAny(prepared.normalized, unrelatedModelNeedles);
    const phoneSignal = containsAny(combined, phoneNeedles);
    const phoneCategory = containsAny(category, phoneCategoryNeedles);
    const accessorySignal = containsAny(combined, accessoryNeedles);
    const unrelatedModelSignal = containsAny(combined, unrelatedModelNeedles);

    if (phoneCategory && !accessorySignal) score += 300;
    else if (phoneSignal && !accessorySignal) score += 220;
    else if (phoneCategory) score += 80;
    else if (phoneSignal) score += 40;
    if (containsAny(combined, ["ultra", "الترا", "plus", "بلس", "fe"]) && prepared.baseTokens.some((token) => /^s\d{2}$/i.test(token))) {
      score += 18;
    }
    if (accessorySignal && !queryRequestsAccessory) score -= phoneCategory ? 220 : 420;
    if (unrelatedModelSignal && !phoneSignal && !queryRequestsUnrelatedModel) score -= 260;
  }

  for (const token of prepared.baseTokens) {
    if (token.length >= 2 && combinedCompact.includes(compactText(token))) {
      score += 2;
    }
  }

  return score;
}

function prepareQuery(query: string): PreparedQuery {
  const rawNormalized = normalizeText(query);
  const baseTokens = [...new Set(tokenize(rawNormalized).map(canonicalizeQueryToken))].filter(isMeaningfulToken);
  const normalized = baseTokens.length > 0 ? baseTokens.join(" ") : rawNormalized;
  const compact = compactText(normalized);
  const aliasTokens = [...collectAliasTokens(baseTokens)].filter((token) => !baseTokens.includes(token));

  return {
    raw: query,
    normalized,
    compact,
    baseTokens,
    aliasTokens,
  };
}

function canonicalizeQueryToken(token: string): string {
  return QUERY_TOKEN_CANONICAL[token] ?? token;
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(TOKEN_SPLIT_RE)
    .map((token) => token.trim())
    .filter(Boolean);
}

function collectAliasTokens(baseTokens: string[]): Set<string> {
  const aliases = new Set<string>();
  for (const token of baseTokens) {
    const related = QUERY_ALIASES[token];
    if (!related) continue;
    for (const alias of related) {
      for (const aliasToken of tokenize(alias)) {
        if (isMeaningfulToken(aliasToken)) aliases.add(aliasToken);
      }
    }
  }
  return aliases;
}

function isShortBrandQuery(query: PreparedQuery): boolean {
  if (query.baseTokens.length !== 1) return false;
  const token = query.baseTokens[0] ?? "";
  return /^[a-z0-9]{2,5}$/i.test(token) && !/^\d+$/.test(token);
}

function isSamsungGalaxyModelQuery(query: PreparedQuery): boolean {
  const allTokens = [...query.baseTokens, ...query.aliasTokens];
  if (allTokens.some((token) => /^s(?:2[0-9]|3[0-9])$/i.test(token))) return true;
  const compact = query.compact.toLowerCase();
  return /(?:samsung|galaxy|سامسونج|سامسونغ|كلاكسي)?s(?:2[0-9]|3[0-9])(?:ultra|plus|fe)?/i.test(compact);
}

function containsAny(value: string, needles: string[]): boolean {
  if (!value) return false;
  return needles.some((needle) => value.includes(normalizeText(needle)));
}

function isMeaningfulToken(token: string): boolean {
  if (!token) return false;
  if (token.length >= 3) return true;
  return /\d/.test(token);
}

function scoreFieldMatch(query: PreparedQuery, value: string): number {
  const normalized = normalizeText(value);
  if (!normalized) return 0;

  const compact = compactText(value);
  const tokens = tokenize(normalized).filter(isMeaningfulToken);

  let score = 0;

  if (query.compact && compact === query.compact) score += 40;
  if (query.normalized && normalized === query.normalized) score += 32;
  if (query.normalized && normalized.startsWith(query.normalized)) score += 24;
  if (query.compact && compact.startsWith(query.compact)) score += 18;
  if (query.compact && compact.includes(query.compact)) score += query.compact.length <= 3 ? 3 : 7;

  const baseMatches = scoreTokenSet(query.baseTokens, tokens, {
    exact: 14,
    prefix: 8,
    contains: 4,
    fuzzy: 3,
  });
  const aliasMatches = scoreTokenSet(query.aliasTokens, tokens, {
    exact: 4,
    prefix: 2.5,
    contains: 1,
    fuzzy: 0.75,
  });

  score += baseMatches.score + aliasMatches.score;
  if (query.baseTokens.length > 0) {
    const coverage = baseMatches.matches / query.baseTokens.length;
    if (coverage === 1) score += 10;
    else if (coverage >= 0.6) score += 5;
  }

  return score;
}

function scoreTokenSet(
  queryTokens: string[],
  fieldTokens: string[],
  weights: { exact: number; prefix: number; contains: number; fuzzy: number },
): { score: number; matches: number } {
  let score = 0;
  let matches = 0;

  for (const queryToken of queryTokens) {
    let best = 0;
    for (const fieldToken of fieldTokens) {
      if (fieldToken === queryToken) {
        best = Math.max(best, weights.exact);
        continue;
      }
      if (fieldToken.startsWith(queryToken) || queryToken.startsWith(fieldToken)) {
        best = Math.max(best, weights.prefix);
        continue;
      }
      if (queryToken.length >= 4 && (fieldToken.includes(queryToken) || queryToken.includes(fieldToken))) {
        best = Math.max(best, weights.contains);
        continue;
      }
      if (
        queryToken.length >= 4 &&
        fieldToken.length >= 4 &&
        !/\d/.test(queryToken) &&
        !/\d/.test(fieldToken) &&
        withinEditDistance(
          fieldToken,
          queryToken,
          Math.max(fieldToken.length, queryToken.length) >= 6 ? 2 : 1,
        )
      ) {
        best = Math.max(best, weights.fuzzy);
      }
    }

    if (best > 0) {
      score += best;
      matches += 1;
    }
  }

  return { score, matches };
}

function withinEditDistance(a: string, b: string, maxDistance: number): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > maxDistance) return false;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array(b.length + 1).fill(0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        (current[j - 1] ?? 0) + 1,
        (previous[j] ?? 0) + 1,
        (previous[j - 1] ?? 0) + cost,
      );
      rowMin = Math.min(rowMin, current[j] ?? rowMin);
    }

    if (rowMin > maxDistance) return false;
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return (previous[b.length] ?? Number.POSITIVE_INFINITY) <= maxDistance;
}
