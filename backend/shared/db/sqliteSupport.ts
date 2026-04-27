import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SQLITE_BOOTSTRAP_SQL = `
PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA temp_store = MEMORY;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -20000;
`;

const SQLITE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  place_id TEXT,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  slug TEXT NOT NULL,
  city TEXT,
  city_ar TEXT,
  area TEXT,
  primary_category TEXT,
  suggested_category TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  website_type TEXT,
  google_maps_url TEXT,
  lat REAL,
  lng REAL,
  discovery_source TEXT NOT NULL,
  source_file TEXT,
  high_priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL,
  blocked_reason TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  last_probe_at TEXT,
  last_sync_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_domains (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  root_domain TEXT NOT NULL,
  classification TEXT NOT NULL,
  is_primary INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS store_domains_store_primary_idx
  ON store_domains(store_id, is_primary) WHERE is_primary = 1;
CREATE UNIQUE INDEX IF NOT EXISTS store_domains_root_domain_idx
  ON store_domains(store_id, root_domain);

CREATE TABLE IF NOT EXISTS connector_profiles (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL,
  platform_confidence REAL NOT NULL,
  platform_signals TEXT NOT NULL DEFAULT '[]',
  capabilities TEXT NOT NULL DEFAULT '{}',
  sync_strategy TEXT NOT NULL DEFAULT '{}',
  endpoints TEXT NOT NULL DEFAULT '{}',
  last_probe_status TEXT NOT NULL,
  last_probe_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  trigger_source TEXT NOT NULL,
  status TEXT NOT NULL,
  connector_type TEXT,
  products_discovered INTEGER NOT NULL DEFAULT 0,
  products_upserted INTEGER NOT NULL DEFAULT 0,
  offers_upserted INTEGER NOT NULL DEFAULT 0,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  error_message TEXT,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS catalog_products (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source_product_id TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  title TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  sku TEXT,
  seller_name TEXT,
  seller_id TEXT,
  category_path TEXT NOT NULL DEFAULT '[]',
  source_url TEXT NOT NULL,
  image_url TEXT,
  primary_image_url TEXT,
  images_json TEXT NOT NULL DEFAULT '[]',
  availability TEXT NOT NULL,
  currency TEXT NOT NULL,
  live_price REAL,
  original_price REAL,
  on_sale INTEGER NOT NULL DEFAULT 0,
  source_connector TEXT NOT NULL,
  freshness_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  offer_label TEXT,
  offer_starts_at TEXT,
  offer_ends_at TEXT,
  brand_tokens TEXT NOT NULL DEFAULT '[]',
  model_tokens TEXT NOT NULL DEFAULT '[]',
  sku_tokens TEXT NOT NULL DEFAULT '[]',
  raw_payload TEXT NOT NULL DEFAULT '{}',
  UNIQUE (store_id, source_product_id)
);

CREATE INDEX IF NOT EXISTS catalog_products_store_last_seen_idx
  ON catalog_products(store_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS catalog_products_last_seen_idx
  ON catalog_products(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS catalog_products_brand_idx
  ON catalog_products(brand);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_source_id TEXT NOT NULL,
  source_variant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sku TEXT,
  availability TEXT NOT NULL,
  live_price REAL,
  original_price REAL,
  attributes TEXT NOT NULL DEFAULT '{}',
  last_seen_at TEXT NOT NULL,
  raw_payload TEXT NOT NULL DEFAULT '{}',
  UNIQUE (store_id, product_source_id, source_variant_id)
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_source_id TEXT NOT NULL,
  label TEXT,
  discount_amount REAL,
  discount_percent REAL,
  starts_at TEXT,
  ends_at TEXT,
  active INTEGER NOT NULL DEFAULT 0,
  last_seen_at TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS offers_store_active_idx
  ON offers(store_id, active, last_seen_at DESC);

CREATE TABLE IF NOT EXISTS price_history_points (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_source_id TEXT NOT NULL,
  variant_source_id TEXT,
  live_price REAL,
  original_price REAL,
  captured_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS store_size_summaries (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  indexed_product_count INTEGER NOT NULL DEFAULT 0,
  indexed_variant_count INTEGER NOT NULL DEFAULT 0,
  active_offer_count INTEGER NOT NULL DEFAULT 0,
  category_count INTEGER NOT NULL DEFAULT 0,
  last_successful_sync_at TEXT,
  estimated_catalog_size INTEGER NOT NULL DEFAULT 0,
  coverage_pct REAL NOT NULL DEFAULT 0,
  sync_priority_tier TEXT NOT NULL DEFAULT 'weekly',
  computed_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS domain_acquisition_profiles (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  root_domain TEXT NOT NULL,
  website_type TEXT NOT NULL,
  connector_type TEXT,
  strategy TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  public_catalog_detected INTEGER NOT NULL DEFAULT 0,
  requires_session INTEGER NOT NULL DEFAULT 0,
  requires_feed INTEGER NOT NULL DEFAULT 0,
  duplicate_of_store_id TEXT,
  notes TEXT,
  last_classified_at TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS domain_blocker_evidence (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  blocker_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  http_status INTEGER,
  observed_url TEXT,
  observed_at TEXT NOT NULL,
  retry_after_hours INTEGER,
  details TEXT NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS domain_blocker_evidence_store_idx
  ON domain_blocker_evidence(store_id, observed_at DESC);

CREATE TABLE IF NOT EXISTS session_workflows (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  cookies_json TEXT,
  headers TEXT NOT NULL DEFAULT '{}',
  notes TEXT,
  expires_at TEXT,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_feeds (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  feed_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  auth_headers TEXT NOT NULL DEFAULT '{}',
  field_map TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  last_sync_at TEXT,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS raw_snapshots (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sync_run_id TEXT NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL,
  object_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  encrypted INTEGER NOT NULL DEFAULT 1,
  captured_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  scopes TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS request_nonces (
  nonce_hash TEXT PRIMARY KEY,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  store_id TEXT,
  sync_run_id TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY,
  payload TEXT NOT NULL DEFAULT '{}',
  updated_by TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS search_documents (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL,
  store_name TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  title TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  sku TEXT,
  live_price REAL,
  original_price REAL,
  on_sale INTEGER NOT NULL DEFAULT 0,
  availability TEXT NOT NULL,
  freshness_at TEXT NOT NULL,
  source_url TEXT NOT NULL,
  category_path TEXT NOT NULL,
  image_url TEXT,
  currency TEXT,
  offer_label TEXT,
  seller_name TEXT,
  canonical_product_id TEXT,
  legacy_canonical_product_id TEXT
);

CREATE INDEX IF NOT EXISTS search_documents_store_idx
  ON search_documents(store_id);
CREATE INDEX IF NOT EXISTS search_documents_filter_idx
  ON search_documents(on_sale, availability, live_price, freshness_at DESC);
CREATE INDEX IF NOT EXISTS search_documents_freshness_idx
  ON search_documents(freshness_at DESC);

CREATE VIRTUAL TABLE IF NOT EXISTS search_documents_fts USING fts5(
  id UNINDEXED,
  store_id UNINDEXED,
  normalized_title,
  title,
  brand,
  model,
  sku,
  store_name,
  category_path,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE TABLE IF NOT EXISTS public_city_index (
  slug TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  city_ar TEXT NOT NULL,
  count INTEGER NOT NULL,
  payload TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public_store_lookup (
  lookup_key TEXT PRIMARY KEY,
  city_slug TEXT NOT NULL,
  city_ar TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  store_payload TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS public_store_lookup_city_name_idx
  ON public_store_lookup(city_slug, normalized_name);

CREATE TABLE IF NOT EXISTS public_street_area_lookup (
  lookup_type TEXT NOT NULL,
  lookup_key TEXT NOT NULL,
  area TEXT NOT NULL,
  PRIMARY KEY (lookup_type, lookup_key)
);
`;

export function openCatalogSqlite(filePath: string): DatabaseSync {
  const resolvedPath = filePath === ":memory:" ? filePath : path.resolve(filePath);
  if (resolvedPath !== ":memory:") {
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  }

  const db = new DatabaseSync(resolvedPath);
  db.exec(SQLITE_BOOTSTRAP_SQL);
  return db;
}

export function ensureCatalogSqliteSchema(db: DatabaseSync): void {
  db.exec(SQLITE_SCHEMA_SQL);
  ensureColumn(db, "ALTER TABLE search_documents ADD COLUMN image_url TEXT");
  ensureColumn(db, "ALTER TABLE search_documents ADD COLUMN currency TEXT");
  ensureColumn(db, "ALTER TABLE search_documents ADD COLUMN offer_label TEXT");
  ensureColumn(db, "ALTER TABLE search_documents ADD COLUMN canonical_product_id TEXT");
  ensureColumn(db, "ALTER TABLE search_documents ADD COLUMN legacy_canonical_product_id TEXT");
  ensureColumn(db, "ALTER TABLE catalog_products ADD COLUMN primary_image_url TEXT");
  ensureColumn(db, "ALTER TABLE catalog_products ADD COLUMN images_json TEXT NOT NULL DEFAULT '[]'");
  db.exec(`
    CREATE INDEX IF NOT EXISTS search_documents_canonical_idx
      ON search_documents(canonical_product_id, freshness_at DESC);
    CREATE INDEX IF NOT EXISTS search_documents_legacy_canonical_idx
      ON search_documents(legacy_canonical_product_id, freshness_at DESC);
  `);
}

export function ensureSearchDocumentsFtsIndex(db: DatabaseSync): void {
  ensureCatalogSqliteSchema(db);

  const searchDocumentCount = Number(
    (
      db.prepare("SELECT COUNT(*) AS count FROM search_documents").get() as
        | { count?: number | bigint }
        | undefined
    )?.count ?? 0,
  );
  const ftsCount = Number(
    (
      db.prepare("SELECT COUNT(*) AS count FROM search_documents_fts").get() as
        | { count?: number | bigint }
        | undefined
    )?.count ?? 0,
  );

  if (searchDocumentCount === ftsCount) return;

  db.exec("BEGIN IMMEDIATE");
  try {
    db.exec("DELETE FROM search_documents_fts");
    db.exec(`
      INSERT INTO search_documents_fts (
        id,
        store_id,
        normalized_title,
        title,
        brand,
        model,
        sku,
        store_name,
        category_path
      )
      SELECT
        id,
        store_id,
        normalized_title,
        title,
        COALESCE(brand, ''),
        COALESCE(model, ''),
        COALESCE(sku, ''),
        store_name,
        category_path
      FROM search_documents
    `);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function ensureColumn(db: DatabaseSync, sql: string) {
  try {
    db.exec(sql);
  } catch {
    // Column already exists.
  }
}
