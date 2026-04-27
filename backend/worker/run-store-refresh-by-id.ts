import fs from "node:fs/promises";
import path from "node:path";
import { createCatalogContext } from "../shared/bootstrap.js";
import { CatalogRefreshService } from "../shared/services/catalogRefreshService.js";

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };

  return {
    storeId: get("--store-id"),
    output: get("--output"),
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.storeId) {
  throw new Error("Missing required --store-id");
}

const context = await createCatalogContext();
const refreshService = new CatalogRefreshService(
  context.repository,
  context.discoveryService,
  context.probeService,
  context.syncService,
  context.coverageService,
);

const result = await refreshService.refresh({
  actor: "cli-store-refresh-by-id",
  includeDiscovery: false,
  officialOnly: false,
  dedupeByDomain: false,
  storeIds: [args.storeId],
  concurrency: 1,
});

const payload = {
  storeId: args.storeId,
  generatedAt: new Date().toISOString(),
  result,
};

if (args.output) {
  const target = path.resolve(args.output);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(payload, null, 2));
}

console.log(JSON.stringify(payload, null, 2));
