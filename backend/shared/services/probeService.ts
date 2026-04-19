import { connectorRegistry } from "../../connectors/registry.js";
import { CatalogHttpClient } from "../http/catalogHttpClient.js";
import { connectorDefaultPriority } from "../catalog/syncPolicy.js";
import { createId, nowIso } from "../catalog/normalization.js";
import type { CatalogRepository } from "../repositories/contracts.js";
import type { ConnectorProfileRecord, StoreRecord, StoreStatus, SyncRunRecord } from "../catalog/types.js";

export class ProbeService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly client: CatalogHttpClient,
  ) {}

  async probeStore(storeId: string, actor: string, triggerSource: SyncRunRecord["triggerSource"]): Promise<ConnectorProfileRecord> {
    const store = await this.repository.getStoreById(storeId);
    if (!store) {
      throw new Error(`Store ${storeId} was not found.`);
    }

    const run: SyncRunRecord = {
      id: createId("run"),
      storeId: store.id,
      scope: "probe",
      triggerSource,
      status: "running",
      connectorType: undefined,
      productsDiscovered: 0,
      productsUpserted: 0,
      offersUpserted: 0,
      startedAt: nowIso(),
      metadata: {},
    };
    await this.repository.startSyncRun(run);

    try {
      const session = await this.repository.getSessionWorkflow(store.id);
      const client = session?.status === "ready"
        ? this.client.withSession({ cookiesJson: session.cookiesJson, headers: session.headers })
        : this.client;
      const homepageUrl = store.website ?? "about:blank";
      const homepageHtml = store.website ? await client.fetchText(homepageUrl) : "";

      let selected =
        (await Promise.all(
          connectorRegistry.map((connector) =>
            connector.probe({
              store,
              homepageUrl,
              homepageHtml,
            }),
          ),
        )).find((result) => result && result.confidence >= 0.5) ?? null;

      if (!selected) {
        selected = {
          connectorType: store.websiteType === "social" ? "social_only" : "unknown",
          confidence: store.websiteType === "social" ? 1 : 0.1,
          signals: store.websiteType === "social" ? ["social_only_website"] : ["no_known_platform_signals"],
          capabilities: {
            supportsStructuredApi: false,
            supportsHtmlCatalog: false,
            supportsOffers: false,
            supportsVariants: false,
            supportsMarketplaceContext: false,
            fallbackToBrowser: true,
          },
          endpoints: {},
        };
      }

      const timestamp = nowIso();
      const profile: ConnectorProfileRecord = {
        id: createId("prof"),
        storeId: store.id,
        connectorType: selected.connectorType,
        platformConfidence: selected.confidence,
        platformSignals: selected.signals,
        capabilities: selected.capabilities,
        syncStrategy: {
          priorityTier: connectorDefaultPriority(selected.connectorType),
          probeFirst: true,
          deltaHours: connectorDefaultPriority(selected.connectorType) === "hourly" ? 1 : 6,
          fullSyncHours: connectorDefaultPriority(selected.connectorType) === "weekly" ? 24 * 7 : 24,
        },
        endpoints: selected.endpoints,
        lastProbeStatus: "ok",
        lastProbeAt: timestamp,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await this.repository.upsertConnectorProfile(profile);
      await this.repository.updateStore(store.id, {
        status: nextStatus(store, selected.connectorType),
        lastProbeAt: timestamp,
        updatedAt: timestamp,
      });
      await this.repository.finishSyncRun(run.id, {
        status: "ok",
        connectorType: selected.connectorType,
        finishedAt: timestamp,
        metadata: { signals: selected.signals, confidence: selected.confidence },
      });
      await this.repository.createAuditLog({
        id: createId("audit"),
        actor,
        action: "store_probe",
        storeId: store.id,
        syncRunId: run.id,
        details: {
          connectorType: selected.connectorType,
          confidence: selected.confidence,
          signals: selected.signals,
        },
        createdAt: timestamp,
      });

      return profile;
    } catch (error) {
      const timestamp = nowIso();
      await this.repository.updateStore(store.id, {
        status: "failed",
        lastProbeAt: timestamp,
        updatedAt: timestamp,
      });
      await this.repository.finishSyncRun(run.id, {
        status: "failed",
        finishedAt: timestamp,
        errorMessage: error instanceof Error ? error.message : "Unknown probe failure",
      });
      throw error;
    }
  }
}

function nextStatus(store: StoreRecord, connectorType: ConnectorProfileRecord["connectorType"]): StoreStatus {
  if (connectorType === "social_only" || store.websiteType === "social") return "social_only";
  if (connectorType === "unknown") return "failed";
  return "indexable";
}
