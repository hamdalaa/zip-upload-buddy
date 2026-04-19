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
    report: get("--report"),
    output: get("--output"),
    concurrency: get("--concurrency") ? Number(get("--concurrency")) : undefined,
    useMemory: argv.includes("--memory"),
  };
}

const args = parseArgs(process.argv.slice(2));
if (!args.report) {
  throw new Error("--report <path> is required");
}

const reportPath = path.resolve(args.report);
const report = JSON.parse(await fs.readFile(reportPath, "utf8")) as {
  results: Array<{ storeId: string; status: string }>;
};

const failedStoreIds = report.results.filter((item) => item.status === "failed").map((item) => item.storeId);

const context = await createCatalogContext({ useMemory: args.useMemory });
const refreshService = new CatalogRefreshService(
  context.repository,
  context.discoveryService,
  context.probeService,
  context.syncService,
  context.coverageService,
);

const result = await refreshService.refresh({
  actor: "retry-cli",
  includeDiscovery: true,
  officialOnly: true,
  dedupeByDomain: false,
  concurrency: args.concurrency,
  storeIds: failedStoreIds,
});

if (args.output) {
  const outputPath = path.resolve(args.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
}

console.log(JSON.stringify(result, null, 2));
