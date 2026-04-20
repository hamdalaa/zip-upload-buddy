import fs from "node:fs/promises";
import path from "node:path";
import { buildSearchDocument } from "../catalog/searchDocuments.js";
import { summarizeStoreSize } from "../catalog/storeSizing.js";
import {
  classifyWebsiteType,
  compactText,
  nowIso,
  slugify,
} from "../catalog/normalization.js";
import type {
  CatalogProductDraft,
  OfferDraft,
  ProductVariantDraft,
  StoreRecord,
} from "../catalog/types.js";
import type { CatalogRepository } from "../repositories/contracts.js";
import type { SearchEngine } from "../search/contracts.js";

interface ScrapedSiteSummary {
  generatedAt?: string;
  site?: string;
  uniqueProducts?: number;
  totalVariants?: number;
}

interface ScrapedProductRow {
  id?: string | number;
  handle?: string;
  title?: string;
  url?: string;
  vendor?: string;
  product_type?: string;
  tags?: string[];
  status?: string;
  published_at?: string;
  variants_count?: number;
  in_stock?: boolean;
  min_price?: number;
  max_price?: number;
  min_compare_at_price?: number;
  max_compare_at_price?: number;
  images?: string[];
  body_html?: string;
}

interface ScrapedVariantRow {
  product_id?: string | number;
  product_handle?: string;
  product_title?: string;
  variant_id?: string | number;
  title?: string;
  sku?: string;
  barcode?: string;
  available?: boolean;
  price?: number;
  compare_at_price?: number;
  option1?: string;
  option2?: string;
  option3?: string;
  inventory_quantity?: number;
  requires_shipping?: boolean;
  taxable?: boolean;
  featured_image?: string;
  url?: string;
}

interface ScrapedSitePayload {
  summary: ScrapedSiteSummary;
  dirPath: string;
  products: ScrapedProductRow[];
  variants: ScrapedVariantRow[];
}

interface ScrapedImportResult {
  storesImported: number;
  productsImported: number;
}

const STORE_NAME_OVERRIDES: Record<string, string> = {
  "store.alnabaa.com": "Al Nabaa Store",
  "globaliraq.iq": "Global Iraq",
};

export async function importScrapedSiteCatalogs(args: {
  repository: CatalogRepository;
  searchEngine: SearchEngine;
  repoRoot: string;
}): Promise<ScrapedImportResult> {
  const payloads = await loadLatestScrapedSitePayloads(path.join(args.repoRoot, ".catalog-output"));
  let storesImported = 0;
  let productsImported = 0;

  for (const payload of payloads) {
    const imported = await importOnePayload(args.repository, args.searchEngine, payload);
    storesImported += imported.storeImported ? 1 : 0;
    productsImported += imported.productsImported;
  }

  return {
    storesImported,
    productsImported,
  };
}

async function importOnePayload(
  repository: CatalogRepository,
  searchEngine: SearchEngine,
  payload: ScrapedSitePayload,
): Promise<{ storeImported: boolean; productsImported: number }> {
  const siteUrl = payload.summary.site;
  if (!siteUrl) return { storeImported: false, productsImported: 0 };
  const url = new URL(siteUrl);
  const hostname = url.hostname.toLowerCase();
  const storeId = `scraped_${hostname.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase()}`;
  const timestamp = payload.summary.generatedAt ?? nowIso();
  const storeName = STORE_NAME_OVERRIDES[hostname] ?? humanizeHostname(hostname);
  const website = url.toString();

  const store: StoreRecord = {
    id: storeId,
    name: storeName,
    normalizedName: compactText(storeName),
    slug: slugify(storeName),
    area: "Online",
    primaryCategory: "Electronics",
    website,
    websiteType: classifyWebsiteType(website),
    discoverySource: "manual_seed",
    sourceFile: path.relative(process.cwd(), payload.dirPath),
    highPriority: true,
    metadata: {
      importedFrom: payload.dirPath,
      importType: "scraped_site_output",
      hostname,
    },
    status: "indexed",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSyncAt: timestamp,
  };

  const variants = payload.variants
    .map((variant) => toVariantDraft(variant, timestamp))
    .filter((variant): variant is ProductVariantDraft => Boolean(variant));
  const productVariantsById = new Map<string, ProductVariantDraft[]>();
  for (const variant of variants) {
    const current = productVariantsById.get(variant.productSourceId) ?? [];
    current.push(variant);
    productVariantsById.set(variant.productSourceId, current);
  }

  const products = payload.products
    .map((product) =>
      toProductDraft(
        storeId,
        hostname,
        product,
        productVariantsById.get(String(product.id ?? product.handle ?? "")) ?? [],
        timestamp,
      ),
    )
    .filter((product): product is CatalogProductDraft => Boolean(product));

  const offers = buildOffers(products, timestamp);
  const sizeSummary = summarizeStoreSize({
    storeId,
    products,
    variants,
    offers,
    estimatedCatalogSize: payload.summary.uniqueProducts ?? products.length,
    lastSuccessfulSyncAt: timestamp,
  });

  await repository.upsertStore(store);
  await repository.replaceCatalogSnapshot(storeId, products, variants, offers);
  await repository.saveStoreSizeSummary(sizeSummary);
  await searchEngine.replaceStoreDocuments(
    storeId,
    products.map((product) => buildSearchDocument(store, product)),
  );

  return {
    storeImported: true,
    productsImported: products.length,
  };
}

function toProductDraft(
  storeId: string,
  hostname: string,
  row: ScrapedProductRow,
  variants: ProductVariantDraft[],
  timestamp: string,
): CatalogProductDraft | null {
  const sourceProductId = String(row.id ?? row.handle ?? "");
  const title = row.title?.trim();
  const sourceUrl = row.url?.trim();
  if (!sourceProductId || !title || !sourceUrl) return null;
  const categoryPath = row.product_type?.trim() ? [row.product_type.trim()] : [];
  const livePrice =
    typeof row.min_price === "number"
      ? row.min_price
      : minNumber(variants.map((variant) => variant.livePrice));
  const originalPrice =
    typeof row.min_compare_at_price === "number" && typeof livePrice === "number" && row.min_compare_at_price > livePrice
      ? row.min_compare_at_price
      : maxNumber(variants.map((variant) => variant.originalPrice));
  const availability = row.in_stock === true ? "in_stock" : row.in_stock === false ? "out_of_stock" : "unknown";
  const sku = variants.find((variant) => variant.sku)?.sku;
  const brand = inferBrand(hostname, row, title);

  return {
    storeId,
    sourceProductId,
    normalizedTitle: compactText(title),
    title,
    brand,
    model: undefined,
    sku,
    sellerName: undefined,
    sellerId: undefined,
    categoryPath,
    sourceUrl,
    imageUrl: row.images?.[0],
    availability,
    currency: "IQD",
    livePrice,
    originalPrice,
    onSale: typeof livePrice === "number" && typeof originalPrice === "number" && originalPrice > livePrice,
    sourceConnector: "shopify",
    freshnessAt: timestamp,
    lastSeenAt: timestamp,
    offerLabel: typeof livePrice === "number" && typeof originalPrice === "number" && originalPrice > livePrice ? "Sale" : undefined,
    offerStartsAt: undefined,
    offerEndsAt: undefined,
    brandTokens: brand ? [compactText(brand)] : [],
    modelTokens: [],
    skuTokens: sku ? [compactText(sku)] : [],
    rawPayload: row as Record<string, unknown>,
  };
}

function inferBrand(hostname: string, row: ScrapedProductRow, title: string): string | undefined {
  const explicitBrand = row.vendor?.trim();
  if (explicitBrand) return explicitBrand;

  const normalizedHost = hostname.replace(/^www\./i, "").toLowerCase();
  if (["icenter-iraq.com", "masterstoreiq.com", "istyle.iq"].includes(normalizedHost)) {
    return "Apple";
  }

  const normalizedTitle = title.toLowerCase();
  if (/\bapple\b|iphone|ipad|macbook|airpods|apple watch|homepod|airtag|magsafe|imac|mac mini/.test(normalizedTitle)) {
    return "Apple";
  }

  return undefined;
}

function toVariantDraft(row: ScrapedVariantRow, timestamp: string): ProductVariantDraft | null {
  const productSourceId = String(row.product_id ?? "");
  const sourceVariantId = String(row.variant_id ?? "");
  if (!productSourceId || !sourceVariantId) return null;

  const attributes = Object.fromEntries(
    [
      ["option1", row.option1],
      ["option2", row.option2],
      ["option3", row.option3],
    ].filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0),
  );

  return {
    productSourceId,
    sourceVariantId,
    title: row.title?.trim() || row.product_title?.trim() || sourceVariantId,
    sku: row.sku?.trim() || undefined,
    availability: row.available === true ? "in_stock" : row.available === false ? "out_of_stock" : "unknown",
    livePrice: typeof row.price === "number" ? row.price : undefined,
    originalPrice:
      typeof row.compare_at_price === "number" && typeof row.price === "number" && row.compare_at_price > row.price
        ? row.compare_at_price
        : typeof row.price === "number"
          ? row.price
          : undefined,
    attributes,
    lastSeenAt: timestamp,
    rawPayload: row as Record<string, unknown>,
  };
}

function buildOffers(products: CatalogProductDraft[], timestamp: string): OfferDraft[] {
  return products
    .filter(
      (product) =>
        typeof product.livePrice === "number" &&
        typeof product.originalPrice === "number" &&
        product.originalPrice > product.livePrice,
    )
    .map((product) => ({
      productSourceId: product.sourceProductId,
      label: product.offerLabel ?? "Sale",
      discountAmount: (product.originalPrice ?? 0) - (product.livePrice ?? 0),
      discountPercent:
        product.originalPrice && product.livePrice
          ? Math.round(((product.originalPrice - product.livePrice) / product.originalPrice) * 100)
          : undefined,
      active: true,
      lastSeenAt: timestamp,
      metadata: {
        source: "scraped_site_import",
      },
    }));
}

async function loadLatestScrapedSitePayloads(outputRoot: string): Promise<ScrapedSitePayload[]> {
  const payloads = await collectScrapedSitePayloads(outputRoot);

  const bySite = new Map<string, ScrapedSitePayload>();
  for (const payload of payloads) {
    const site = payload.summary.site;
    if (!site) continue;
    const existing = bySite.get(site);
    if (!existing) {
      bySite.set(site, payload);
      continue;
    }
    const existingAt = Date.parse(existing.summary.generatedAt ?? "");
    const nextAt = Date.parse(payload.summary.generatedAt ?? "");
    if ((Number.isFinite(nextAt) ? nextAt : 0) >= (Number.isFinite(existingAt) ? existingAt : 0)) {
      bySite.set(site, payload);
    }
  }

  return [...bySite.values()];
}

async function collectScrapedSitePayloads(rootDir: string): Promise<ScrapedSitePayload[]> {
  const payloads: ScrapedSitePayload[] = [];
  const queue = [rootDir];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const currentDir = queue.shift();
    if (!currentDir || visited.has(currentDir)) continue;
    visited.add(currentDir);

    const payload = await loadScrapedSitePayload(currentDir);
    if (payload) {
      payloads.push(payload);
      continue;
    }

    let dirEntries: Array<{ name: string; isDirectory(): boolean }> = [];
    try {
      dirEntries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of dirEntries) {
      if (!entry.isDirectory()) continue;
      queue.push(path.join(currentDir, entry.name));
    }
  }

  return payloads;
}

async function loadScrapedSitePayload(dirPath: string): Promise<ScrapedSitePayload | null> {
  const summaryPath = path.join(dirPath, "summary.json");
  const productsPath = path.join(dirPath, "products.ndjson");
  const variantsPath = path.join(dirPath, "variants.ndjson");

  let summary: ScrapedSiteSummary;
  try {
    summary = JSON.parse(await fs.readFile(summaryPath, "utf8")) as ScrapedSiteSummary;
  } catch {
    return null;
  }
  if (!summary.site || typeof summary.uniqueProducts !== "number") return null;

  const products = await readNdjson<ScrapedProductRow>(productsPath);
  const variants = await readNdjson<ScrapedVariantRow>(variantsPath);
  return {
    summary,
    dirPath,
    products,
    variants,
  };
}

async function readNdjson<T>(filePath: string): Promise<T[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as T);
  } catch {
    return [];
  }
}

function humanizeHostname(hostname: string) {
  const parts = hostname
    .split(".")
    .filter((part) => !["www", "store", "com", "iq", "net", "org"].includes(part.toLowerCase()))
    .map((part) => part.replace(/[-_]+/g, " "))
    .join(" ")
    .trim();
  if (!parts) return hostname;
  return parts.replace(/\b\w/g, (char) => char.toUpperCase());
}

function minNumber(values: Array<number | undefined>): number | undefined {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return filtered.length > 0 ? Math.min(...filtered) : undefined;
}

function maxNumber(values: Array<number | undefined>): number | undefined {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return filtered.length > 0 ? Math.max(...filtered) : undefined;
}
