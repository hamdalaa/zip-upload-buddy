import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createCatalogContext } from "../shared/bootstrap.js";
import { nowIso, compactText, slugify } from "../shared/catalog/normalization.js";
import { summarizeStoreSize } from "../shared/catalog/storeSizing.js";
import { buildSearchDocument } from "../shared/catalog/searchDocuments.js";
import { loadElryanUrlMap, resolveElryanMappedUrl } from "../shared/elryan/urlMap.js";
import type { CatalogProductDraft, StoreRecord } from "../shared/catalog/types.js";

interface ElryanCategory {
  id: number;
  name: string;
  level?: number;
  path?: string;
}

interface ElryanProductRow {
  id?: number | string;
  sku?: string;
  name?: string;
  description?: string;
  url_path?: string;
  image?: string;
  small_image?: string;
  thumbnail?: string;
  tsk?: number | string;
  slug?: string;
  url_key?: string;
  media_gallery?: Array<{ image?: string }>;
  category?: Array<{ category_id?: number; name?: string }>;
  category_ids?: number[];
  stock?: {
    qty?: number;
    is_in_stock?: boolean;
    stock_status?: number;
  };
  regular_price?: number | string;
  original_price?: number | string;
  final_price?: number | string;
  special_price?: number | string;
  created_at?: string;
  updated_at?: string;
}

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    categoriesPath: path.resolve(
      get("--categories") ?? ".catalog-output/elryan-api-full-2026-04-20/categories.json",
    ),
    productsPath: path.resolve(
      get("--products") ?? ".catalog-output/elryan-api-full-2026-04-20/products.ndjson",
    ),
    storeId: get("--store-id") ?? "scraped_www_elryan_com",
    storeName: get("--store-name") ?? "ElRyan",
    storeUrl: get("--store-url") ?? "https://www.elryan.com/ar/",
  };
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function mapAvailability(row: ElryanProductRow): CatalogProductDraft["availability"] {
  if (row.stock?.is_in_stock === true) return "in_stock";
  if (row.stock?.is_in_stock === false) return "out_of_stock";
  if (row.stock?.stock_status === 1) return "in_stock";
  if (row.stock?.stock_status === 0) return "out_of_stock";
  return "unknown";
}

function buildSourceUrl(baseUrl: string, row: ElryanProductRow) {
  const mappedUrl = resolveElryanMappedUrl([
    row.url_path,
    row.slug,
    row.url_key,
    row.slug ? `${row.slug}.html` : undefined,
    row.url_key ? `${row.url_key}.html` : undefined,
  ]);
  if (mappedUrl) return mappedUrl;

  const route = String(row.url_path ?? row.slug ?? row.url_key ?? "").trim();
  if (!route) return baseUrl;
  if (/^https?:\/\//i.test(route)) return route;
  return new URL(route.replace(/^\/+/, ""), baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`).toString();
}

function toAbsoluteAssetUrl(baseUrl: string, value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (trimmed === "no_selection" || trimmed === "Not found" || trimmed === "Image not found") return undefined;
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
      if (host === "s3.elryan.com") return undefined;
      if (host === "elryan.com") {
        if (parsed.pathname.startsWith("/img/")) return parsed.toString();
        const marker = "/catalog/product/";
        const index = parsed.pathname.indexOf(marker);
        if (index >= 0) {
          const imagePath = parsed.pathname.slice(index + marker.length).replace(/^\/+/, "");
          return new URL(`img/500/500/resize/catalog/product/${imagePath}`, new URL(baseUrl).origin + "/").toString();
        }
        return undefined;
      }
      return parsed.toString();
    } catch {
      return undefined;
    }
  }
  const normalized = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return new URL(`img/500/500/resize/catalog/product${normalized}`, new URL(baseUrl).origin + "/").toString();
}

function buildImageCandidates(baseUrl: string, row: ElryanProductRow) {
  return [...new Set(
    [
      row.image,
      row.small_image,
      row.thumbnail,
      ...(row.media_gallery ?? []).map((entry) => entry.image),
    ]
      .map((value) => toAbsoluteAssetUrl(baseUrl, value))
      .filter((value): value is string => Boolean(value)),
  )];
}

function buildImageUrl(baseUrl: string, row: ElryanProductRow) {
  const directImages = buildImageCandidates(baseUrl, row);
  if (directImages[0]) return directImages[0];
  return undefined;
}

function mapCategoryPath(row: ElryanProductRow, categoriesById: Map<number, ElryanCategory>) {
  const fromInline = (row.category ?? [])
    .map((entry) => entry.name?.trim())
    .filter((value): value is string => Boolean(value));
  if (fromInline.length > 0) return fromInline;

  const fromIds = (row.category_ids ?? [])
    .map((id) => categoriesById.get(Number(id))?.name?.trim())
    .filter((value): value is string => Boolean(value));
  return fromIds.length > 0 ? fromIds : ["Uncategorized"];
}

async function loadCategories(categoriesPath: string) {
  const raw = await fs.promises.readFile(categoriesPath, "utf8");
  const parsed = JSON.parse(raw) as ElryanCategory[];
  return new Map(parsed.map((entry) => [Number(entry.id), entry]));
}

async function loadProducts(productsPath: string, storeId: string, storeUrl: string, categoriesById: Map<number, ElryanCategory>) {
  const products: CatalogProductDraft[] = [];
  const fileStream = fs.createReadStream(productsPath, { encoding: "utf8" });
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const row = JSON.parse(trimmed) as ElryanProductRow;
    const title = row.name?.trim();
    const sourceProductId = row.id != null ? String(row.id) : undefined;
    if (!title || !sourceProductId) continue;

    const livePrice =
      toNumber(row.final_price) ??
      toNumber(row.special_price) ??
      toNumber(row.original_price) ??
      toNumber(row.regular_price);
    const originalPrice =
      toNumber(row.original_price) ??
      toNumber(row.regular_price);
    const now = nowIso();
    const images = buildImageCandidates(storeUrl, row);
    const imageUrl = images[0] ?? buildImageUrl(storeUrl, row);
    products.push({
      storeId,
      sourceProductId,
      normalizedTitle: compactText(title),
      title,
      brand: undefined,
      model: undefined,
      sku: row.sku?.trim(),
      sellerName: undefined,
      sellerId: undefined,
      categoryPath: mapCategoryPath(row, categoriesById),
      sourceUrl: buildSourceUrl(storeUrl, row),
      imageUrl,
      primaryImageUrl: imageUrl,
      images,
      availability: mapAvailability(row),
      currency: "IQD",
      livePrice,
      originalPrice,
      onSale: typeof livePrice === "number" && typeof originalPrice === "number" && originalPrice > livePrice,
      sourceConnector: "magento_vsf",
      freshnessAt: now,
      lastSeenAt: row.updated_at ? new Date(row.updated_at).toISOString() : now,
      offerLabel: typeof livePrice === "number" && typeof originalPrice === "number" && originalPrice > livePrice ? "Sale" : undefined,
      offerStartsAt: undefined,
      offerEndsAt: undefined,
      brandTokens: [],
      modelTokens: [],
      skuTokens: row.sku ? [compactText(row.sku)] : [],
      rawPayload: row as Record<string, unknown>,
    });
  }

  return products;
}

const args = parseArgs(process.argv.slice(2));
const context = await createCatalogContext();
const timestamp = nowIso();

const store: StoreRecord = {
  id: args.storeId,
  name: args.storeName,
  normalizedName: compactText(args.storeName),
  slug: slugify(args.storeName),
  area: "Online",
  primaryCategory: "Electronics",
  website: args.storeUrl,
  websiteType: "official",
  discoverySource: "manual_seed",
  sourceFile: path.relative(process.cwd(), args.productsPath),
  highPriority: true,
  metadata: {
    importType: "elryan_api_export",
    categoriesPath: args.categoriesPath,
    productsPath: args.productsPath,
  },
  status: "indexed",
  createdAt: timestamp,
  updatedAt: timestamp,
  lastSyncAt: timestamp,
};

const categoriesById = await loadCategories(args.categoriesPath);
const urlMap = loadElryanUrlMap();
const products = await loadProducts(args.productsPath, args.storeId, args.storeUrl, categoriesById);
const offers = products
  .filter((product) => product.onSale)
  .map((product) => ({
    productSourceId: product.sourceProductId,
    label: product.offerLabel,
    discountAmount:
      product.livePrice != null && product.originalPrice != null ? product.originalPrice - product.livePrice : undefined,
    discountPercent:
      product.livePrice != null && product.originalPrice != null && product.originalPrice > 0
        ? Math.round(((product.originalPrice - product.livePrice) / product.originalPrice) * 100)
        : undefined,
    startsAt: undefined,
    endsAt: undefined,
    active: true,
    lastSeenAt: product.lastSeenAt,
    metadata: { source: "elryan_api_export" },
  }));

const size = summarizeStoreSize({
  storeId: args.storeId,
  products,
  variants: [],
  offers,
  estimatedCatalogSize: products.length,
  lastSuccessfulSyncAt: timestamp,
});

await context.repository.upsertStore(store);
await context.repository.replaceCatalogSnapshot(args.storeId, products, [], offers);
await context.repository.saveStoreSizeSummary(size);
await context.searchEngine.replaceStoreDocuments(
  args.storeId,
  products.map((product) => buildSearchDocument(store, product)),
);

console.log(
  JSON.stringify(
    {
      storeId: args.storeId,
      products: products.length,
      offers: offers.length,
      categoriesLoaded: categoriesById.size,
      urlMap: urlMap ? { path: urlMap.path, urls: urlMap.size } : null,
    },
    null,
    2,
  ),
);
