import fs from "node:fs/promises";
import path from "node:path";
import { createCatalogContext } from "../shared/bootstrap.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";
import { catalogConfig } from "../shared/config.js";
import { createCatalogApiServer } from "../api/server.js";
import { buildPublicBootstrap } from "../api/publicCatalog.js";
import { importScrapedSiteCatalogs } from "../shared/seeds/importScrapedSiteCatalogs.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  const getAll = (flag: string) =>
    argv.flatMap((entry, index) => (entry === flag ? [argv[index + 1]] : [])).filter(Boolean) as string[];

  const has = (flag: string) => argv.includes(flag);

  return {
    limit: get("--limit") ? Number(get("--limit")) : undefined,
    concurrency: get("--concurrency") ? Number(get("--concurrency")) : 6,
    port: get("--port") ? Number(get("--port")) : catalogConfig.port,
    output: get("--output"),
    storeIdsFile: get("--store-ids-file"),
    storeIds: getAll("--store-id"),
    officialOnly: !has("--include-social"),
    dedupeByDomain: !has("--no-dedupe"),
    skipRefresh: has("--skip-refresh"),
  };
}

const args = parseArgs(process.argv.slice(2));
const fileStoreIds = args.storeIdsFile
  ? (await fs.readFile(path.resolve(args.storeIdsFile), "utf8"))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
  : [];
const requestedStoreIds = [...new Set([...fileStoreIds, ...args.storeIds])];
const context = await createCatalogContext({ useMemory: true });

const queue = {
  async enqueueProbe() {},
  async enqueueSync() {},
  async enqueueDiscoveryRescan() {},
};

if (!args.skipRefresh) {
  const refreshService = new CatalogRefreshService(
    context.repository,
    context.discoveryService,
    context.probeService,
    context.syncService,
    context.coverageService,
  );

  console.log(
    JSON.stringify(
      {
        phase: "refresh_start",
        requestedStoreIds: requestedStoreIds.length,
        limit: args.limit ?? null,
        concurrency: args.concurrency,
        officialOnly: args.officialOnly,
        dedupeByDomain: args.dedupeByDomain,
      },
      null,
      2,
    ),
  );

  const result = await refreshService.refresh({
    actor: "memory-api",
    includeDiscovery: true,
    officialOnly: args.officialOnly,
    dedupeByDomain: args.dedupeByDomain,
    limit: args.limit,
    concurrency: args.concurrency,
    storeIds: requestedStoreIds.length > 0 ? requestedStoreIds : undefined,
  });

  if (args.output) {
    const target = path.resolve(args.output);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, JSON.stringify(result, null, 2));
  }

  console.log(
    JSON.stringify(
      {
        phase: "refresh_complete",
        candidateStores: result.candidateStores,
        syncedStores: result.syncedStores,
        probedOnlyStores: result.probedOnlyStores,
        failedStores: result.failedStores,
      },
      null,
      2,
    ),
  );
}

const scrapedImport = await importScrapedSiteCatalogs({
  repository: context.repository,
  searchEngine: context.searchEngine,
  repoRoot: catalogConfig.repoRoot,
});
console.log(
  JSON.stringify(
    {
      phase: "scraped_import_complete",
      storesImported: scrapedImport.storesImported,
      productsImported: scrapedImport.productsImported,
    },
    null,
    2,
  ),
);

const bootstrap = await buildPublicBootstrap(context);
console.log(
  JSON.stringify(
    {
      phase: "public_bootstrap_ready",
      stores: bootstrap.stores.length,
      brands: bootstrap.brands.length,
      productsIndexed: bootstrap.summary.totalProducts,
    },
    null,
    2,
  ),
);

const app = await createCatalogApiServer(context, queue);
await app.listen({
  port: args.port,
  host: catalogConfig.bindHost,
});

console.log(`Memory catalog API running on http://${catalogConfig.bindHost}:${args.port}`);
