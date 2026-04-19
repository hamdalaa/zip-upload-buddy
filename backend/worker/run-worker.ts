import { createCatalogContext } from "../shared/bootstrap.js";
import { createWorkers, createRedisConnection, BullCatalogJobQueue } from "./queues.js";
import { scheduleDueWork } from "./scheduler.js";

const context = await createCatalogContext();
await context.discoveryService.rescan("bootstrap");

const connection = createRedisConnection();
const queue = new BullCatalogJobQueue(connection);
const workers = createWorkers(connection, {
  probe: async ({ storeId, actor }) => {
    await context.probeService.probeStore(storeId, actor, "queue");
  },
  sync: async ({ storeId, actor }) => {
    await context.syncService.syncStore(storeId, actor, "queue");
  },
  discovery: async ({ actor }) => {
    await context.discoveryService.rescan(actor);
  },
});

await scheduleDueWork(context.repository, queue);
console.log(JSON.stringify(await context.coverageService.summarizeCoverage(), null, 2));
setInterval(() => {
  scheduleDueWork(context.repository, queue).catch((error) => {
    console.error("scheduler_error", error);
  });
}, 15 * 60 * 1000);

setInterval(() => {
  context.coverageService
    .summarizeCoverage()
    .then((summary) => console.log(JSON.stringify(summary, null, 2)))
    .catch((error) => console.error("coverage_summary_error", error));
}, 24 * 60 * 60 * 1000);

for (const worker of workers) {
  worker.on("failed", (job, error) => {
    console.error("worker_failed", job?.name, error);
  });
}

console.log(`catalog_worker_ready:${workers.length}`);
