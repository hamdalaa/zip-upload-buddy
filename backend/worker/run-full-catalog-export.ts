import fs from "node:fs/promises";
import path from "node:path";
import { createCatalogContext } from "../shared/bootstrap.js";
import { nowIso } from "../shared/catalog/normalization.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";

interface CliArgs {
  useMemory: boolean;
  limit?: number;
  concurrency?: number;
  outDir: string;
  skipDiscovery: boolean;
  includeSocial: boolean;
  allRecords: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    useMemory: argv.includes("--memory"),
    limit: get("--limit") ? Number(get("--limit")) : undefined,
    concurrency: get("--concurrency") ? Number(get("--concurrency")) : undefined,
    outDir: path.resolve(get("--out-dir") ?? ".catalog-output/full-catalog"),
    skipDiscovery: argv.includes("--skip-discovery"),
    includeSocial: argv.includes("--include-social"),
    allRecords: argv.includes("--all-records"),
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

const args = parseArgs(process.argv.slice(2));
const context = await createCatalogContext({ useMemory: args.useMemory });
const refreshService = new CatalogRefreshService(
  context.repository,
  context.discoveryService,
  context.probeService,
  context.syncService,
  context.coverageService,
);

const refresh = await refreshService.refresh({
  actor: "cli-export",
  includeDiscovery: !args.skipDiscovery,
  officialOnly: !args.includeSocial,
  dedupeByDomain: !args.allRecords,
  limit: args.limit,
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
const exportedStores = [];

for (const result of refresh.results) {
  const store = storeById.get(result.storeId);
  if (!store) continue;

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
  options: {
    useMemory: args.useMemory,
    limit: args.limit ?? null,
    concurrency: args.concurrency ?? null,
    skipDiscovery: args.skipDiscovery,
    includeSocial: args.includeSocial,
    allRecords: args.allRecords,
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
    "website",
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
      entry.store.website,
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
