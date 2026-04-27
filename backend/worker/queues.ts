import { Queue, Worker, type Job, type JobsOptions } from "bullmq";
import { Redis } from "ioredis";
import { catalogConfig } from "../shared/config.js";

type RedisConnection = Redis;

export interface ProbeJobPayload {
  storeId: string;
  actor: string;
}

export interface SyncJobPayload {
  storeId: string;
  actor: string;
}

export interface DiscoveryJobPayload {
  actor: string;
}

export interface MaintenanceJobPayload {
  actor: string;
  task: "reindex-identities" | "audit-quality";
}

export interface CatalogJobQueue {
  enqueueProbe(payload: ProbeJobPayload): Promise<void>;
  enqueueSync(payload: SyncJobPayload): Promise<void>;
  enqueueDiscoveryRescan(payload: DiscoveryJobPayload): Promise<void>;
  enqueueMaintenance(payload: MaintenanceJobPayload): Promise<void>;
}

export class NoopCatalogJobQueue implements CatalogJobQueue {
  async enqueueProbe(): Promise<void> {}
  async enqueueSync(): Promise<void> {}
  async enqueueDiscoveryRescan(): Promise<void> {}
  async enqueueMaintenance(): Promise<void> {}
}

export const QUEUE_NAMES = {
  probe: "probe",
  sync: "sync",
  discovery: "discovery",
  maintenance: "maintenance",
} as const;

export class BullCatalogJobQueue implements CatalogJobQueue {
  private readonly probeQueue: Queue<ProbeJobPayload>;
  private readonly syncQueue: Queue<SyncJobPayload>;
  private readonly discoveryQueue: Queue<DiscoveryJobPayload>;
  private readonly maintenanceQueue: Queue<MaintenanceJobPayload>;

  constructor(private readonly connection: RedisConnection) {
    const defaultOptions: { connection: RedisConnection; defaultJobOptions: JobsOptions; prefix: string } = {
      connection,
      prefix: catalogConfig.queuePrefix,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
        removeOnFail: 50,
        backoff: {
          type: "exponential",
          delay: 60_000,
        },
      },
    };
    this.probeQueue = new Queue(QUEUE_NAMES.probe, defaultOptions);
    this.syncQueue = new Queue(QUEUE_NAMES.sync, defaultOptions);
    this.discoveryQueue = new Queue(QUEUE_NAMES.discovery, defaultOptions);
    this.maintenanceQueue = new Queue(QUEUE_NAMES.maintenance, defaultOptions);
  }

  async enqueueProbe(payload: ProbeJobPayload): Promise<void> {
    await this.probeQueue.add(`probe:${payload.storeId}`, payload);
  }

  async enqueueSync(payload: SyncJobPayload): Promise<void> {
    await this.syncQueue.add(`sync:${payload.storeId}`, payload);
  }

  async enqueueDiscoveryRescan(payload: DiscoveryJobPayload): Promise<void> {
    await this.discoveryQueue.add("discovery:rescan", payload);
  }

  async enqueueMaintenance(payload: MaintenanceJobPayload): Promise<void> {
    await this.maintenanceQueue.add(`maintenance:${payload.task}`, payload);
  }
}

export interface WorkerHandlers {
  probe(payload: ProbeJobPayload): Promise<void>;
  sync(payload: SyncJobPayload): Promise<void>;
  discovery(payload: DiscoveryJobPayload): Promise<void>;
  maintenance(payload: MaintenanceJobPayload): Promise<void>;
}

export function createWorkers(connection: RedisConnection, handlers: WorkerHandlers): Worker[] {
  return [
    new Worker(QUEUE_NAMES.probe, (job: Job<ProbeJobPayload>) => handlers.probe(job.data), { connection, prefix: catalogConfig.queuePrefix }),
    new Worker(QUEUE_NAMES.sync, (job: Job<SyncJobPayload>) => handlers.sync(job.data), { connection, prefix: catalogConfig.queuePrefix }),
    new Worker(QUEUE_NAMES.discovery, (job: Job<DiscoveryJobPayload>) => handlers.discovery(job.data), { connection, prefix: catalogConfig.queuePrefix }),
    new Worker(QUEUE_NAMES.maintenance, (job: Job<MaintenanceJobPayload>) => handlers.maintenance(job.data), { connection, prefix: catalogConfig.queuePrefix }),
  ];
}

export function createRedisConnection(): RedisConnection {
  return new Redis(catalogConfig.redisUrl, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}

export async function createApiCatalogJobQueue(): Promise<CatalogJobQueue> {
  const connection = createRedisConnection();
  try {
    await connection.connect();
    return new BullCatalogJobQueue(connection);
  } catch (error) {
    await connection.quit().catch(() => {
      // Ignore cleanup errors after failed local Redis connect.
    });
    if (process.env.CATALOG_ALLOW_INSECURE_DEFAULTS === "true" || process.env.NODE_ENV !== "production") {
      return new NoopCatalogJobQueue();
    }
    throw error;
  }
}
