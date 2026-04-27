import type { CatalogProductDraft, SearchDocument } from "./types.js";
import { compactText, normalizeText, sha256Hex } from "./normalization.js";

type ProductIdentitySource = Pick<
  CatalogProductDraft | SearchDocument,
  "normalizedTitle" | "title" | "brand" | "model"
> & {
  categoryPath?: string[] | string;
  sku?: string;
};

export interface ProductIdentity {
  brand: string;
  model: string;
  capacity?: string;
  productClass: string;
  requiredSpecs: Record<string, string>;
  confidence: "high" | "medium";
  matchReason: string;
  key: string;
}

const KNOWN_BRANDS = [
  "ADATA",
  "Apple",
  "Samsung",
  "Xiaomi",
  "Redmi",
  "Poco",
  "Huawei",
  "Honor",
  "Oppo",
  "Realme",
  "TCL",
  "LG",
  "Sony",
  "Canon",
  "Nikon",
  "Fujifilm",
  "GoPro",
  "HP",
  "Dell",
  "Lenovo",
  "Asus",
  "Acer",
  "MSI",
  "Intel",
  "AMD",
  "Nvidia",
  "Anker",
  "Baseus",
  "Belkin",
  "Borofone",
  "Green Lion",
  "Joyroom",
  "McDodo",
  "Promate",
  "Romoss",
  "Ugreen",
  "WiWU",
  "Lexar",
  "Kingston",
  "SanDisk",
  "Western Digital",
  "WD",
  "Seagate",
  "Transcend",
  "Silicon Power",
  "TwinMOS",
  "Havit",
  "Logitech",
  "Glorious",
  "Razer",
  "Redragon",
  "JBL",
] as const;

const BRAND_ALIASES: Record<string, string> = {
  "ادتا": "adata",
  "اداتا": "adata",
  "ابل": "apple",
  "آبل": "apple",
  "ايفون": "apple",
  "سامسونج": "samsung",
  "سامسونغ": "samsung",
  "كلاكسي": "samsung",
  "جالكسي": "samsung",
  "شاومي": "xiaomi",
  "شياومي": "xiaomi",
  "ريدمي": "redmi",
  "ردمي": "redmi",
  "بوكو": "poco",
  "هواوي": "huawei",
  "هونر": "honor",
  "اوبو": "oppo",
  "ريلمي": "realme",
  "انكر": "anker",
  "يوجرين": "ugreen",
  "ليكسار": "lexar",
  "كينجستون": "kingston",
  "كينغستون": "kingston",
  "ساندسك": "sandisk",
  "لوجيتك": "logitech",
  "ريزر": "razer",
  "كانون": "canon",
  "نيكون": "nikon",
};

const GENERIC_BRANDS = new Set([
  "",
  "generic",
  "unknown",
  "products",
  "all products",
  "other brands",
  "my store",
  "al nabaa",
  "alnabaa",
  "miswag",
]);

const MODEL_STOP_WORDS = new Set([
  "USB",
  "SSD",
  "HDD",
  "RAM",
  "ROM",
  "DDR",
  "MIL",
  "STD",
  "GEN",
  "TYPE",
  "WATCH",
  "WIFI",
  "GPS",
  "IQD",
]);

export function buildProductIdentity(product: ProductIdentitySource): ProductIdentity | undefined {
  const combined = combinedProductText(product);
  const brand = extractBrand(product, combined);
  const model = extractModel(product, combined, brand);
  const productClass = classifyProduct(product, combined);

  if (!brand || !model || !productClass) return undefined;

  const requiredSpecs = extractRequiredSpecs(productClass, combined);
  const capacity = requiredSpecs.storage ?? requiredSpecs.capacity;
  const key = [
    brand,
    model,
    productClass,
    serializeRequiredSpecs(requiredSpecs),
  ].join("|");

  return {
    brand,
    model,
    capacity,
    productClass,
    requiredSpecs,
    confidence: "high",
    matchReason: `brand+model+class${Object.keys(requiredSpecs).length ? "+specs" : ""}`,
    key,
  };
}

export function buildProductIdentityKey(product: ProductIdentitySource): string | undefined {
  return buildProductIdentity(product)?.key;
}

export function buildProductIdentityCanonicalId(product: ProductIdentitySource): string | undefined {
  const identity = buildProductIdentity(product);
  return identity ? `unified_${sha256Hex(`identity-v3|${identity.key}`).slice(0, 24)}` : undefined;
}

export function sameProductIdentity(a: ProductIdentitySource, b: ProductIdentitySource): boolean {
  const aIdentity = buildProductIdentityKey(a);
  const bIdentity = buildProductIdentityKey(b);
  return Boolean(aIdentity && bIdentity && aIdentity === bIdentity);
}

function combinedProductText(product: ProductIdentitySource): string {
  const categoryPath = Array.isArray(product.categoryPath)
    ? product.categoryPath.join(" ")
    : product.categoryPath ?? "";
  const sku = normalizeIdentitySku(product.sku);
  return normalizeText([
    product.brand,
    product.model,
    product.title,
    sku,
    categoryPath,
    product.normalizedTitle,
  ].filter(Boolean).join(" "));
}

function normalizeIdentitySku(value?: string): string | undefined {
  const normalized = normalizeText(value ?? "").trim();
  const compact = compactText(normalized);
  if (!compact) return undefined;
  if (/^\d{8,}$/.test(compact)) return undefined;
  if (/^(sto|store|item|sku|product|prod)?item\d+/i.test(compact)) return undefined;
  if (/^stoitem\d+/i.test(compact)) return undefined;
  return /[a-z]/i.test(normalized) && /\d/.test(normalized) ? normalized : undefined;
}

function extractBrand(product: ProductIdentitySource, combined: string): string | undefined {
  const explicit = normalizeBrand(product.brand);
  if (explicit && !GENERIC_BRANDS.has(explicit)) return canonicalizeBrand(explicit);

  const compactCombined = compactText(combined);
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    if (compactCombined.includes(compactText(alias))) return canonicalizeBrand(canonical);
  }
  for (const brand of KNOWN_BRANDS) {
    const normalized = normalizeBrand(brand);
    if (normalized && compactCombined.includes(compactText(normalized))) return canonicalizeBrand(normalized);
  }
  return explicit && !GENERIC_BRANDS.has(explicit) ? canonicalizeBrand(explicit) : undefined;
}

function normalizeBrand(value?: string): string | undefined {
  const normalized = normalizeText(value ?? "")
    .replace(/[^a-z0-9\u0600-\u06ff ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return normalized || undefined;
}

function canonicalizeBrand(brand: string): string {
  const normalized = BRAND_ALIASES[normalizeText(brand)] ?? normalizeText(brand);
  if (["redmi", "poco"].includes(compactText(normalized))) return "xiaomi";
  return normalized;
}

function extractModel(product: ProductIdentitySource, combined: string, brand?: string): string | undefined {
  const explicit = normalizeModel(product.model);
  if (explicit) return explicit;

  const withoutBrand = brand
    ? combined.replace(new RegExp(`\\b${escapeRegExp(brand)}\\b`, "gi"), " ")
    : combined;

  const candidates = [
    ...Array.from(withoutBrand.matchAll(/\b((?:redmi|galaxy|apple|watch|iphone|ipad|macbook|eos)\s+[a-z0-9]+(?:\s+(?:pro|max|ultra|plus|fe|mini|lite|active|classic|sport))?)\b/gi)),
    ...Array.from(withoutBrand.matchAll(/\b([a-z]{1,10}[- ]?\d{1,5}[a-z0-9-]*(?:[- ][a-z0-9]{1,6}){0,3}(?:\s+(?:pro|max|ultra|plus|fe|mini|lite|active|classic|sport))?)\b/gi)),
  ]
    .map((match) => normalizeModel(match[1]))
    .filter((value): value is string => Boolean(value))
    .filter((value) => !MODEL_STOP_WORDS.has(value));

  return candidates[0];
}

function normalizeModel(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = normalizeText(value)
    .replace(/\b(?:xiaomi|redmi|samsung|galaxy|apple|adata|canon)\b/g, " ")
    .replace(/شاومي|ريدمي|ردمي|سامسونج|سامسونغ|كلاكسي|جالكسي|ابل|آبل|كانون/g, " ")
    .replace(/\b(?:portable|external|internal|hard|drive|disk|قرص|خارجي|داخلي|محمول)\b/g, " ")
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (!normalized || MODEL_STOP_WORDS.has(normalized)) return undefined;
  return normalized.replace(/\s+/g, "");
}

function extractCapacity(combined: string): string | undefined {
  const normalized = normalizeText(combined)
    .replace(/تيرا\s*بايت|تيرابايت|تيرا/g, "tb")
    .replace(/جيجا\s*بايت|جيجابايت|كيكا\s*بايت|كيكابايت|كيكا|جيجا/g, "gb");

  const match = normalized.match(/\b(\d+(?:[.,]\d+)?)\s*(tb|gb)\b/i);
  if (!match) return undefined;
  const rawAmount = match[1];
  const rawUnit = match[2];
  if (!rawAmount || !rawUnit) return undefined;

  const amount = Number(rawAmount.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;

  const unit = rawUnit.toLowerCase();
  const compactAmount = Number.isInteger(amount) ? String(amount) : String(amount).replace(/\.0+$/, "");
  return `${compactAmount}${unit}`;
}

function extractRequiredSpecs(productClass: string, combined: string): Record<string, string> {
  const specs: Record<string, string> = {};
  const storage = extractStorageCapacity(combined);
  const ram = extractRamCapacity(combined);
  const wattage = extractWattage(combined);
  const battery = extractBatteryCapacity(combined);
  const screen = extractScreenSize(combined);
  const lens = extractLensRange(combined);

  if (requiresStorageSpec(productClass) && storage) specs.storage = storage;
  if (requiresRamSpec(productClass) && ram) specs.ram = ram;
  if (requiresWattageSpec(productClass) && wattage) specs.wattage = wattage;
  if (productClass === "power-bank" && battery) specs.battery = battery;
  if (productClass === "monitor" && screen) specs.screen = screen;
  if (productClass === "camera" && lens) specs.lens = lens;
  if (productClass === "ram" && storage) specs.capacity = storage;
  if (productClass === "memory-card" && storage) specs.capacity = storage;
  return specs;
}

function serializeRequiredSpecs(specs: Record<string, string>): string {
  const entries = Object.entries(specs)
    .filter(([, value]) => Boolean(value))
    .sort(([a], [b]) => a.localeCompare(b));
  return entries.length ? entries.map(([key, value]) => `${key}:${value}`).join(",") : "no-specs";
}

function requiresStorageSpec(productClass: string): boolean {
  return [
    "external-ssd",
    "ssd",
    "hard-drive",
    "phone",
    "tablet",
    "laptop",
  ].includes(productClass);
}

function requiresRamSpec(productClass: string): boolean {
  return ["phone", "tablet", "laptop"].includes(productClass);
}

function requiresWattageSpec(productClass: string): boolean {
  return ["charger", "adapter", "power-adapter"].includes(productClass);
}

function extractStorageCapacity(combined: string): string | undefined {
  const normalized = normalizeUnits(combined);
  const ramMatches = new Set(
    Array.from(normalized.matchAll(/\b(\d+(?:[.,]\d+)?)\s*gb\s*(?:ram|memory)\b/gi))
      .map((match) => normalizeCapacityMatch(match[1], "gb"))
      .filter((value): value is string => Boolean(value)),
  );
  const capacityMatches = Array.from(normalized.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(tb|gb)\b/gi))
    .map((match) => normalizeCapacityMatch(match[1], match[2]))
    .filter((value): value is string => Boolean(value))
    .filter((value) => !ramMatches.has(value));
  return capacityMatches.find((value) => value.endsWith("tb")) ?? capacityMatches[0] ?? extractCapacity(combined);
}

function extractRamCapacity(combined: string): string | undefined {
  const normalized = normalizeUnits(combined);
  const direct = normalized.match(/\b(\d+(?:[.,]\d+)?)\s*gb\s*(?:ram|memory)\b/i);
  if (direct) return normalizeCapacityMatch(direct[1], "gb");
  const reverse = normalized.match(/\b(?:ram|memory)\s*(\d+(?:[.,]\d+)?)\s*gb\b/i);
  return reverse ? normalizeCapacityMatch(reverse[1], "gb") : undefined;
}

function normalizeUnits(value: string): string {
  return normalizeText(value)
    .replace(/تيرا\s*بايت|تيرابايت|تيرا/g, "tb")
    .replace(/جيجا\s*بايت|جيجابايت|كيكا\s*بايت|كيكابايت|كيكا|جيجا/g, "gb")
    .replace(/واط/g, "w")
    .replace(/انش|انج|بوصه|بوصة/g, "inch")
    .replace(/امبير|أمبير/g, "a");
}

function normalizeCapacityMatch(amountRaw?: string, unitRaw?: string): string | undefined {
  if (!amountRaw || !unitRaw) return undefined;
  const amount = Number(amountRaw.replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  const compactAmount = Number.isInteger(amount) ? String(amount) : String(amount).replace(/\.0+$/, "");
  return `${compactAmount}${unitRaw.toLowerCase()}`;
}

function extractWattage(combined: string): string | undefined {
  const normalized = normalizeUnits(combined);
  const match = normalized.match(/\b(\d+(?:[.,]\d+)?)\s*w\b/i);
  if (!match?.[1]) return undefined;
  const amount = Number(match[1].replace(",", "."));
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return `${Number.isInteger(amount) ? amount : amount.toString().replace(/\.0+$/, "")}w`;
}

function extractBatteryCapacity(combined: string): string | undefined {
  const normalized = normalizeText(combined).replace(/مللي\s*امبير|ملي\s*امبير|mah/gi, "mah");
  const match = normalized.match(/\b(\d{3,6})\s*mah\b/i);
  return match?.[1] ? `${Number(match[1])}mah` : undefined;
}

function extractScreenSize(combined: string): string | undefined {
  const normalized = normalizeUnits(combined);
  const match = normalized.match(/\b(\d{1,2}(?:[.,]\d{1,2})?)\s*inch\b/i);
  if (!match?.[1]) return undefined;
  const amount = Number(match[1].replace(",", "."));
  return Number.isFinite(amount) && amount > 0 ? `${amount}inch` : undefined;
}

function extractLensRange(combined: string): string | undefined {
  const normalized = normalizeText(combined);
  const range = normalized.match(/\b(\d{1,4})\s*[-–]\s*(\d{1,4})\s*mm\b/i);
  if (range?.[1] && range[2]) return `${range[1]}-${range[2]}mm`;
  const prime = normalized.match(/\b(\d{1,4})\s*mm\b/i);
  return prime?.[1] ? `${prime[1]}mm` : undefined;
}

function classifyProduct(product: ProductIdentitySource, combined: string): string {
  const categoryPath = Array.isArray(product.categoryPath)
    ? product.categoryPath.join(" ")
    : product.categoryPath ?? "";
  const text = normalizeText(`${combined} ${categoryPath}`);

  if (/\b(case|cover|protector|screen protector)\b/.test(text) || /كفر|جراب|حمايه|حماية|لاصق/.test(text)) {
    return "accessory-case";
  }
  if (/\b(pen|stylus)\b/.test(text) || /قلم/.test(text)) return "accessory-pen";
  if (/\b(powerbank|power bank)\b/.test(text) || /باور\s*بانك|بور\s*بانك/.test(text)) return "power-bank";
  if (/\b(charger)\b/.test(text) || /شاحن/.test(text)) return "charger";
  if (/\b(adapter|power adapter)\b/.test(text) || /محول/.test(text)) return "adapter";
  if (/\b(cable)\b/.test(text) || /كيبل|كابل/.test(text)) return "cable";
  if (
    /\b(watch strap|watch band|strap for|band for)\b/.test(text) ||
    /حزام\s+ساعة|سوار\s+ساعة|سير\s+ساعة/.test(text)
  ) {
    return "accessory-watch-band";
  }
  if (/\b(smart\s*watch|smartwatch|wearable|watch)\b/.test(text) || /ساعة|ساعه|ساعات/.test(text)) {
    return "smartwatch";
  }
  if (/\b(memory card|micro\s*sd|microsd|sd card)\b/.test(text) || /ذاكره|ذاكرة/.test(text)) return "memory-card";
  if (/\b(ddr[345]?|ram)\b/.test(text) || /رام/.test(text)) return "ram";
  if (/\b(external|portable)\b/.test(text) && /\bssd\b/.test(text)) return "external-ssd";
  if (/\bssd\b/.test(text)) return "ssd";
  if (/\bhdd|hard drive\b/.test(text) || /هارد/.test(text)) return "hard-drive";
  if (/\b(iphone|galaxy|smartphone|phone)\b/.test(text) || /موبايل|هاتف|ايفون|جالكسي|كلاكسي/.test(text)) return "phone";
  if (/\b(laptop|notebook|macbook|zenbook|thinkpad|ideapad)\b/.test(text) || /لابتوب|حاسوب/.test(text)) return "laptop";
  if (/\b(tablet|ipad)\b/.test(text) || /تابلت|ايباد/.test(text)) return "tablet";
  if (/\b(camera|dslr|mirrorless|lens)\b/.test(text) || /كاميرا|عدسه|عدسة/.test(text)) return "camera";
  if (/\b(monitor|display)\b/.test(text) || /شاشه|شاشة/.test(text)) return "monitor";
  if (/\b(router|access point)\b/.test(text) || /راوتر/.test(text)) return "networking";

  return compactText(categoryPath || "product") || "product";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
