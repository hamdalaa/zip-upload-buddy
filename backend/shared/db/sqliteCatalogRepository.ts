import { DatabaseSync } from "node:sqlite";
import type {
  AuditLogRecord,
  CatalogProductDraft,
  ConnectorProfileRecord,
  DomainAcquisitionProfile,
  DomainBlockerEvidence,
  OfferDraft,
  PartnerFeedRecord,
  ProductVariantDraft,
  RawSnapshotRecord,
  SearchDocument,
  SessionWorkflowRecord,
  SiteSettingsRecord,
  StoreDomainRecord,
  StoreRecord,
  StoreSizeSummaryRecord,
  SyncRunRecord,
} from "../catalog/types.js";
import { createId, nowIso } from "../catalog/normalization.js";
import type { CatalogRepository, ServiceTokenRecord } from "../repositories/contracts.js";
import { ensureCatalogSqliteSchema, openCatalogSqlite } from "./sqliteSupport.js";

type DbRow = Record<string, unknown>;
type SqliteParam = string | number | bigint | Uint8Array | null;

function asOptionalString(value: unknown): string | undefined {
  return value == null ? undefined : String(value);
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

function asJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

function toSqliteParams(...values: unknown[]): SqliteParam[] {
  return values.map((value) => {
    if (value == null) return null;
    if (value instanceof Uint8Array) return value;
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
    return String(value);
  });
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseStringArray(value: unknown): string[] {
  const parsed = parseJson<unknown[]>(value, []);
  return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
}

function extractProductImages(rawPayload: Record<string, unknown>, imageUrl?: string): string[] {
  const mediaGallery = Array.isArray(rawPayload.media_gallery)
    ? rawPayload.media_gallery
        .map((entry) => {
          if (typeof entry === "string") return entry;
          if (entry && typeof entry === "object" && typeof (entry as { image?: unknown }).image === "string") {
            return (entry as { image: string }).image;
          }
          return undefined;
        })
        .filter((value): value is string => Boolean(value))
    : [];
  const candidates = [
    rawPayload.primaryImageUrl,
    rawPayload.imageUrl,
    rawPayload.image,
    rawPayload.small_image,
    rawPayload.thumbnail,
    ...(Array.isArray(rawPayload.images) ? rawPayload.images : []),
    ...(Array.isArray(rawPayload.gallery) ? rawPayload.gallery : []),
    ...mediaGallery,
    imageUrl,
  ];

  return [...new Set(
    candidates
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean),
  )];
}

function parseRecord(value: unknown): Record<string, unknown> {
  const parsed = parseJson<unknown>(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed)
    ? { ...(parsed as Record<string, unknown>) }
    : {};
}

function parseStringRecord(value: unknown): Record<string, string> {
  return Object.fromEntries(
    Object.entries(parseRecord(value)).map(([key, entry]) => [key, String(entry)]),
  );
}

export class SqliteCatalogRepository implements CatalogRepository {
  private readonly db: DatabaseSync;

  constructor(private readonly databasePath: string) {
    this.db = openCatalogSqlite(databasePath);
  }

  async bootstrap(): Promise<void> {
    ensureCatalogSqliteSchema(this.db);
  }

  async upsertStore(store: StoreRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO stores (
        id, place_id, name, normalized_name, slug, city, city_ar, area, primary_category, suggested_category,
        address, phone, whatsapp, website, website_type, google_maps_url, lat, lng, discovery_source, source_file,
        high_priority, status, blocked_reason, metadata, last_probe_at, last_sync_at, created_at, updated_at
      ) VALUES (
        ?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?,?,?,
        ?,?,?,?,?,?,?,?
      )
      ON CONFLICT(id) DO UPDATE SET
        place_id = excluded.place_id,
        name = excluded.name,
        normalized_name = excluded.normalized_name,
        slug = excluded.slug,
        city = excluded.city,
        city_ar = excluded.city_ar,
        area = excluded.area,
        primary_category = excluded.primary_category,
        suggested_category = excluded.suggested_category,
        address = excluded.address,
        phone = excluded.phone,
        whatsapp = excluded.whatsapp,
        website = excluded.website,
        website_type = excluded.website_type,
        google_maps_url = excluded.google_maps_url,
        lat = excluded.lat,
        lng = excluded.lng,
        discovery_source = excluded.discovery_source,
        source_file = excluded.source_file,
        high_priority = excluded.high_priority,
        status = excluded.status,
        blocked_reason = excluded.blocked_reason,
        metadata = excluded.metadata,
        last_probe_at = COALESCE(excluded.last_probe_at, stores.last_probe_at),
        last_sync_at = COALESCE(excluded.last_sync_at, stores.last_sync_at),
        created_at = COALESCE(stores.created_at, excluded.created_at),
        updated_at = excluded.updated_at
      `,
    ).run(...toSqliteParams(
      store.id,
      store.placeId,
      store.name,
      store.normalizedName,
      store.slug,
      store.city,
      store.cityAr,
      store.area,
      store.primaryCategory,
      store.suggestedCategory,
      store.address,
      store.phone,
      store.whatsapp,
      store.website,
      store.websiteType,
      store.googleMapsUrl,
      store.lat,
      store.lng,
      store.discoverySource,
      store.sourceFile,
      Number(Boolean(store.highPriority)),
      store.status,
      store.blockedReason,
      asJson(store.metadata ?? {}),
      store.lastProbeAt,
      store.lastSyncAt,
      store.createdAt,
      store.updatedAt,
    ));
  }

  async upsertStoreDomain(domain: StoreDomainRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO store_domains (id, store_id, source_url, domain, root_domain, classification, is_primary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id, root_domain) DO UPDATE SET
        id = excluded.id,
        source_url = excluded.source_url,
        domain = excluded.domain,
        classification = excluded.classification,
        is_primary = excluded.is_primary,
        created_at = excluded.created_at
      `,
    ).run(...toSqliteParams(
      domain.id,
      domain.storeId,
      domain.sourceUrl,
      domain.domain,
      domain.rootDomain,
      domain.classification,
      Number(domain.isPrimary),
      domain.createdAt,
    ));
  }

  async listStores(): Promise<StoreRecord[]> {
    return this.db
      .prepare("SELECT * FROM stores")
      .all()
      .map((row) => this.mapStoreRow(row as DbRow))
      .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  }

  async getStoresByIds(storeIds: string[]): Promise<StoreRecord[]> {
    if (storeIds.length === 0) return [];
    const uniqueIds = [...new Set(storeIds)];
    const placeholders = uniqueIds.map(() => "?").join(", ");
    return this.db
      .prepare(`SELECT * FROM stores WHERE id IN (${placeholders})`)
      .all(...uniqueIds)
      .map((row) => this.mapStoreRow(row as DbRow));
  }

  async getStoreById(storeId: string): Promise<StoreRecord | undefined> {
    const row = this.db.prepare("SELECT * FROM stores WHERE id = ? LIMIT 1").get(storeId) as DbRow | undefined;
    return row ? this.mapStoreRow(row) : undefined;
  }

  async updateStore(storeId: string, patch: Partial<StoreRecord>): Promise<void> {
    const current = await this.getStoreById(storeId);
    if (!current) return;
    await this.upsertStore({
      ...current,
      ...patch,
      metadata: patch.metadata ?? current.metadata,
      updatedAt: patch.updatedAt ?? current.updatedAt,
    });
  }

  async upsertConnectorProfile(profile: ConnectorProfileRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO connector_profiles (
        id, store_id, connector_type, platform_confidence, platform_signals, capabilities, sync_strategy, endpoints,
        last_probe_status, last_probe_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id) DO UPDATE SET
        id = excluded.id,
        connector_type = excluded.connector_type,
        platform_confidence = excluded.platform_confidence,
        platform_signals = excluded.platform_signals,
        capabilities = excluded.capabilities,
        sync_strategy = excluded.sync_strategy,
        endpoints = excluded.endpoints,
        last_probe_status = excluded.last_probe_status,
        last_probe_at = excluded.last_probe_at,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at
      `,
    ).run(...toSqliteParams(
      profile.id,
      profile.storeId,
      profile.connectorType,
      profile.platformConfidence,
      asJson(profile.platformSignals),
      asJson(profile.capabilities),
      asJson(profile.syncStrategy),
      asJson(profile.endpoints),
      profile.lastProbeStatus,
      profile.lastProbeAt,
      profile.createdAt,
      profile.updatedAt,
    ));
  }

  async getConnectorProfile(storeId: string): Promise<ConnectorProfileRecord | undefined> {
    const row = this.db
      .prepare("SELECT * FROM connector_profiles WHERE store_id = ? LIMIT 1")
      .get(storeId) as DbRow | undefined;
    if (!row) return undefined;
    return {
      id: String(row.id),
      storeId: String(row.store_id),
      connectorType: String(row.connector_type) as ConnectorProfileRecord["connectorType"],
      platformConfidence: asNumber(row.platform_confidence) ?? 0,
      platformSignals: parseStringArray(row.platform_signals),
      capabilities: parseJson<ConnectorProfileRecord["capabilities"]>(row.capabilities, {
        supportsStructuredApi: false,
        supportsHtmlCatalog: false,
        supportsOffers: false,
        supportsVariants: false,
        supportsMarketplaceContext: false,
        fallbackToBrowser: false,
      }),
      syncStrategy: parseJson<ConnectorProfileRecord["syncStrategy"]>(row.sync_strategy, {
        priorityTier: "weekly",
        probeFirst: true,
        deltaHours: 24,
        fullSyncHours: 168,
      }),
      endpoints: parseJson<ConnectorProfileRecord["endpoints"]>(row.endpoints, {}),
      lastProbeStatus: String(row.last_probe_status) as ConnectorProfileRecord["lastProbeStatus"],
      lastProbeAt: String(row.last_probe_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  async startSyncRun(run: SyncRunRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO sync_runs (
        id, store_id, scope, trigger_source, status, connector_type, products_discovered, products_upserted, offers_upserted,
        started_at, finished_at, error_message, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(...toSqliteParams(
      run.id,
      run.storeId,
      run.scope,
      run.triggerSource,
      run.status,
      run.connectorType,
      run.productsDiscovered,
      run.productsUpserted,
      run.offersUpserted,
      run.startedAt,
      run.finishedAt,
      run.errorMessage,
      asJson(run.metadata),
    ));
  }

  async finishSyncRun(runId: string, patch: Partial<SyncRunRecord>): Promise<void> {
    const current = await this.getSyncRun(runId);
    if (!current) return;
    const merged = { ...current, ...patch };
    this.db.prepare(
      `
      UPDATE sync_runs
      SET status = ?,
          connector_type = ?,
          products_discovered = ?,
          products_upserted = ?,
          offers_upserted = ?,
          finished_at = ?,
          error_message = ?,
          metadata = ?
      WHERE id = ?
      `,
    ).run(...toSqliteParams(
      merged.status,
      merged.connectorType,
      merged.productsDiscovered,
      merged.productsUpserted,
      merged.offersUpserted,
      merged.finishedAt,
      merged.errorMessage,
      asJson(merged.metadata),
      runId,
    ));
  }

  async getSyncRun(runId: string): Promise<SyncRunRecord | undefined> {
    const row = this.db.prepare("SELECT * FROM sync_runs WHERE id = ? LIMIT 1").get(runId) as DbRow | undefined;
    if (!row) return undefined;
    return {
      id: String(row.id),
      storeId: String(row.store_id),
      scope: String(row.scope) as SyncRunRecord["scope"],
      triggerSource: String(row.trigger_source) as SyncRunRecord["triggerSource"],
      status: String(row.status) as SyncRunRecord["status"],
      connectorType: asOptionalString(row.connector_type) as SyncRunRecord["connectorType"],
      productsDiscovered: asNumber(row.products_discovered) ?? 0,
      productsUpserted: asNumber(row.products_upserted) ?? 0,
      offersUpserted: asNumber(row.offers_upserted) ?? 0,
      startedAt: String(row.started_at),
      finishedAt: asOptionalString(row.finished_at),
      errorMessage: asOptionalString(row.error_message),
      metadata: parseRecord(row.metadata),
    };
  }

  async replaceCatalogSnapshot(
    storeId: string,
    products: CatalogProductDraft[],
    variants: ProductVariantDraft[],
    offers: OfferDraft[],
  ): Promise<void> {
    this.runTransaction(() => {
      this.db.prepare("DELETE FROM offers WHERE store_id = ?").run(storeId);
      this.db.prepare("DELETE FROM product_variants WHERE store_id = ?").run(storeId);
      this.db.prepare("DELETE FROM catalog_products WHERE store_id = ?").run(storeId);

      const insertProduct = this.db.prepare(
        `
        INSERT INTO catalog_products (
          id, store_id, source_product_id, normalized_title, title, brand, model, sku, seller_name, seller_id,
          category_path, source_url, image_url, primary_image_url, images_json, availability, currency, live_price, original_price, on_sale,
          source_connector, freshness_at, last_seen_at, offer_label, offer_starts_at, offer_ends_at,
          brand_tokens, model_tokens, sku_tokens, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      );
      const insertVariant = this.db.prepare(
        `
        INSERT INTO product_variants (
          id, store_id, product_source_id, source_variant_id, title, sku, availability, live_price, original_price,
          attributes, last_seen_at, raw_payload
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      );
      const insertOffer = this.db.prepare(
        `
        INSERT INTO offers (
          id, store_id, product_source_id, label, discount_amount, discount_percent, starts_at, ends_at, active,
          last_seen_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      );
      const insertPriceHistory = this.db.prepare(
        `
        INSERT INTO price_history_points (
          id, store_id, product_source_id, variant_source_id, live_price, original_price, captured_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      );

      for (const product of products) {
        insertProduct.run(...toSqliteParams(
          createId("prd"),
          storeId,
          product.sourceProductId,
          product.normalizedTitle,
          product.title,
          product.brand,
          product.model,
          product.sku,
          product.sellerName,
          product.sellerId,
          asJson(product.categoryPath),
          product.sourceUrl,
          product.imageUrl,
          product.primaryImageUrl ?? product.imageUrl,
          asJson(product.images ?? (product.imageUrl ? [product.imageUrl] : [])),
          product.availability,
          product.currency,
          product.livePrice,
          product.originalPrice,
          Number(product.onSale),
          product.sourceConnector,
          product.freshnessAt,
          product.lastSeenAt,
          product.offerLabel,
          product.offerStartsAt,
          product.offerEndsAt,
          asJson(product.brandTokens),
          asJson(product.modelTokens),
          asJson(product.skuTokens),
          asJson(product.rawPayload),
        ));
        insertPriceHistory.run(...toSqliteParams(
          createId("php"),
          storeId,
          product.sourceProductId,
          null,
          product.livePrice,
          product.originalPrice,
          product.lastSeenAt,
        ));
      }

      for (const variant of variants) {
        insertVariant.run(...toSqliteParams(
          createId("var"),
          storeId,
          variant.productSourceId,
          variant.sourceVariantId,
          variant.title,
          variant.sku,
          variant.availability,
          variant.livePrice,
          variant.originalPrice,
          asJson(variant.attributes),
          variant.lastSeenAt,
          asJson(variant.rawPayload),
        ));
        insertPriceHistory.run(...toSqliteParams(
          createId("php"),
          storeId,
          variant.productSourceId,
          variant.sourceVariantId,
          variant.livePrice,
          variant.originalPrice,
          variant.lastSeenAt,
        ));
      }

      for (const offer of offers) {
        insertOffer.run(...toSqliteParams(
          createId("off"),
          storeId,
          offer.productSourceId,
          offer.label,
          offer.discountAmount,
          offer.discountPercent,
          offer.startsAt,
          offer.endsAt,
          Number(offer.active),
          offer.lastSeenAt,
          asJson(offer.metadata),
        ));
      }
    });
  }

  async getStoreCatalog(storeId: string): Promise<{ products: CatalogProductDraft[]; variants: ProductVariantDraft[]; offers: OfferDraft[] }> {
    const products = this.db
      .prepare("SELECT * FROM catalog_products WHERE store_id = ? ORDER BY last_seen_at DESC")
      .all(storeId)
      .map((row) => this.mapProductRow(row as DbRow));
    const variants = this.db
      .prepare("SELECT * FROM product_variants WHERE store_id = ? ORDER BY last_seen_at DESC")
      .all(storeId)
      .map((row) => this.mapVariantRow(row as DbRow));
    const offers = this.db
      .prepare("SELECT * FROM offers WHERE store_id = ? ORDER BY last_seen_at DESC")
      .all(storeId)
      .map((row) => this.mapOfferRow(row as DbRow));

    return { products, variants, offers };
  }

  async saveStoreSizeSummary(summary: StoreSizeSummaryRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO store_size_summaries (
        store_id, indexed_product_count, indexed_variant_count, active_offer_count, category_count, last_successful_sync_at,
        estimated_catalog_size, coverage_pct, sync_priority_tier, computed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id) DO UPDATE SET
        indexed_product_count = excluded.indexed_product_count,
        indexed_variant_count = excluded.indexed_variant_count,
        active_offer_count = excluded.active_offer_count,
        category_count = excluded.category_count,
        last_successful_sync_at = excluded.last_successful_sync_at,
        estimated_catalog_size = excluded.estimated_catalog_size,
        coverage_pct = excluded.coverage_pct,
        sync_priority_tier = excluded.sync_priority_tier,
        computed_at = excluded.computed_at
      `,
    ).run(...toSqliteParams(
      summary.storeId,
      summary.indexedProductCount,
      summary.indexedVariantCount,
      summary.activeOfferCount,
      summary.categoryCount,
      summary.lastSuccessfulSyncAt,
      summary.estimatedCatalogSize,
      summary.coveragePct,
      summary.syncPriorityTier,
      summary.computedAt,
    ));
  }

  async getStoreSizeSummary(storeId: string): Promise<StoreSizeSummaryRecord | undefined> {
    const row = this.db
      .prepare("SELECT * FROM store_size_summaries WHERE store_id = ? LIMIT 1")
      .get(storeId) as DbRow | undefined;
    if (!row) return undefined;
    return {
      storeId: String(row.store_id),
      indexedProductCount: asNumber(row.indexed_product_count) ?? 0,
      indexedVariantCount: asNumber(row.indexed_variant_count) ?? 0,
      activeOfferCount: asNumber(row.active_offer_count) ?? 0,
      categoryCount: asNumber(row.category_count) ?? 0,
      lastSuccessfulSyncAt: asOptionalString(row.last_successful_sync_at),
      estimatedCatalogSize: asNumber(row.estimated_catalog_size) ?? 0,
      coveragePct: asNumber(row.coverage_pct) ?? 0,
      syncPriorityTier: String(row.sync_priority_tier) as StoreSizeSummaryRecord["syncPriorityTier"],
      computedAt: String(row.computed_at),
    };
  }

  async listStoreSizeSummaries(): Promise<StoreSizeSummaryRecord[]> {
    return this.db
      .prepare("SELECT * FROM store_size_summaries")
      .all()
      .map((row) => {
        const typed = row as DbRow;
        return {
          storeId: String(typed.store_id),
          indexedProductCount: asNumber(typed.indexed_product_count) ?? 0,
          indexedVariantCount: asNumber(typed.indexed_variant_count) ?? 0,
          activeOfferCount: asNumber(typed.active_offer_count) ?? 0,
          categoryCount: asNumber(typed.category_count) ?? 0,
          lastSuccessfulSyncAt: asOptionalString(typed.last_successful_sync_at),
          estimatedCatalogSize: asNumber(typed.estimated_catalog_size) ?? 0,
          coveragePct: asNumber(typed.coverage_pct) ?? 0,
          syncPriorityTier: String(typed.sync_priority_tier) as StoreSizeSummaryRecord["syncPriorityTier"],
          computedAt: String(typed.computed_at),
        };
      });
  }

  async saveAcquisitionProfile(profile: DomainAcquisitionProfile): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO domain_acquisition_profiles (
        store_id, root_domain, website_type, connector_type, strategy, lifecycle_state, public_catalog_detected,
        requires_session, requires_feed, duplicate_of_store_id, notes, last_classified_at, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id) DO UPDATE SET
        root_domain = excluded.root_domain,
        website_type = excluded.website_type,
        connector_type = excluded.connector_type,
        strategy = excluded.strategy,
        lifecycle_state = excluded.lifecycle_state,
        public_catalog_detected = excluded.public_catalog_detected,
        requires_session = excluded.requires_session,
        requires_feed = excluded.requires_feed,
        duplicate_of_store_id = excluded.duplicate_of_store_id,
        notes = excluded.notes,
        last_classified_at = excluded.last_classified_at,
        details = excluded.details
      `,
    ).run(...toSqliteParams(
      profile.storeId,
      profile.rootDomain,
      profile.websiteType,
      profile.connectorType,
      profile.strategy,
      profile.lifecycleState,
      Number(profile.publicCatalogDetected),
      Number(profile.requiresSession),
      Number(profile.requiresFeed),
      profile.duplicateOfStoreId,
      profile.notes,
      profile.lastClassifiedAt,
      asJson(profile.details),
    ));
  }

  async getAcquisitionProfile(storeId: string): Promise<DomainAcquisitionProfile | undefined> {
    const row = this.db
      .prepare("SELECT * FROM domain_acquisition_profiles WHERE store_id = ? LIMIT 1")
      .get(storeId) as DbRow | undefined;
    if (!row) return undefined;
    return this.mapAcquisitionProfileRow(row);
  }

  async listAcquisitionProfiles(): Promise<DomainAcquisitionProfile[]> {
    return this.db
      .prepare("SELECT * FROM domain_acquisition_profiles")
      .all()
      .map((row) => this.mapAcquisitionProfileRow(row as DbRow));
  }

  async addBlockerEvidence(evidence: DomainBlockerEvidence): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO domain_blocker_evidence (
        id, store_id, blocker_type, reason, http_status, observed_url, observed_at, retry_after_hours, details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(...toSqliteParams(
      evidence.id,
      evidence.storeId,
      evidence.blockerType,
      evidence.reason,
      evidence.httpStatus,
      evidence.observedUrl,
      evidence.observedAt,
      evidence.retryAfterHours,
      asJson(evidence.details),
    ));
  }

  async listBlockerEvidence(storeId: string): Promise<DomainBlockerEvidence[]> {
    return this.db
      .prepare("SELECT * FROM domain_blocker_evidence WHERE store_id = ? ORDER BY observed_at DESC")
      .all(storeId)
      .map((row) => this.mapBlockerEvidenceRow(row as DbRow));
  }

  async upsertSessionWorkflow(session: SessionWorkflowRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO session_workflows (store_id, status, cookies_json, headers, notes, expires_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id) DO UPDATE SET
        status = excluded.status,
        cookies_json = excluded.cookies_json,
        headers = excluded.headers,
        notes = excluded.notes,
        expires_at = excluded.expires_at,
        updated_at = excluded.updated_at
      `,
    ).run(...toSqliteParams(
      session.storeId,
      session.status,
      session.cookiesJson,
      asJson(session.headers ?? {}),
      session.notes,
      session.expiresAt,
      session.updatedAt,
    ));
  }

  async getSessionWorkflow(storeId: string): Promise<SessionWorkflowRecord | undefined> {
    const row = this.db
      .prepare("SELECT * FROM session_workflows WHERE store_id = ? LIMIT 1")
      .get(storeId) as DbRow | undefined;
    if (!row) return undefined;
    return {
      storeId: String(row.store_id),
      status: String(row.status) as SessionWorkflowRecord["status"],
      cookiesJson: asOptionalString(row.cookies_json),
      headers: parseStringRecord(row.headers),
      notes: asOptionalString(row.notes),
      expiresAt: asOptionalString(row.expires_at),
      updatedAt: String(row.updated_at),
    };
  }

  async upsertPartnerFeed(feed: PartnerFeedRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO partner_feeds (
        store_id, status, feed_type, source_url, auth_headers, field_map, updated_at, last_sync_at, last_error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(store_id) DO UPDATE SET
        status = excluded.status,
        feed_type = excluded.feed_type,
        source_url = excluded.source_url,
        auth_headers = excluded.auth_headers,
        field_map = excluded.field_map,
        updated_at = excluded.updated_at,
        last_sync_at = excluded.last_sync_at,
        last_error = excluded.last_error
      `,
    ).run(...toSqliteParams(
      feed.storeId,
      feed.status,
      feed.feedType,
      feed.sourceUrl,
      asJson(feed.authHeaders ?? {}),
      asJson(feed.fieldMap ?? {}),
      feed.updatedAt,
      feed.lastSyncAt,
      feed.lastError,
    ));
  }

  async getPartnerFeed(storeId: string): Promise<PartnerFeedRecord | undefined> {
    const row = this.db
      .prepare("SELECT * FROM partner_feeds WHERE store_id = ? LIMIT 1")
      .get(storeId) as DbRow | undefined;
    if (!row) return undefined;
    return {
      storeId: String(row.store_id),
      status: String(row.status) as PartnerFeedRecord["status"],
      feedType: String(row.feed_type) as PartnerFeedRecord["feedType"],
      sourceUrl: String(row.source_url),
      authHeaders: parseStringRecord(row.auth_headers),
      fieldMap: parseStringRecord(row.field_map),
      updatedAt: String(row.updated_at),
      lastSyncAt: asOptionalString(row.last_sync_at),
      lastError: asOptionalString(row.last_error),
    };
  }

  async saveRawSnapshot(snapshot: RawSnapshotRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO raw_snapshots (
        id, store_id, sync_run_id, connector_type, object_key, sha256, size_bytes, encrypted, captured_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(...toSqliteParams(
      snapshot.id,
      snapshot.storeId,
      snapshot.syncRunId,
      snapshot.connectorType,
      snapshot.objectKey,
      snapshot.sha256,
      snapshot.sizeBytes,
      Number(snapshot.encrypted),
      snapshot.capturedAt,
    ));
  }

  async listSearchDocuments(): Promise<SearchDocument[]> {
    return this.db
      .prepare(
        `
        SELECT p.*, s.name AS store_name
        FROM catalog_products p
        JOIN stores s ON s.id = p.store_id
        ORDER BY p.last_seen_at DESC
        `,
      )
      .all()
      .map((row) => this.mapSearchDocumentRow(row as DbRow));
  }

  async createAuditLog(log: AuditLogRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO audit_logs (id, actor, action, store_id, sync_run_id, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    ).run(...toSqliteParams(
      log.id,
      log.actor,
      log.action,
      log.storeId,
      log.syncRunId,
      asJson(log.details),
      log.createdAt,
    ));
  }

  async listAuditLogs(limit = 50, offset = 0): Promise<AuditLogRecord[]> {
    return this.db
      .prepare(
        `
        SELECT id, actor, action, store_id, sync_run_id, details, created_at
        FROM audit_logs
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
        `,
      )
      .all(...toSqliteParams(Math.max(1, Math.min(200, limit)), Math.max(0, offset)))
      .map((row) => {
        const record = row as DbRow;
        return {
          id: String(record.id),
          actor: String(record.actor),
          action: String(record.action),
          storeId: asOptionalString(record.store_id),
          syncRunId: asOptionalString(record.sync_run_id),
          details: parseRecord(record.details),
          createdAt: String(record.created_at),
        };
      });
  }

  async getSiteSettings(id = "default"): Promise<SiteSettingsRecord | undefined> {
    const row = this.db
      .prepare(
        `
        SELECT id, payload, updated_by, updated_at
        FROM site_settings
        WHERE id = ?
        LIMIT 1
        `,
      )
      .get(id) as DbRow | undefined;
    if (!row) return undefined;
    return {
      id: String(row.id),
      payload: parseJson<SiteSettingsRecord["payload"]>(row.payload, {} as SiteSettingsRecord["payload"]),
      updatedBy: String(row.updated_by),
      updatedAt: String(row.updated_at),
    };
  }

  async saveSiteSettings(settings: SiteSettingsRecord): Promise<void> {
    this.db.prepare(
      `
      INSERT INTO site_settings (id, payload, updated_by, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
      `,
    ).run(...toSqliteParams(
      settings.id,
      asJson(settings.payload),
      settings.updatedBy,
      settings.updatedAt,
    ));
  }

  async syncServiceTokens(tokens: ServiceTokenRecord[]): Promise<void> {
    const stmt = this.db.prepare(
      `
      INSERT INTO service_tokens (id, name, token_hash, scopes, active, created_at)
      VALUES (?, ?, ?, ?, 1, ?)
      ON CONFLICT(name) DO UPDATE SET
        token_hash = excluded.token_hash,
        scopes = excluded.scopes,
        active = 1
      `,
    );

    for (const token of tokens) {
      stmt.run(...toSqliteParams(createId("tok"), token.name, token.tokenHash, asJson(token.scopes), nowIso()));
    }
  }

  async getServiceTokenByHash(tokenHash: string): Promise<ServiceTokenRecord | undefined> {
    const row = this.db
      .prepare(
        `
        SELECT name, token_hash, scopes
        FROM service_tokens
        WHERE token_hash = ? AND active = 1
        LIMIT 1
        `,
      )
      .get(tokenHash) as DbRow | undefined;
    if (!row) return undefined;
    return {
      name: String(row.name),
      tokenHash: String(row.token_hash),
      scopes: parseStringArray(row.scopes),
    };
  }

  async registerRequestNonce(nonceHash: string, expiresAt: string): Promise<boolean> {
    this.db.prepare("DELETE FROM request_nonces WHERE expires_at <= ?").run(nowIso());
    const result = this.db
      .prepare(
        `
        INSERT OR IGNORE INTO request_nonces (nonce_hash, expires_at, created_at)
        VALUES (?, ?, ?)
        `,
      )
      .run(...toSqliteParams(nonceHash, expiresAt, nowIso()));
    return result.changes > 0;
  }

  private runTransaction<T>(fn: () => T): T {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  private mapStoreRow(row: DbRow): StoreRecord {
    return {
      id: String(row.id),
      placeId: asOptionalString(row.place_id),
      name: String(row.name),
      normalizedName: String(row.normalized_name ?? row.name),
      slug: String(row.slug ?? row.id),
      city: asOptionalString(row.city),
      cityAr: asOptionalString(row.city_ar),
      area: asOptionalString(row.area),
      primaryCategory: asOptionalString(row.primary_category),
      suggestedCategory: asOptionalString(row.suggested_category),
      address: asOptionalString(row.address),
      phone: asOptionalString(row.phone),
      whatsapp: asOptionalString(row.whatsapp),
      website: asOptionalString(row.website),
      websiteType: asOptionalString(row.website_type) as StoreRecord["websiteType"],
      googleMapsUrl: asOptionalString(row.google_maps_url),
      lat: asNumber(row.lat),
      lng: asNumber(row.lng),
      discoverySource: String(row.discovery_source) as StoreRecord["discoverySource"],
      sourceFile: asOptionalString(row.source_file),
      highPriority: asBoolean(row.high_priority),
      metadata: parseRecord(row.metadata),
      status: String(row.status) as StoreRecord["status"],
      blockedReason: asOptionalString(row.blocked_reason),
      lastProbeAt: asOptionalString(row.last_probe_at),
      lastSyncAt: asOptionalString(row.last_sync_at),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  private mapProductRow(row: DbRow): CatalogProductDraft {
    const rawPayload = parseRecord(row.raw_payload);
    const imageUrl = asOptionalString(row.image_url);
    const images = parseStringArray(row.images_json);
    const fallbackImages = images.length > 0 ? images : extractProductImages(rawPayload, imageUrl);
    const primaryImageUrl = asOptionalString(row.primary_image_url) ?? fallbackImages[0] ?? imageUrl;

    return {
      storeId: String(row.store_id),
      sourceProductId: String(row.source_product_id),
      normalizedTitle: String(row.normalized_title),
      title: String(row.title),
      brand: asOptionalString(row.brand),
      model: asOptionalString(row.model),
      sku: asOptionalString(row.sku),
      sellerName: asOptionalString(row.seller_name),
      sellerId: asOptionalString(row.seller_id),
      categoryPath: parseStringArray(row.category_path),
      sourceUrl: String(row.source_url),
      imageUrl,
      primaryImageUrl,
      images: fallbackImages,
      availability: String(row.availability) as CatalogProductDraft["availability"],
      currency: String(row.currency),
      livePrice: asNumber(row.live_price),
      originalPrice: asNumber(row.original_price),
      onSale: asBoolean(row.on_sale),
      sourceConnector: String(row.source_connector) as CatalogProductDraft["sourceConnector"],
      freshnessAt: String(row.freshness_at),
      lastSeenAt: String(row.last_seen_at),
      offerLabel: asOptionalString(row.offer_label),
      offerStartsAt: asOptionalString(row.offer_starts_at),
      offerEndsAt: asOptionalString(row.offer_ends_at),
      brandTokens: parseStringArray(row.brand_tokens),
      modelTokens: parseStringArray(row.model_tokens),
      skuTokens: parseStringArray(row.sku_tokens),
      rawPayload,
    };
  }

  private mapVariantRow(row: DbRow): ProductVariantDraft {
    return {
      productSourceId: String(row.product_source_id),
      sourceVariantId: String(row.source_variant_id),
      title: String(row.title),
      sku: asOptionalString(row.sku),
      availability: String(row.availability) as ProductVariantDraft["availability"],
      livePrice: asNumber(row.live_price),
      originalPrice: asNumber(row.original_price),
      attributes: parseStringRecord(row.attributes),
      lastSeenAt: String(row.last_seen_at),
      rawPayload: parseRecord(row.raw_payload),
    };
  }

  private mapOfferRow(row: DbRow): OfferDraft {
    return {
      productSourceId: String(row.product_source_id),
      label: asOptionalString(row.label),
      discountAmount: asNumber(row.discount_amount),
      discountPercent: asNumber(row.discount_percent),
      startsAt: asOptionalString(row.starts_at),
      endsAt: asOptionalString(row.ends_at),
      active: asBoolean(row.active),
      lastSeenAt: String(row.last_seen_at),
      metadata: parseRecord(row.metadata),
    };
  }

  private mapAcquisitionProfileRow(row: DbRow): DomainAcquisitionProfile {
    return {
      storeId: String(row.store_id),
      rootDomain: String(row.root_domain),
      websiteType: String(row.website_type) as DomainAcquisitionProfile["websiteType"],
      connectorType: asOptionalString(row.connector_type) as DomainAcquisitionProfile["connectorType"],
      strategy: String(row.strategy) as DomainAcquisitionProfile["strategy"],
      lifecycleState: String(row.lifecycle_state) as DomainAcquisitionProfile["lifecycleState"],
      publicCatalogDetected: asBoolean(row.public_catalog_detected),
      requiresSession: asBoolean(row.requires_session),
      requiresFeed: asBoolean(row.requires_feed),
      duplicateOfStoreId: asOptionalString(row.duplicate_of_store_id),
      notes: asOptionalString(row.notes),
      lastClassifiedAt: String(row.last_classified_at),
      details: parseRecord(row.details),
    };
  }

  private mapBlockerEvidenceRow(row: DbRow): DomainBlockerEvidence {
    return {
      id: String(row.id),
      storeId: String(row.store_id),
      blockerType: String(row.blocker_type) as DomainBlockerEvidence["blockerType"],
      reason: String(row.reason),
      httpStatus: asNumber(row.http_status),
      observedUrl: asOptionalString(row.observed_url),
      observedAt: String(row.observed_at),
      retryAfterHours: asNumber(row.retry_after_hours),
      details: parseRecord(row.details),
    };
  }

  private mapSearchDocumentRow(row: DbRow): SearchDocument {
    return {
      id: `${String(row.store_id)}:${String(row.source_product_id)}`,
      storeId: String(row.store_id),
      storeName: String(row.store_name),
      normalizedTitle: String(row.normalized_title),
      title: String(row.title),
      brand: asOptionalString(row.brand),
      model: asOptionalString(row.model),
      sku: asOptionalString(row.sku),
      livePrice: asNumber(row.live_price),
      originalPrice: asNumber(row.original_price),
      onSale: asBoolean(row.on_sale),
      availability: String(row.availability) as SearchDocument["availability"],
      freshnessAt: String(row.freshness_at),
      sourceUrl: String(row.source_url),
      categoryPath: parseStringArray(row.category_path).join(" > "),
      imageUrl: asOptionalString(row.image_url),
      currency: asOptionalString(row.currency),
      offerLabel: asOptionalString(row.offer_label),
      sellerName: asOptionalString(row.seller_name),
    };
  }
}
