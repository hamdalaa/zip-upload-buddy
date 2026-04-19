import path from "node:path";
import { catalogConfig } from "./config.js";
import { PostgresCatalogRepository } from "./db/postgresCatalogRepository.js";
import { MemoryCatalogRepository } from "./repositories/memoryCatalogRepository.js";
import { CatalogHttpClient } from "./http/catalogHttpClient.js";
import { ProbeService } from "./services/probeService.js";
import { SyncService } from "./services/syncService.js";
import { DiscoveryService } from "./services/discoveryService.js";
import { CoverageService } from "./services/coverageService.js";
import { FeedSyncService } from "./services/feedSyncService.js";
import { LocalObjectStorage, S3CompatibleObjectStorage } from "./storage/objectStorage.js";
import { MemorySearchEngine } from "./search/memorySearchEngine.js";
import { TypesenseSearchEngine } from "./search/typesenseSearchEngine.js";
import type { CatalogRepository } from "./repositories/contracts.js";
import type { SearchEngine } from "./search/contracts.js";
import type { ObjectStorage } from "./storage/objectStorage.js";
import { createId } from "./catalog/normalization.js";
import { hashServiceToken } from "./security/tokenHash.js";

export interface CatalogContext {
  repository: CatalogRepository;
  searchEngine: SearchEngine;
  discoveryService: DiscoveryService;
  probeService: ProbeService;
  syncService: SyncService;
  coverageService: CoverageService;
  feedSyncService: FeedSyncService;
}

export async function createCatalogContext(options?: { useMemory?: boolean }): Promise<CatalogContext> {
  const repository = options?.useMemory ? new MemoryCatalogRepository() : await createRepository();
  const searchEngine = options?.useMemory ? new MemorySearchEngine() : new TypesenseSearchEngine();
  await searchEngine.ensureReady();

  const storage = createObjectStorage(options?.useMemory ?? false);
  const client = new CatalogHttpClient();
  const discoveryService = new DiscoveryService(repository);
  const coverageService = new CoverageService(repository);
  const probeService = new ProbeService(repository, client);
  const syncService = new SyncService(
    repository,
    client,
    probeService,
    searchEngine,
    storage,
    catalogConfig.snapshotEncryptionKey,
  );
  const feedSyncService = new FeedSyncService(repository, searchEngine, coverageService);

  await repository.syncServiceTokens(
    catalogConfig.internalServiceTokens.map((token) => ({
      name: token.name,
      tokenHash: hashServiceToken(token.token, catalogConfig.tokenPepper),
      scopes: token.scopes,
    })),
  );

  return {
    repository,
    searchEngine,
    discoveryService,
    probeService,
    syncService,
    coverageService,
    feedSyncService,
  };
}

async function createRepository(): Promise<CatalogRepository> {
  const repository = new PostgresCatalogRepository(catalogConfig.databaseUrl);
  await repository.bootstrap();
  return repository;
}

function createObjectStorage(useMemory: boolean): ObjectStorage {
  if (useMemory) {
    return new LocalObjectStorage(path.join(catalogConfig.repoRoot, ".catalog-storage", createId("bucket")));
  }

  if (catalogConfig.storage.driver === "local") {
    if (!catalogConfig.storage.localStorageDir) {
      throw new Error("SNAPSHOT_LOCAL_STORAGE_DIR must be set when SNAPSHOT_STORAGE_DRIVER=local.");
    }
    return new LocalObjectStorage(catalogConfig.storage.localStorageDir);
  }

  if (
    catalogConfig.storage.driver === "s3" &&
    catalogConfig.storage.endpoint &&
    catalogConfig.storage.accessKey &&
    catalogConfig.storage.secretKey
  ) {
    return new S3CompatibleObjectStorage();
  }

  throw new Error("Snapshot storage is not configured securely. Refusing to fall back to local disk.");
}
