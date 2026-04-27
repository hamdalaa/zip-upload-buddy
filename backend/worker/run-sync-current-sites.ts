import fs from "node:fs/promises";
import path from "node:path";
import { createCatalogContext } from "../shared/bootstrap.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";
import { CurrentCatalogSyncService } from "../shared/services/currentCatalogSyncService.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    useMemory: argv.includes("--memory"),
    limit: get("--limit") ? Number(get("--limit")) : undefined,
    concurrency: get("--concurrency") ? Number(get("--concurrency")) : undefined,
    output: get("--output"),
    noDedupe: argv.includes("--no-dedupe"),
    includeUnofficial: argv.includes("--include-unofficial"),
    planOnly: argv.includes("--plan-only"),
  };
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
const currentSyncService = new CurrentCatalogSyncService(
  context.repository,
  refreshService,
);

const selectedStores = await currentSyncService.planCurrentStores({
  limit: args.limit,
  dedupeByDomain: !args.noDedupe,
  officialOnly: !args.includeUnofficial,
});

console.log(
  JSON.stringify(
    {
      selectedStores: selectedStores.length,
      selectedStoreIds: selectedStores.map((store) => store.id),
      sample: selectedStores.slice(0, 20).map((store) => ({
        id: store.id,
        name: store.name,
        website: store.website,
        status: store.status,
      })),
    },
    null,
    2,
  ),
);

if (args.planOnly) {
  process.exit(0);
}

const result = await currentSyncService.syncCurrentSites({
  actor: "cli-current-sync",
  limit: args.limit,
  concurrency: args.concurrency,
  dedupeByDomain: !args.noDedupe,
  officialOnly: !args.includeUnofficial,
  progress: (item, completed, total) => {
    const details = [
      `status=${item.status}`,
      item.probeConnector ? `connector=${item.probeConnector}` : "",
      typeof item.productsIndexed === "number" ? `products=${item.productsIndexed}` : "",
      typeof item.offersIndexed === "number" ? `offers=${item.offersIndexed}` : "",
      item.reason ? `reason=${item.reason}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`[${completed}/${total}] ${item.storeName} ${details}`);
  },
});

if (args.output) {
  const target = path.resolve(args.output);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(result, null, 2));
}

console.log(JSON.stringify(result, null, 2));
