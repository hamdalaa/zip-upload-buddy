import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CatalogHttpClientLike, CatalogHttpClientSession } from "../../shared/http/catalogHttpClient.js";
import type { ObjectStorage, StoredObjectMeta } from "../../shared/storage/objectStorage.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.resolve(__dirname, "..", "fixtures");

export async function loadFixture(name: string): Promise<string> {
  return fs.readFile(path.join(fixturesDir, name), "utf8");
}

export function createFixtureHttpClient(routeMap: Record<string, string>): CatalogHttpClientLike {
  const client: CatalogHttpClientLike = {
    async fetchText(url: string): Promise<string> {
      const fixture = routeMap[url];
      if (!fixture) throw new Error(`No fixture mapped for ${url}`);
      return loadFixture(fixture);
    },
    async fetchJson(url: string): Promise<unknown> {
      const fixture = routeMap[url];
      if (!fixture) throw new Error(`No fixture mapped for ${url}`);
      return JSON.parse(await loadFixture(fixture));
    },
    withSession(_session?: CatalogHttpClientSession) {
      return client;
    },
  };
  return client;
}

export class FakeObjectStorage implements ObjectStorage {
  readonly writes: StoredObjectMeta[] = [];

  async putObject(objectKey: string, body: Buffer): Promise<StoredObjectMeta> {
    const meta = {
      objectKey,
      sizeBytes: body.byteLength,
    };
    this.writes.push(meta);
    return meta;
  }
}

export class RecordingQueue {
  readonly probeJobs: Array<{ storeId: string; actor: string }> = [];
  readonly syncJobs: Array<{ storeId: string; actor: string }> = [];
  readonly discoveryJobs: Array<{ actor: string }> = [];
  readonly maintenanceJobs: Array<{ actor: string; task: "reindex-identities" | "audit-quality" }> = [];

  async enqueueProbe(payload: { storeId: string; actor: string }) {
    this.probeJobs.push(payload);
  }

  async enqueueSync(payload: { storeId: string; actor: string }) {
    this.syncJobs.push(payload);
  }

  async enqueueDiscoveryRescan(payload: { actor: string }) {
    this.discoveryJobs.push(payload);
  }

  async enqueueMaintenance(payload: { actor: string; task: "reindex-identities" | "audit-quality" }) {
    this.maintenanceJobs.push(payload);
  }
}
