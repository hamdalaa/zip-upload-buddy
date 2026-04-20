import { connectorRegistry } from "../../connectors/registry.js";
import type { CatalogHttpClientLike } from "../http/catalogHttpClient.js";
import { connectorDefaultPriority } from "../catalog/syncPolicy.js";
import { createId, nowIso } from "../catalog/normalization.js";
import type { CatalogRepository } from "../repositories/contracts.js";
import type { ConnectorProfileRecord, ProbeResult, StoreRecord, StoreStatus, SyncRunRecord } from "../catalog/types.js";

export class ProbeService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly client: CatalogHttpClientLike,
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

      const strategyHint = buildStrategyHint(store, homepageUrl);
      let selected = strategyHint;
      if (!selected) {
        selected =
          (await Promise.all(
            connectorRegistry.map((connector) =>
              connector.probe({
                store,
                homepageUrl,
                homepageHtml,
              }),
            ),
          )).find((result) => result && result.confidence >= 0.5) ?? null;
      }

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

function buildStrategyHint(store: StoreRecord, homepageUrl: string): ProbeResult | null {
  const strategy = typeof store.metadata?.strategy === "string" ? store.metadata.strategy : undefined;
  if (!strategy) return null;

  switch (strategy) {
    case "shopify_api":
      return {
        connectorType: "shopify",
        confidence: 0.99,
        signals: ["registry_strategy_hint:shopify_api"],
        capabilities: {
          supportsStructuredApi: true,
          supportsHtmlCatalog: true,
          supportsOffers: true,
          supportsVariants: true,
          supportsMarketplaceContext: false,
          fallbackToBrowser: false,
        },
        endpoints: {
          products: new URL("/products.json?limit=250&page=1", homepageUrl).toString(),
        },
      };
    case "woo_api":
      return {
        connectorType: "woocommerce",
        confidence: 0.99,
        signals: ["registry_strategy_hint:woo_api"],
        capabilities: {
          supportsStructuredApi: true,
          supportsHtmlCatalog: true,
          supportsOffers: true,
          supportsVariants: true,
          supportsMarketplaceContext: false,
          fallbackToBrowser: false,
        },
        endpoints: {
          products: new URL("/wp-json/wc/store/v1/products?per_page=100&page=1", homepageUrl).toString(),
        },
      };
    case "jibalzone_custom":
      return {
        connectorType: "jibalzone_storefront",
        confidence: 0.99,
        signals: ["registry_strategy_hint:jibalzone_custom"],
        capabilities: {
          supportsStructuredApi: false,
          supportsHtmlCatalog: true,
          supportsOffers: true,
          supportsVariants: false,
          supportsMarketplaceContext: false,
          fallbackToBrowser: false,
        },
        endpoints: {
          products: new URL("/en", homepageUrl).toString(),
        },
      };
    case "masterstore_custom":
      return {
        connectorType: "masterstore_next",
        confidence: 0.99,
        signals: ["registry_strategy_hint:masterstore_custom"],
        capabilities: {
          supportsStructuredApi: true,
          supportsHtmlCatalog: true,
          supportsOffers: true,
          supportsVariants: true,
          supportsMarketplaceContext: false,
          fallbackToBrowser: false,
        },
        endpoints: {
          products: new URL("/shop?page=1", homepageUrl).toString(),
        },
      };
    case "threed_iraq_custom":
      return {
        connectorType: "threed_iraq",
        confidence: 0.99,
        signals: ["registry_strategy_hint:threed_iraq_custom"],
        capabilities: {
          supportsStructuredApi: false,
          supportsHtmlCatalog: true,
          supportsOffers: true,
          supportsVariants: false,
          supportsMarketplaceContext: true,
          fallbackToBrowser: false,
        },
        endpoints: {
          products: new URL("/products?page=1", homepageUrl).toString(),
        },
      };
    default:
      return null;
  }
}
