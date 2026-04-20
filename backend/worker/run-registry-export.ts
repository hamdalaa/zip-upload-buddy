import fs from "node:fs/promises";
import path from "node:path";
import { createCatalogContext } from "../shared/bootstrap.js";
import { classifyWebsiteType, compactText, normalizeWebsiteUrl, nowIso, slugify } from "../shared/catalog/normalization.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";
import type { StoreRecord } from "../shared/catalog/types.js";

interface RegistryRow {
  domain: string;
  url: string;
  strategy: string;
  priority: number;
  branches?: number;
  cities?: string;
  bucket?: string;
  note?: string;
}

interface CliArgs {
  registry: string;
  useMemory: boolean;
  limit?: number;
  concurrency?: number;
  outDir: string;
  includeSkipped: boolean;
  includeManual: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    registry: path.resolve(get("--registry") ?? "/Volumes/SSD/files (4)/stores-registry.json"),
    useMemory: argv.includes("--memory"),
    limit: get("--limit") ? Number(get("--limit")) : undefined,
    concurrency: get("--concurrency") ? Number(get("--concurrency")) : undefined,
    outDir: path.resolve(get("--out-dir") ?? ".catalog-output/registry-products"),
    includeSkipped: argv.includes("--include-skipped"),
    includeManual: argv.includes("--include-manual"),
  };
}

function toTsvRow(values: Array<string | number | undefined>): string {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      return /[\t\r\n"]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    })
    .join("\t");
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function toStore(row: RegistryRow): StoreRecord {
  const timestamp = nowIso();
  const website = normalizeWebsiteUrl(row.url);
  const name = deriveStoreName(row, website);
  return {
    id: `registry_${sanitizeId(new URL(website).hostname)}`,
    name,
    normalizedName: compactText(name),
    slug: slugify(name),
    city: row.cities?.split("|")[0]?.trim(),
    website,
    websiteType: classifyWebsiteType(website),
    primaryCategory: "Electronics",
    discoverySource: "manual_seed",
    sourceFile: row.domain,
    highPriority: row.priority <= 2,
    status: "probe_pending",
    createdAt: timestamp,
    updatedAt: timestamp,
    metadata: {
      registryDomain: row.domain,
      strategy: row.strategy,
      priority: row.priority,
      branches: row.branches,
      cities: row.cities,
      bucket: row.bucket,
      note: row.note,
    },
  };
}

function deriveStoreName(row: RegistryRow, website: string): string {
  const host = new URL(website).hostname.replace(/^www\./, "");
  return host;
}

const args = parseArgs(process.argv.slice(2));
const registryRows = (JSON.parse(await fs.readFile(args.registry, "utf8")) as RegistryRow[])
  .filter((row) => row.url && row.domain)
  .filter((row) => (args.includeManual ? true : row.strategy !== "manual"))
  .filter((row) => (args.includeSkipped ? true : row.strategy !== "skip"));

const rows = typeof args.limit === "number" ? registryRows.slice(0, args.limit) : registryRows;
const context = await createCatalogContext({ useMemory: args.useMemory });
for (const row of rows) {
  await context.repository.upsertStore(toStore(row));
}

const refreshService = new CatalogRefreshService(
  context.repository,
  context.discoveryService,
  context.probeService,
  context.syncService,
  context.coverageService,
);

const refresh = await refreshService.refresh({
  actor: "registry-export",
  includeDiscovery: false,
  officialOnly: false,
  dedupeByDomain: false,
  storeIds: rows.map((row) => `registry_${sanitizeId(new URL(normalizeWebsiteUrl(row.url)).hostname)}`),
  concurrency: args.concurrency,
  progress: (result, completed, total) => {
    const details = [
      `status=${result.status}`,
      result.probeConnector ? `connector=${result.probeConnector}` : "",
      typeof result.productsIndexed === "number" ? `products=${result.productsIndexed}` : "",
      result.reason ? `reason=${result.reason}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`[${completed}/${total}] ${result.storeName} ${details}`);
  },
});

const stores = await context.repository.listStores();
const storeById = new Map(stores.map((store) => [store.id, store]));
const rowById = new Map(rows.map((row) => [`registry_${sanitizeId(new URL(normalizeWebsiteUrl(row.url)).hostname)}`, row]));
const exportedStores = [];

for (const result of refresh.results) {
  const store = storeById.get(result.storeId);
  const registryRow = rowById.get(result.storeId);
  if (!store || !registryRow) continue;

  const [profile, sizeSummary, acquisitionProfile, blockerEvidence, catalog] = await Promise.all([
    context.repository.getConnectorProfile(result.storeId),
    context.repository.getStoreSizeSummary(result.storeId),
    context.repository.getAcquisitionProfile(result.storeId),
    context.repository.listBlockerEvidence(result.storeId),
    result.status === "synced"
      ? context.repository.getStoreCatalog(result.storeId)
      : Promise.resolve({ products: [], variants: [], offers: [] }),
  ]);

  exportedStores.push({
    registry: registryRow,
    refresh: result,
    store,
    connectorProfile: profile ?? null,
    sizeSummary: sizeSummary ?? null,
    acquisitionProfile: acquisitionProfile ?? null,
    blockerEvidence,
    catalog,
  });
}

const generatedAt = nowIso();
const totalProducts = exportedStores.reduce((sum, entry) => sum + entry.catalog.products.length, 0);
const totalVariants = exportedStores.reduce((sum, entry) => sum + entry.catalog.variants.length, 0);
const totalOffers = exportedStores.reduce((sum, entry) => sum + entry.catalog.offers.length, 0);
const syncedStores = exportedStores.filter((entry) => entry.refresh.status === "synced").length;
const unsyncedStores = exportedStores.filter((entry) => entry.refresh.status !== "synced");

const summary = {
  generatedAt,
  registry: args.registry,
  options: {
    useMemory: args.useMemory,
    limit: args.limit ?? null,
    concurrency: args.concurrency ?? null,
    includeSkipped: args.includeSkipped,
    includeManual: args.includeManual,
    actionableInputCount: rows.length,
  },
  refresh,
  totals: {
    exportedStores: exportedStores.length,
    syncedStores,
    unsyncedStores: unsyncedStores.length,
    totalProducts,
    totalVariants,
    totalOffers,
  },
};

const productLines = exportedStores.flatMap((entry) =>
  entry.catalog.products.map((product) =>
    JSON.stringify({
      registry: entry.registry,
      storeId: entry.store.id,
      storeName: entry.store.name,
      website: entry.store.website,
      connectorType: entry.connectorProfile?.connectorType ?? entry.refresh.probeConnector ?? null,
      product,
    }),
  ),
);
const variantLines = exportedStores.flatMap((entry) =>
  entry.catalog.variants.map((variant) =>
    JSON.stringify({
      registry: entry.registry,
      storeId: entry.store.id,
      storeName: entry.store.name,
      website: entry.store.website,
      connectorType: entry.connectorProfile?.connectorType ?? entry.refresh.probeConnector ?? null,
      variant,
    }),
  ),
);
const offerLines = exportedStores.flatMap((entry) =>
  entry.catalog.offers.map((offer) =>
    JSON.stringify({
      registry: entry.registry,
      storeId: entry.store.id,
      storeName: entry.store.name,
      website: entry.store.website,
      connectorType: entry.connectorProfile?.connectorType ?? entry.refresh.probeConnector ?? null,
      offer,
    }),
  ),
);

const siteRows = [
  toTsvRow([
    "store_id",
    "store_name",
    "registry_domain",
    "website",
    "strategy",
    "status",
    "connector",
    "products",
    "variants",
    "offers",
    "reason",
  ]),
  ...exportedStores.map((entry) =>
    toTsvRow([
      entry.store.id,
      entry.store.name,
      entry.registry.domain,
      entry.store.website,
      entry.registry.strategy,
      entry.refresh.status,
      entry.connectorProfile?.connectorType ?? entry.refresh.probeConnector,
      entry.catalog.products.length,
      entry.catalog.variants.length,
      entry.catalog.offers.length,
      entry.refresh.reason,
    ]),
  ),
];

await fs.mkdir(args.outDir, { recursive: true });
await Promise.all([
  fs.writeFile(path.join(args.outDir, "summary.json"), JSON.stringify(summary, null, 2)),
  fs.writeFile(path.join(args.outDir, "stores.json"), JSON.stringify(exportedStores, null, 2)),
  fs.writeFile(path.join(args.outDir, "unsynced-sites.json"), JSON.stringify(unsyncedStores, null, 2)),
  fs.writeFile(path.join(args.outDir, "products.ndjson"), `${productLines.join("\n")}\n`),
  fs.writeFile(path.join(args.outDir, "variants.ndjson"), `${variantLines.join("\n")}\n`),
  fs.writeFile(path.join(args.outDir, "offers.ndjson"), `${offerLines.join("\n")}\n`),
  fs.writeFile(path.join(args.outDir, "sites.tsv"), `${siteRows.join("\n")}\n`),
]);

console.log(
  JSON.stringify(
    {
      outDir: args.outDir,
      generatedAt,
      totals: summary.totals,
    },
    null,
    2,
  ),
);
