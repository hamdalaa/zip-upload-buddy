import fs from "node:fs/promises";
import path from "node:path";
import { createCatalogContext } from "../shared/bootstrap.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";
import { isScrapeExcludedStore } from "../shared/catalog/scrapeExclusions.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    limit: get("--limit") ? Number(get("--limit")) : undefined,
    concurrency: get("--concurrency") ? Number(get("--concurrency")) : 4,
    includeUnofficial: argv.includes("--include-unofficial"),
    output:
      get("--output") ??
      path.resolve(".catalog-output", `zero-product-refresh-${new Date().toISOString().slice(0, 10)}.json`),
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

const stores = await context.repository.listStores();
const sizes = await context.repository.listStoreSizeSummaries();
const sizeByStoreId = new Map(sizes.map((summary) => [summary.storeId, summary]));

const zeroProductStores = stores.filter((store) => {
  if (!store.website) return false;
  if (!args.includeUnofficial && store.websiteType !== "official") return false;
  if (isScrapeExcludedStore(store)) return false;
  const size = sizeByStoreId.get(store.id);
  return !size || size.indexedProductCount <= 0;
});

const selected = args.limit ? zeroProductStores.slice(0, args.limit) : zeroProductStores;

console.log(
  JSON.stringify(
    {
      selectedStores: selected.length,
      sample: selected.slice(0, 20).map((store) => ({
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

const result = await refreshService.refresh({
  actor: "cli-zero-product-refresh",
  includeDiscovery: false,
  officialOnly: !args.includeUnofficial,
  dedupeByDomain: true,
  storeIds: selected.map((store) => store.id),
  concurrency: args.concurrency,
  progress: (item, completed, total) => {
    const details = [
      `status=${item.status}`,
      item.probeConnector ? `connector=${item.probeConnector}` : "",
      typeof item.productsIndexed === "number" ? `products=${item.productsIndexed}` : "",
      item.reason ? `reason=${item.reason}` : "",
    ]
      .filter(Boolean)
      .join(" ");
    console.log(`[${completed}/${total}] ${item.storeName} ${details}`);
  },
});

await fs.mkdir(path.dirname(args.output), { recursive: true });
await fs.writeFile(args.output, JSON.stringify(result, null, 2));

console.log(JSON.stringify({ output: args.output, summary: result }, null, 2));
