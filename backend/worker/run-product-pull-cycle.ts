import fs from "node:fs/promises";
import path from "node:path";
import { createCatalogContext } from "../shared/bootstrap.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";
import { CurrentCatalogSyncService } from "../shared/services/currentCatalogSyncService.js";
import { runProductPullCycle } from "../shared/services/productPullService.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    concurrency: get("--concurrency") ? Number(get("--concurrency")) : 4,
    currentLimit: get("--current-limit") ? Number(get("--current-limit")) : undefined,
    zeroLimit: get("--zero-limit") ? Number(get("--zero-limit")) : undefined,
    includeZeroProducts: argv.includes("--include-zero-products"),
    includeUnofficial: argv.includes("--include-unofficial"),
    output:
      get("--output") ??
      path.resolve(".catalog-output", `product-pull-cycle-${new Date().toISOString().slice(0, 10)}.json`),
  };
}

const args = parseArgs(process.argv.slice(2));
const context = await createCatalogContext();
const refreshService = new CatalogRefreshService(
  context.repository,
  context.discoveryService,
  context.probeService,
  context.syncService,
  context.coverageService,
);
const currentSyncService = new CurrentCatalogSyncService(context.repository, refreshService);

const currentPlan = await currentSyncService.planCurrentStores({
  limit: args.currentLimit,
  dedupeByDomain: true,
  officialOnly: !args.includeUnofficial,
});

console.log(
  JSON.stringify(
    {
      currentSyncSelectedStores: currentPlan.length,
      currentSample: currentPlan.slice(0, 20).map((store) => ({
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

const result = await runProductPullCycle(context, refreshService, currentSyncService, {
  actor: "cli-product-pull-cycle-current",
  concurrency: args.concurrency,
  currentLimit: args.currentLimit,
  zeroLimit: args.zeroLimit,
  includeZeroProducts: args.includeZeroProducts,
  includeUnofficial: args.includeUnofficial,
  currentProgress: (item, completed, total) => {
    const details = [
      `status=${item.status}`,
      item.probeConnector ? `connector=${item.probeConnector}` : "",
      typeof item.productsIndexed === "number" ? `products=${item.productsIndexed}` : "",
      typeof item.offersIndexed === "number" ? `offers=${item.offersIndexed}` : "",
      item.reason ? `reason=${item.reason}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`[current ${completed}/${total}] ${item.storeName} ${details}`);
  },
  zeroProgress: (item, completed, total) => {
    const details = [
      `status=${item.status}`,
      item.probeConnector ? `connector=${item.probeConnector}` : "",
      typeof item.productsIndexed === "number" ? `products=${item.productsIndexed}` : "",
      typeof item.offersIndexed === "number" ? `offers=${item.offersIndexed}` : "",
      item.reason ? `reason=${item.reason}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`[zero ${completed}/${total}] ${item.storeName} ${details}`);
  },
});

await fs.mkdir(path.dirname(args.output), { recursive: true });
await fs.writeFile(args.output, JSON.stringify(result, null, 2));

console.log(JSON.stringify(result, null, 2));
