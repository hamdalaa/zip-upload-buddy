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
    useMemory: argv.includes("--memory"),
    limit: get("--limit") ? Number(get("--limit")) : undefined,
    concurrency: get("--concurrency") ? Number(get("--concurrency")) : undefined,
    output: get("--output"),
    skipDiscovery: argv.includes("--skip-discovery"),
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

const result = await refreshService.refresh({
  actor: "cli",
  includeDiscovery: !args.skipDiscovery,
  officialOnly: true,
  dedupeByDomain: true,
  limit: args.limit,
  concurrency: args.concurrency,
});

if (args.output) {
  const target = path.resolve(args.output);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, JSON.stringify(result, null, 2));
}

console.log(JSON.stringify(result, null, 2));
