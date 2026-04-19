import { nextSyncDelayHours } from "../shared/catalog/syncPolicy.js";
import type { CatalogRepository } from "../shared/repositories/contracts.js";
import type { CatalogJobQueue } from "./queues.js";

const HOUR_MS = 60 * 60 * 1000;

export async function scheduleDueWork(repository: CatalogRepository, queue: CatalogJobQueue): Promise<void> {
  const stores = await repository.listStores();
  for (const store of stores) {
    const size = await repository.getStoreSizeSummary(store.id);
    const acquisition = await repository.getAcquisitionProfile(store.id);
    const sessionWorkflow = await repository.getSessionWorkflow(store.id);
    const partnerFeed = await repository.getPartnerFeed(store.id);
    const lastSyncAt = store.lastSyncAt ? new Date(store.lastSyncAt).getTime() : 0;
    const lastProbeAt = store.lastProbeAt ? new Date(store.lastProbeAt).getTime() : 0;
    const now = Date.now();

    if (acquisition?.lifecycleState === "duplicate_domain" || acquisition?.lifecycleState === "non_catalog") {
      continue;
    }

    if (acquisition?.lifecycleState === "partner_feed_required" && partnerFeed?.status === "ready") {
      await queue.enqueueSync({ storeId: store.id, actor: "scheduler" });
      continue;
    }

    if (acquisition?.lifecycleState === "anti_bot_requires_session" && sessionWorkflow?.status === "ready") {
      await queue.enqueueSync({ storeId: store.id, actor: "scheduler" });
      continue;
    }

    if (store.status === "failed" || !size || size.indexedProductCount === 0 || acquisition?.lifecycleState === "probed") {
      if (now - lastProbeAt >= 7 * 24 * HOUR_MS) {
        await queue.enqueueProbe({ storeId: store.id, actor: "scheduler" });
      }
      continue;
    }

    const dueAfterMs = nextSyncDelayHours(size) * HOUR_MS;
    if (now - lastSyncAt >= dueAfterMs) {
      await queue.enqueueSync({ storeId: store.id, actor: "scheduler" });
    }
  }
}
