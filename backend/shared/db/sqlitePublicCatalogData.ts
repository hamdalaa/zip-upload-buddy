import fs from "node:fs/promises";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { compactText } from "../catalog/normalization.js";
import { ensureCatalogSqliteSchema, openCatalogSqlite } from "./sqliteSupport.js";

export interface SqliteCityIndexEntry {
  slug: string;
  city: string;
  cityAr: string;
  count: number;
}

export interface SqliteCityReviewSample {
  rating?: number | null;
  relativePublishTime?: string;
  publishTime?: string;
  text?: string;
  authorName?: string;
  authorPhotoUrl?: string;
  reviewGoogleMapsUrl?: string;
}

export interface SqliteCityStore {
  id: string;
  place_id?: string;
  name: string;
  city: string;
  area?: string;
  category?: string;
  suggested_category?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  websiteType?: string;
  googleMapsUrl?: string;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number;
  imageUrl?: string;
  gallery?: string[];
  openNow?: boolean | null;
  businessStatus?: string;
  workingHours?: string[];
  trustBadges?: string[];
  primaryType?: string;
  editorialSummary?: string;
  reviewSummary?: string;
  reviewsSample?: SqliteCityReviewSample[];
  quickSignals?: {
    has_website?: boolean;
    website_type?: string;
    has_google_maps?: boolean;
    has_rating?: boolean;
    has_reviews?: boolean;
    has_photos?: boolean;
    open_now?: boolean | null;
    business_status?: string;
  };
  lastUpdatedAt?: string;
}

export interface SqliteCityFile {
  city: string;
  cityAr: string;
  slug: string;
  count: number;
  stores: SqliteCityStore[];
}

export interface SqliteRawStoreLookupEntry {
  citySlug: string;
  cityAr: string;
  store: SqliteCityStore;
}

interface RawGoogleReviewStore {
  store_name: string;
  google_maps_url?: string;
  area?: string;
}

type DbRow = Record<string, unknown>;
type SqliteParam = string | number | bigint | Uint8Array | null;

function toSqliteParams(...values: unknown[]): SqliteParam[] {
  return values.map((value) => {
    if (value == null) return null;
    if (value instanceof Uint8Array) return value;
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
    return JSON.stringify(value);
  });
}

function parseJson<T>(value: unknown): T {
  return JSON.parse(String(value)) as T;
}

function extractGoogleCid(url?: string): string | undefined {
  if (!url) return undefined;
  const match = url.match(/[?&]cid=(\d+)/);
  return match?.[1];
}

export class SqlitePublicCatalogDataStore {
  private readonly db: DatabaseSync;

  constructor(databasePath: string) {
    this.db = openCatalogSqlite(databasePath);
    ensureCatalogSqliteSchema(this.db);
  }

  async importFromRepo(repoRoot: string): Promise<void> {
    const citiesDir = await resolveCitiesDir(repoRoot);
    const cityIndexRaw = await fs.readFile(path.join(citiesDir, "index.json"), "utf8");
    const cityIndex = JSON.parse(cityIndexRaw) as SqliteCityIndexEntry[];
    const reviewPayload = await loadGoogleReviewsPayload(repoRoot);

    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM public_city_index").run();
      this.db.prepare("DELETE FROM public_store_lookup").run();
      this.db.prepare("DELETE FROM public_street_area_lookup").run();

      const insertCity = this.db.prepare(
        `
        INSERT OR REPLACE INTO public_city_index (slug, city, city_ar, count, payload)
        VALUES (?, ?, ?, ?, ?)
        `,
      );
      const insertLookup = this.db.prepare(
        `
        INSERT OR REPLACE INTO public_store_lookup (lookup_key, city_slug, city_ar, normalized_name, store_payload)
        VALUES (?, ?, ?, ?, ?)
        `,
      );
      const insertStreetArea = this.db.prepare(
        `
        INSERT OR REPLACE INTO public_street_area_lookup (lookup_type, lookup_key, area)
        VALUES (?, ?, ?)
        `,
      );

      for (const entry of cityIndex) {
        const cityFileRaw = await fs.readFile(path.join(citiesDir, `${entry.slug}.json`), "utf8");
        const cityFile = JSON.parse(cityFileRaw) as SqliteCityFile;
        insertCity.run(...toSqliteParams(entry.slug, entry.city, entry.cityAr, entry.count, cityFileRaw));

        for (const store of cityFile.stores ?? []) {
          const payload = JSON.stringify(store);
          const normalizedName = compactText(store.name ?? "");
          insertLookup.run(...toSqliteParams(store.id, entry.slug, entry.cityAr, normalizedName, payload));
          if (store.place_id) {
            insertLookup.run(...toSqliteParams(store.place_id, entry.slug, entry.cityAr, normalizedName, payload));
          }
        }
      }

      for (const store of reviewPayload.stores ?? []) {
        const area = store.area?.trim();
        if (!area) continue;
        const cid = extractGoogleCid(store.google_maps_url);
        if (cid) {
          insertStreetArea.run(...toSqliteParams("cid", cid, area));
        }
        const normalizedName = compactText(store.store_name ?? "");
        if (normalizedName) {
          insertStreetArea.run(...toSqliteParams("name", normalizedName, area));
        }
      }

      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  listCityIndex(): SqliteCityIndexEntry[] {
    return this.db
      .prepare("SELECT slug, city, city_ar, count FROM public_city_index ORDER BY slug ASC")
      .all()
      .map((row) => {
        const typed = row as DbRow;
        return {
          slug: String(typed.slug),
          city: String(typed.city),
          cityAr: String(typed.city_ar),
          count: Number(typed.count),
        };
      });
  }

  getCityFile(slug: string): SqliteCityFile | null {
    const row = this.db
      .prepare("SELECT payload FROM public_city_index WHERE slug = ? LIMIT 1")
      .get(slug) as DbRow | undefined;
    if (!row?.payload) return null;
    return parseJson<SqliteCityFile>(row.payload);
  }

  findRawStoreByLookupKey(lookupKey: string): SqliteRawStoreLookupEntry | undefined {
    const row = this.db
      .prepare(
        `
        SELECT city_slug, city_ar, store_payload
        FROM public_store_lookup
        WHERE lookup_key = ?
        LIMIT 1
        `,
      )
      .get(lookupKey) as DbRow | undefined;
    if (!row) return undefined;
    return {
      citySlug: String(row.city_slug),
      cityAr: String(row.city_ar),
      store: parseJson<SqliteCityStore>(row.store_payload),
    };
  }

  findRawStoreByCitySlugAndName(citySlug: string, normalizedName: string): SqliteRawStoreLookupEntry | undefined {
    const row = this.db
      .prepare(
        `
        SELECT city_slug, city_ar, store_payload
        FROM public_store_lookup
        WHERE city_slug = ? AND normalized_name = ?
        LIMIT 1
        `,
      )
      .get(...toSqliteParams(citySlug, normalizedName)) as DbRow | undefined;
    if (!row) return undefined;
    return {
      citySlug: String(row.city_slug),
      cityAr: String(row.city_ar),
      store: parseJson<SqliteCityStore>(row.store_payload),
    };
  }

  findStreetAreaByCid(cid: string): string | undefined {
    const row = this.db
      .prepare(
        `
        SELECT area
        FROM public_street_area_lookup
        WHERE lookup_type = 'cid' AND lookup_key = ?
        LIMIT 1
        `,
      )
      .get(cid) as DbRow | undefined;
    return row?.area ? String(row.area) : undefined;
  }

  findStreetAreaByName(normalizedName: string): string | undefined {
    const row = this.db
      .prepare(
        `
        SELECT area
        FROM public_street_area_lookup
        WHERE lookup_type = 'name' AND lookup_key = ?
        LIMIT 1
        `,
      )
      .get(normalizedName) as DbRow | undefined;
    return row?.area ? String(row.area) : undefined;
  }
}

let sqlitePublicCatalogDataStore: SqlitePublicCatalogDataStore | null = null;
let sqlitePublicCatalogDataStorePath: string | null = null;

export function getSqlitePublicCatalogDataStore(databasePath: string) {
  if (!sqlitePublicCatalogDataStore || sqlitePublicCatalogDataStorePath !== databasePath) {
    sqlitePublicCatalogDataStore = new SqlitePublicCatalogDataStore(databasePath);
    sqlitePublicCatalogDataStorePath = databasePath;
  }
  return sqlitePublicCatalogDataStore;
}

async function loadGoogleReviewsPayload(repoRoot: string): Promise<{ stores?: RawGoogleReviewStore[] }> {
  const candidatePaths = [
    path.join(repoRoot, "src", "data", "all-google-reviews.json"),
    path.join(repoRoot, "..", "src", "data", "all-google-reviews.json"),
  ];

  for (const filePath of candidatePaths) {
    try {
      const raw = await fs.readFile(filePath, "utf8");
      return JSON.parse(raw) as { stores?: RawGoogleReviewStore[] };
    } catch {
      // Try the next candidate path.
    }
  }

  return {};
}

async function resolveCitiesDir(repoRoot: string): Promise<string> {
  const candidatePaths = [
    path.join(repoRoot, "data", "cities"),
    path.join(repoRoot, "backend", "data", "cities"),
  ];

  for (const candidatePath of candidatePaths) {
    try {
      await fs.access(path.join(candidatePath, "index.json"));
      return candidatePath;
    } catch {
      // Try the next candidate path.
    }
  }

  throw new Error(`Unable to locate city seed data under ${repoRoot}.`);
}
