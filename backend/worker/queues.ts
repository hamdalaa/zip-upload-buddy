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

export interface CatalogJobQueue {
  enqueueProbe(payload: ProbeJobPayload): Promise<void>;
  enqueueSync(payload: SyncJobPayload): Promise<void>;
  enqueueDiscoveryRescan(payload: DiscoveryJobPayload): Promise<void>;
}

export const QUEUE_NAMES = {
  probe: `${catalogConfig.queuePrefix}:probe`,
  sync: `${catalogConfig.queuePrefix}:sync`,
  discovery: `${catalogConfig.queuePrefix}:discovery`,
} as const;

export class BullCatalogJobQueue implements CatalogJobQueue {
  private readonly probeQueue: Queue<ProbeJobPayload>;
  private readonly syncQueue: Queue<SyncJobPayload>;
  private readonly discoveryQueue: Queue<DiscoveryJobPayload>;

  constructor(private readonly connection: RedisConnection) {
    const defaultOptions: { connection: RedisConnection; defaultJobOptions: JobsOptions } = {
      connection,
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
}

export interface WorkerHandlers {
  probe(payload: ProbeJobPayload): Promise<void>;
  sync(payload: SyncJobPayload): Promise<void>;
  discovery(payload: DiscoveryJobPayload): Promise<void>;
}

export function createWorkers(connection: RedisConnection, handlers: WorkerHandlers): Worker[] {
  return [
    new Worker(QUEUE_NAMES.probe, (job: Job<ProbeJobPayload>) => handlers.probe(job.data), { connection }),
    new Worker(QUEUE_NAMES.sync, (job: Job<SyncJobPayload>) => handlers.sync(job.data), { connection }),
    new Worker(QUEUE_NAMES.discovery, (job: Job<DiscoveryJobPayload>) => handlers.discovery(job.data), { connection }),
  ];
}

export function createRedisConnection(): RedisConnection {
  return new Redis(catalogConfig.redisUrl, {
    maxRetriesPerRequest: null,
  });
}
