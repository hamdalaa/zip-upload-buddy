import { findConnector } from "../../connectors/registry.js";
import { buildSearchDocument } from "../catalog/searchDocuments.js";
import { summarizeStoreSize } from "../catalog/storeSizing.js";
import { createId, nowIso } from "../catalog/normalization.js";
import { encryptSnapshot } from "../security/snapshotCrypto.js";
import type { CatalogRepository } from "../repositories/contracts.js";
import type { ObjectStorage } from "../storage/objectStorage.js";
import type { SearchEngine } from "../search/contracts.js";
import type { ConnectorProfileRecord, RawSnapshotRecord, StoreRecord, SyncRunRecord } from "../catalog/types.js";
import type { CatalogHttpClientLike } from "../http/catalogHttpClient.js";
import { ProbeService } from "./probeService.js";

export class SyncService {
  constructor(
    private readonly repository: CatalogRepository,
    private readonly client: CatalogHttpClientLike,
    private readonly probeService: ProbeService,
    private readonly searchEngine: SearchEngine,
    private readonly objectStorage: ObjectStorage,
    private readonly encryptionKey: Buffer,
  ) {}

  async syncStore(storeId: string, actor: string, triggerSource: SyncRunRecord["triggerSource"]): Promise<SyncRunRecord> {
    const store = await this.getRequiredStore(storeId);
    const profile = (await this.repository.getConnectorProfile(storeId)) ?? (await this.probeService.probeStore(storeId, actor, triggerSource));
    const connector = findConnector(profile.connectorType);
    const session = await this.repository.getSessionWorkflow(storeId);
    const client = session?.status === "ready"
      ? this.client.withSession({ cookiesJson: session.cookiesJson, headers: session.headers })
      : this.client;
    const run: SyncRunRecord = {
      id: createId("run"),
      storeId,
      scope: "sync",
      triggerSource,
      status: "running",
      connectorType: profile.connectorType,
      productsDiscovered: 0,
      productsUpserted: 0,
      offersUpserted: 0,
      startedAt: nowIso(),
      metadata: {},
    };
    await this.repository.startSyncRun(run);

    try {
      const result = await connector.sync({
        store,
        profile: {
          connectorType: profile.connectorType,
          confidence: profile.platformConfidence,
          signals: profile.platformSignals,
          capabilities: profile.capabilities,
          endpoints: profile.endpoints,
        },
        client,
      });

      await this.repository.replaceCatalogSnapshot(storeId, result.products, result.variants, result.offers);

      const timestamp = nowIso();
      for (const snapshot of result.snapshots) {
        const encrypted = encryptSnapshot(snapshot.payload, this.encryptionKey);
        const objectKey = `${storeId}/${run.id}/${snapshot.label}.json.enc`;
        const stored = await this.objectStorage.putObject(objectKey, encrypted.buffer, "application/octet-stream");
        const rawSnapshot: RawSnapshotRecord = {
          id: createId("raw"),
          storeId,
          syncRunId: run.id,
          connectorType: profile.connectorType,
          objectKey: stored.objectKey,
          sha256: encrypted.sha256,
          sizeBytes: stored.sizeBytes,
          encrypted: true,
          capturedAt: timestamp,
        };
        await this.repository.saveRawSnapshot(rawSnapshot);
      }

      const summary = summarizeStoreSize({
        storeId,
        products: result.products,
        variants: result.variants,
        offers: result.offers,
        estimatedCatalogSize: result.estimatedCatalogSize,
        lastSuccessfulSyncAt: timestamp,
      });
      await this.repository.saveStoreSizeSummary(summary);
      await this.repository.updateStore(storeId, {
        status: result.products.length > 0 ? "indexed" : "indexable",
        lastSyncAt: timestamp,
        updatedAt: timestamp,
      });

      await this.searchEngine.replaceStoreDocuments(
        storeId,
        result.products.map((product) => buildSearchDocument(store, product)),
      );

      await this.repository.finishSyncRun(run.id, {
        status: "ok",
        finishedAt: timestamp,
        productsDiscovered: result.products.length,
        productsUpserted: result.products.length,
        offersUpserted: result.offers.length,
        metadata: {
          estimatedCatalogSize: result.estimatedCatalogSize ?? result.products.length,
          connectorType: profile.connectorType,
        },
      });

      await this.repository.createAuditLog({
        id: createId("audit"),
        actor,
        action: "store_sync",
        storeId,
        syncRunId: run.id,
        details: {
          connectorType: profile.connectorType,
          products: result.products.length,
          offers: result.offers.length,
        },
        createdAt: timestamp,
      });

      const completed = await this.repository.getSyncRun(run.id);
      if (!completed) {
        throw new Error("Sync run disappeared after completion.");
      }
      return completed;
    } catch (error) {
      const timestamp = nowIso();
      await this.repository.updateStore(storeId, {
        status: "failed",
        updatedAt: timestamp,
      });
      await this.repository.finishSyncRun(run.id, {
        status: "failed",
        finishedAt: timestamp,
        errorMessage: error instanceof Error ? error.message : "Unknown sync failure",
      });
      throw error;
    }
  }

  private async getRequiredStore(storeId: string): Promise<StoreRecord> {
    const store = await this.repository.getStoreById(storeId);
    if (!store) throw new Error(`Store ${storeId} was not found.`);
    return store;
  }
}
