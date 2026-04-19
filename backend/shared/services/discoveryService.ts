import { createId, nowIso } from "../catalog/normalization.js";
import { importDiscoverySeeds } from "../seeds/importSeeds.js";
import type { CatalogRepository } from "../repositories/contracts.js";

export class DiscoveryService {
  constructor(private readonly repository: CatalogRepository) {}

  async rescan(actor: string): Promise<{ storesImported: number; domainsImported: number }> {
    const result = await importDiscoverySeeds(this.repository);
    await this.repository.createAuditLog({
      id: createId("audit"),
      actor,
      action: "discovery_rescan",
      details: { ...result },
      createdAt: nowIso(),
    });
    return result;
  }
}
