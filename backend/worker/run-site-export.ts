import fs from "node:fs/promises";
import path from "node:path";
import { createCatalogContext } from "../shared/bootstrap.js";
import { nowIso, slugify } from "../shared/catalog/normalization.js";
import type { StoreRecord } from "../shared/catalog/types.js";

interface CliArgs {
  useMemory: boolean;
  url: string;
  name: string;
  strategy?: string;
  outDir: string;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const url = get("--url");
  if (!url) {
    throw new Error("--url is required");
  }

  const parsedUrl = new URL(url);
  const fallbackName = parsedUrl.hostname.replace(/^www\./, "");

  return {
    useMemory: argv.includes("--memory"),
    url,
    name: get("--name") ?? fallbackName,
    strategy: get("--strategy") ?? undefined,
    outDir: path.resolve(
      get("--out-dir") ??
        path.join(".catalog-output", `${parsedUrl.hostname.replace(/^www\./, "").replace(/[^a-z0-9]+/gi, "-")}-${new Date().toISOString().slice(0, 10)}`),
    ),
  };
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

const args = parseArgs(process.argv.slice(2));
const context = await createCatalogContext({ useMemory: args.useMemory });
const website = new URL(args.url).toString();
const timestamp = nowIso();
const storeId = `export_${sanitizeId(new URL(website).hostname)}`;

const store: StoreRecord = {
  id: storeId,
  name: args.name,
  normalizedName: slugify(args.name),
  slug: slugify(args.name),
  area: "Online",
  primaryCategory: "Electronics",
  website,
  websiteType: "official",
  discoverySource: "manual_seed",
  sourceFile: path.relative(process.cwd(), args.outDir),
  highPriority: true,
  metadata: {
    strategy: args.strategy,
    source: "run-site-export",
  },
  status: "probe_pending",
  createdAt: timestamp,
  updatedAt: timestamp,
};

await context.repository.upsertStore(store);
await context.probeService.probeStore(storeId, "site-export", "manual");
await context.syncService.syncStore(storeId, "site-export", "manual");

const catalog = await context.repository.getStoreCatalog(storeId);
const size = await context.repository.getStoreSizeSummary(storeId);

const productRows = catalog.products.map((product) => ({
  id: product.sourceProductId,
  handle: product.sourceUrl.split("/").filter(Boolean).at(-1),
  title: product.title,
  url: product.sourceUrl,
  vendor: product.brand,
  product_type: product.categoryPath.at(-1),
  tags: [],
  status: "active",
  published_at: product.freshnessAt,
  variants_count: catalog.variants.filter((variant) => variant.productSourceId === product.sourceProductId).length,
  in_stock: product.availability === "in_stock",
  min_price: product.livePrice,
  max_price: product.livePrice,
  min_compare_at_price: product.originalPrice,
  max_compare_at_price: product.originalPrice,
  images: product.imageUrl ? [product.imageUrl] : [],
  body_html:
    typeof product.rawPayload?.description === "string"
      ? product.rawPayload.description
      : undefined,
}));

const variantRows = catalog.variants.map((variant) => ({
  product_id: variant.productSourceId,
  product_handle: productRows.find((product) => String(product.id) === variant.productSourceId)?.handle,
  product_title: productRows.find((product) => String(product.id) === variant.productSourceId)?.title,
  variant_id: variant.sourceVariantId,
  title: variant.title,
  sku: variant.sku,
  available: variant.availability === "in_stock",
  price: variant.livePrice,
  compare_at_price: variant.originalPrice,
  option1: variant.attributes.option1 ?? variant.attributes.color ?? variant.attributes.size,
  option2: variant.attributes.option2,
  option3: variant.attributes.option3,
  url:
    productRows.find((product) => String(product.id) === variant.productSourceId)?.url,
}));

const summary = {
  generatedAt: timestamp,
  site: website,
  uniqueProducts: catalog.products.length,
  totalVariants: catalog.variants.length,
  productsWithOffers: catalog.offers.length,
  connector: (await context.repository.getConnectorProfile(storeId))?.connectorType,
  size,
};

await fs.mkdir(args.outDir, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(args.outDir, "summary.json"), JSON.stringify(summary, null, 2)),
  fs.writeFile(path.join(args.outDir, "products.ndjson"), `${productRows.map((row) => JSON.stringify(row)).join("\n")}\n`),
  fs.writeFile(path.join(args.outDir, "variants.ndjson"), `${variantRows.map((row) => JSON.stringify(row)).join("\n")}\n`),
  fs.writeFile(path.join(args.outDir, "offers.ndjson"), `${catalog.offers.map((row) => JSON.stringify(row)).join("\n")}\n`),
]);

console.log(
  JSON.stringify(
    {
      outDir: args.outDir,
      site: website,
      products: catalog.products.length,
      variants: catalog.variants.length,
      offers: catalog.offers.length,
    },
    null,
    2,
  ),
);
