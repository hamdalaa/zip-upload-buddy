import path from "node:path";
import { catalogConfig } from "./config.js";
import { PostgresCatalogRepository } from "./db/postgresCatalogRepository.js";
import { SqliteCatalogRepository } from "./db/sqliteCatalogRepository.js";
import { getSqlitePublicCatalogDataStore } from "./db/sqlitePublicCatalogData.js";
import { MemoryCatalogRepository } from "./repositories/memoryCatalogRepository.js";
import { CatalogHttpClient } from "./http/catalogHttpClient.js";
import { ProbeService } from "./services/probeService.js";
import { SyncService } from "./services/syncService.js";
import { DiscoveryService } from "./services/discoveryService.js";
import { CoverageService } from "./services/coverageService.js";
import { FeedSyncService } from "./services/feedSyncService.js";
import { LocalObjectStorage, S3CompatibleObjectStorage } from "./storage/objectStorage.js";
import { MemorySearchEngine } from "./search/memorySearchEngine.js";
import { SqliteSearchEngine } from "./search/sqliteSearchEngine.js";
import { TypesenseSearchEngine } from "./search/typesenseSearchEngine.js";
import type { CatalogRepository } from "./repositories/contracts.js";
import type { SearchEngine } from "./search/contracts.js";
import type { ObjectStorage } from "./storage/objectStorage.js";
import { createId } from "./catalog/normalization.js";
import { hashServiceToken } from "./security/tokenHash.js";
import { importScrapedSiteCatalogs } from "./seeds/importScrapedSiteCatalogs.js";

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
  const sqliteProductionDefaults =
    !options?.useMemory &&
    process.env.NODE_ENV === "production" &&
    catalogConfig.database.driver === "sqlite";
  const skipScrapedImport =
    process.env.CATALOG_SKIP_SCRAPED_IMPORT === "true" ||
    (process.env.CATALOG_SKIP_SCRAPED_IMPORT == null && sqliteProductionDefaults);
  const skipStartupReindex =
    process.env.CATALOG_SKIP_STARTUP_REINDEX === "true" ||
    (process.env.CATALOG_SKIP_STARTUP_REINDEX == null && sqliteProductionDefaults);
  const repository = options?.useMemory ? new MemoryCatalogRepository() : await createRepository();
  const searchEngine = options?.useMemory ? new MemorySearchEngine() : createSearchEngine();
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

  try {
    await repository.syncServiceTokens(
      catalogConfig.internalServiceTokens.map((token) => ({
        name: token.name,
        tokenHash: hashServiceToken(token.token, catalogConfig.tokenPepper),
        scopes: token.scopes,
      })),
    );
  } catch (error) {
    if (!sqliteProductionDefaults || !isTransientSqliteLock(error)) throw error;
    console.warn("Skipping service token startup sync because SQLite is temporarily locked; existing tokens remain active.");
  }

  if (!skipScrapedImport) {
    await importScrapedSiteCatalogs({
      repository,
      searchEngine,
      repoRoot: catalogConfig.repoRoot,
    });
  }
  if (!options?.useMemory && catalogConfig.search.driver === "sqlite" && !skipStartupReindex) {
    await rebuildPersistentSearchIndex(repository, searchEngine);
  }
  if (!options?.useMemory && catalogConfig.database.driver === "sqlite") {
    await getSqlitePublicCatalogDataStore(catalogConfig.database.sqlitePath).importFromRepo(catalogConfig.repoRoot);
  }
  await coverageService.reconcileCatalogPresence();

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

function isTransientSqliteLock(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: unknown; errstr?: unknown; message?: unknown };
  return (
    maybeError.code === "ERR_SQLITE_ERROR" &&
    (maybeError.errstr === "database is locked" || String(maybeError.message ?? "").includes("database is locked"))
  );
}

async function createRepository(): Promise<CatalogRepository> {
  if (catalogConfig.database.driver === "sqlite") {
    const repository = new SqliteCatalogRepository(catalogConfig.database.sqlitePath);
    await repository.bootstrap();
    return repository;
  }

  const repository = new PostgresCatalogRepository(catalogConfig.database.url);
  await repository.bootstrap();
  return repository;
}

function createSearchEngine(): SearchEngine {
  return catalogConfig.search.driver === "sqlite"
    ? new SqliteSearchEngine(catalogConfig.database.sqlitePath)
    : new TypesenseSearchEngine();
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

async function rebuildPersistentSearchIndex(repository: CatalogRepository, searchEngine: SearchEngine) {
  const stores = await repository.listStores();
  const documents = await repository.listSearchDocuments();
  const grouped = new Map<string, typeof documents>();
  for (const document of documents) {
    const current = grouped.get(document.storeId) ?? [];
    current.push(document);
    grouped.set(document.storeId, current);
  }

  for (const store of stores) {
    await searchEngine.replaceStoreDocuments(store.id, grouped.get(store.id) ?? []);
  }
}
