import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compactText } from "../shared/catalog/normalization.js";
import { SqlitePublicCatalogDataStore } from "../shared/db/sqlitePublicCatalogData.js";

describe("sqlite public catalog support data", () => {
  it("imports city payloads and store lookups into sqlite", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "catalog-public-sqlite-"));
    const dbPath = path.join(tempDir, "catalog.sqlite");

    try {
      const store = new SqlitePublicCatalogDataStore(dbPath);
      await store.importFromRepo(process.cwd());

      const cities = store.listCityIndex();
      expect(cities.length).toBeGreaterThan(5);
      expect(cities.some((city) => city.slug === "baghdad")).toBe(true);

      const baghdad = store.getCityFile("baghdad");
      expect(baghdad?.slug).toBe("baghdad");
      expect((baghdad?.stores.length ?? 0)).toBeGreaterThan(10);

      const firstStore = baghdad?.stores[0];
      expect(firstStore).toBeDefined();

      const byId = firstStore ? store.findRawStoreByLookupKey(firstStore.id) : undefined;
      expect(byId?.citySlug).toBe("baghdad");
      expect(byId?.store.name).toBe(firstStore?.name);

      const byName = firstStore
        ? store.findStreetAreaByName(compactText(firstStore.name))
        : undefined;
      expect(byName === undefined || typeof byName === "string").toBe(true);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
