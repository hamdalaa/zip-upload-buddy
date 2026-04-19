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
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  discovery_source TEXT NOT NULL,
  source_file TEXT,
  high_priority BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL,
  blocked_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_probe_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_domains (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  source_url TEXT NOT NULL,
  domain TEXT NOT NULL,
  root_domain TEXT NOT NULL,
  classification TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_domains_store_primary_idx ON store_domains(store_id, is_primary) WHERE is_primary = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS store_domains_root_domain_idx ON store_domains(store_id, root_domain);

CREATE TABLE IF NOT EXISTS connector_profiles (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL UNIQUE REFERENCES stores(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL,
  platform_confidence DOUBLE PRECISION NOT NULL,
  platform_signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  sync_strategy JSONB NOT NULL DEFAULT '{}'::jsonb,
  endpoints JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_probe_status TEXT NOT NULL,
  last_probe_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
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
  category_path JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_url TEXT NOT NULL,
  image_url TEXT,
  availability TEXT NOT NULL,
  currency TEXT NOT NULL,
  live_price DOUBLE PRECISION,
  original_price DOUBLE PRECISION,
  on_sale BOOLEAN NOT NULL DEFAULT FALSE,
  source_connector TEXT NOT NULL,
  freshness_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL,
  offer_label TEXT,
  offer_starts_at TIMESTAMPTZ,
  offer_ends_at TIMESTAMPTZ,
  brand_tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  model_tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  sku_tokens JSONB NOT NULL DEFAULT '[]'::jsonb,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (store_id, source_product_id)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_source_id TEXT NOT NULL,
  source_variant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  sku TEXT,
  availability TEXT NOT NULL,
  live_price DOUBLE PRECISION,
  original_price DOUBLE PRECISION,
  attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_seen_at TIMESTAMPTZ NOT NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  UNIQUE (store_id, product_source_id, source_variant_id)
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_source_id TEXT NOT NULL,
  label TEXT,
  discount_amount DOUBLE PRECISION,
  discount_percent DOUBLE PRECISION,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS price_history_points (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_source_id TEXT NOT NULL,
  variant_source_id TEXT,
  live_price DOUBLE PRECISION,
  original_price DOUBLE PRECISION,
  captured_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS store_size_summaries (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  indexed_product_count INTEGER NOT NULL DEFAULT 0,
  indexed_variant_count INTEGER NOT NULL DEFAULT 0,
  active_offer_count INTEGER NOT NULL DEFAULT 0,
  category_count INTEGER NOT NULL DEFAULT 0,
  last_successful_sync_at TIMESTAMPTZ,
  estimated_catalog_size INTEGER NOT NULL DEFAULT 0,
  coverage_pct DOUBLE PRECISION NOT NULL DEFAULT 0,
  sync_priority_tier TEXT NOT NULL DEFAULT 'weekly',
  computed_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS domain_acquisition_profiles (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  root_domain TEXT NOT NULL,
  website_type TEXT NOT NULL,
  connector_type TEXT,
  strategy TEXT NOT NULL,
  lifecycle_state TEXT NOT NULL,
  public_catalog_detected BOOLEAN NOT NULL DEFAULT FALSE,
  requires_session BOOLEAN NOT NULL DEFAULT FALSE,
  requires_feed BOOLEAN NOT NULL DEFAULT FALSE,
  duplicate_of_store_id TEXT,
  notes TEXT,
  last_classified_at TIMESTAMPTZ NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS domain_blocker_evidence (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  blocker_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  http_status INTEGER,
  observed_url TEXT,
  observed_at TIMESTAMPTZ NOT NULL,
  retry_after_hours INTEGER,
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS session_workflows (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  cookies_json TEXT,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS partner_feeds (
  store_id TEXT PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  feed_type TEXT NOT NULL,
  source_url TEXT NOT NULL,
  auth_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  field_map JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS raw_snapshots (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  sync_run_id TEXT NOT NULL REFERENCES sync_runs(id) ON DELETE CASCADE,
  connector_type TEXT NOT NULL,
  object_key TEXT NOT NULL,
  sha256 TEXT NOT NULL,
  size_bytes BIGINT NOT NULL,
  encrypted BOOLEAN NOT NULL DEFAULT TRUE,
  captured_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS service_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  token_hash TEXT NOT NULL UNIQUE,
  scopes JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS request_nonces (
  nonce_hash TEXT PRIMARY KEY,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  store_id TEXT,
  sync_run_id TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
