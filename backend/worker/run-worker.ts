import { createCatalogContext } from "../shared/bootstrap.js";
import { createWorkers, createRedisConnection, BullCatalogJobQueue } from "./queues.js";
import { scheduleDueWork } from "./scheduler.js";
import { backfillCanonicalProductIds } from "../shared/services/catalogIdentityBackfillService.js";
import { writeCatalogQualityReport } from "../shared/services/catalogQualityReportService.js";

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
  maintenance: async ({ actor, task }) => {
    if (task === "reindex-identities") {
      const result = backfillCanonicalProductIds();
      await context.repository.createAuditLog({
        id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        actor,
        action: "catalog_identity_reindex_completed",
        details: { ...result },
        createdAt: new Date().toISOString(),
      });
      console.log(JSON.stringify({ task, actor, result }, null, 2));
      return;
    }
    const report = await writeCatalogQualityReport("catalog-quality");
    await context.repository.createAuditLog({
      id: `audit_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      actor,
      action: "catalog_quality_audit_completed",
      details: { ...report },
      createdAt: new Date().toISOString(),
    });
    console.log(JSON.stringify({ task, actor, report }, null, 2));
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
