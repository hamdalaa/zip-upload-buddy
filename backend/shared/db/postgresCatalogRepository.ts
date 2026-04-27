import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
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
import type { CatalogRepository, ServiceTokenRecord } from "../repositories/contracts.js";
import { createId } from "../catalog/normalization.js";

type DbRow = Record<string, unknown>;

function asJson<T>(value: T): string {
  return JSON.stringify(value);
}

function asOptionalIsoString(value: unknown): string | undefined {
  if (value == null) return undefined;
  return value instanceof Date ? value.toISOString() : String(value);
}

function asRequiredIsoString(value: unknown): string {
  return asOptionalIsoString(value) ?? new Date().toISOString();
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asUnknownRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

export class PostgresCatalogRepository implements CatalogRepository {
  readonly pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = new Pool({ connectionString: databaseUrl });
  }

  async bootstrap(): Promise<void> {
    const schemaPath = path.join(import.meta.dirname, "schema.sql");
    const schemaSql = await fs.readFile(schemaPath, "utf8");
    await this.pool.query(schemaSql);
  }

  async upsertStore(store: StoreRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO stores (
        id, place_id, name, normalized_name, slug, city, city_ar, area, primary_category, suggested_category,
        address, phone, whatsapp, website, website_type, google_maps_url, lat, lng, discovery_source, source_file,
        high_priority, status, blocked_reason, metadata, last_probe_at, last_sync_at, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24::jsonb,$25,$26,$27,$28
      )
      ON CONFLICT (id) DO UPDATE SET
        place_id = EXCLUDED.place_id,
        name = EXCLUDED.name,
        normalized_name = EXCLUDED.normalized_name,
        slug = EXCLUDED.slug,
        city = EXCLUDED.city,
        city_ar = EXCLUDED.city_ar,
        area = EXCLUDED.area,
        primary_category = EXCLUDED.primary_category,
        suggested_category = EXCLUDED.suggested_category,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        whatsapp = EXCLUDED.whatsapp,
        website = EXCLUDED.website,
        website_type = EXCLUDED.website_type,
        google_maps_url = EXCLUDED.google_maps_url,
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng,
        discovery_source = EXCLUDED.discovery_source,
        source_file = EXCLUDED.source_file,
        high_priority = EXCLUDED.high_priority,
        status = EXCLUDED.status,
        blocked_reason = EXCLUDED.blocked_reason,
        metadata = EXCLUDED.metadata,
        last_probe_at = COALESCE(EXCLUDED.last_probe_at, stores.last_probe_at),
        last_sync_at = COALESCE(EXCLUDED.last_sync_at, stores.last_sync_at),
        updated_at = EXCLUDED.updated_at
      `,
      [
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
        Boolean(store.highPriority),
        store.status,
        store.blockedReason,
        asJson(store.metadata ?? {}),
        store.lastProbeAt,
        store.lastSyncAt,
        store.createdAt,
        store.updatedAt,
      ],
    );
  }

  async upsertStoreDomain(domain: StoreDomainRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO store_domains (id, store_id, source_url, domain, root_domain, classification, is_primary, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (store_id, root_domain) DO UPDATE SET
        id = EXCLUDED.id,
        source_url = EXCLUDED.source_url,
        domain = EXCLUDED.domain,
        classification = EXCLUDED.classification,
        is_primary = EXCLUDED.is_primary
      `,
      [domain.id, domain.storeId, domain.sourceUrl, domain.domain, domain.rootDomain, domain.classification, domain.isPrimary, domain.createdAt],
    );
  }

  async listStores(): Promise<StoreRecord[]> {
    const result = await this.pool.query("SELECT * FROM stores ORDER BY name ASC");
    return result.rows.map(this.mapStoreRow);
  }

  async getStoresByIds(storeIds: string[]): Promise<StoreRecord[]> {
    if (storeIds.length === 0) return [];
    const uniqueIds = [...new Set(storeIds)];
    const result = await this.pool.query("SELECT * FROM stores WHERE id = ANY($1::text[])", [uniqueIds]);
    return result.rows.map(this.mapStoreRow);
  }

  async getStoreById(storeId: string): Promise<StoreRecord | undefined> {
    const result = await this.pool.query("SELECT * FROM stores WHERE id = $1 LIMIT 1", [storeId]);
    return result.rows[0] ? this.mapStoreRow(result.rows[0]) : undefined;
  }

  async updateStore(storeId: string, patch: Partial<StoreRecord>): Promise<void> {
    const current = await this.getStoreById(storeId);
    if (!current) return;
    await this.upsertStore({ ...current, ...patch, updatedAt: patch.updatedAt ?? current.updatedAt });
  }

  async upsertConnectorProfile(profile: ConnectorProfileRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO connector_profiles (
        id, store_id, connector_type, platform_confidence, platform_signals, capabilities, sync_strategy, endpoints,
        last_probe_status, last_probe_at, created_at, updated_at
      ) VALUES (
        $1,$2,$3,$4,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9,$10,$11,$12
      )
      ON CONFLICT (store_id) DO UPDATE SET
        connector_type = EXCLUDED.connector_type,
        platform_confidence = EXCLUDED.platform_confidence,
        platform_signals = EXCLUDED.platform_signals,
        capabilities = EXCLUDED.capabilities,
        sync_strategy = EXCLUDED.sync_strategy,
        endpoints = EXCLUDED.endpoints,
        last_probe_status = EXCLUDED.last_probe_status,
        last_probe_at = EXCLUDED.last_probe_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
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
      ],
    );
  }

  async getConnectorProfile(storeId: string): Promise<ConnectorProfileRecord | undefined> {
    const result = await this.pool.query("SELECT * FROM connector_profiles WHERE store_id = $1 LIMIT 1", [storeId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      storeId: row.store_id,
      connectorType: row.connector_type,
      platformConfidence: Number(row.platform_confidence),
      platformSignals: row.platform_signals ?? [],
      capabilities: row.capabilities,
      syncStrategy: row.sync_strategy,
      endpoints: row.endpoints,
      lastProbeStatus: row.last_probe_status,
      lastProbeAt: row.last_probe_at.toISOString(),
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async startSyncRun(run: SyncRunRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO sync_runs (
        id, store_id, scope, trigger_source, status, connector_type, products_discovered, products_upserted, offers_upserted,
        started_at, finished_at, error_message, metadata
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
      `,
      [
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
      ],
    );
  }

  async finishSyncRun(runId: string, patch: Partial<SyncRunRecord>): Promise<void> {
    const current = await this.getSyncRun(runId);
    if (!current) return;
    const merged = { ...current, ...patch };
    await this.pool.query(
      `
      UPDATE sync_runs
      SET status = $2, connector_type = $3, products_discovered = $4, products_upserted = $5, offers_upserted = $6,
          finished_at = $7, error_message = $8, metadata = $9::jsonb
      WHERE id = $1
      `,
      [
        runId,
        merged.status,
        merged.connectorType,
        merged.productsDiscovered,
        merged.productsUpserted,
        merged.offersUpserted,
        merged.finishedAt,
        merged.errorMessage,
        asJson(merged.metadata),
      ],
    );
  }

  async getSyncRun(runId: string): Promise<SyncRunRecord | undefined> {
    const result = await this.pool.query("SELECT * FROM sync_runs WHERE id = $1 LIMIT 1", [runId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      id: row.id,
      storeId: row.store_id,
      scope: row.scope,
      triggerSource: row.trigger_source,
      status: row.status,
      connectorType: row.connector_type,
      productsDiscovered: row.products_discovered,
      productsUpserted: row.products_upserted,
      offersUpserted: row.offers_upserted,
      startedAt: row.started_at.toISOString(),
      finishedAt: row.finished_at?.toISOString(),
      errorMessage: row.error_message ?? undefined,
      metadata: row.metadata ?? {},
    };
  }

  async replaceCatalogSnapshot(
    storeId: string,
    products: CatalogProductDraft[],
    variants: ProductVariantDraft[],
    offers: OfferDraft[],
  ): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM offers WHERE store_id = $1", [storeId]);
      await client.query("DELETE FROM product_variants WHERE store_id = $1", [storeId]);
      await client.query("DELETE FROM catalog_products WHERE store_id = $1", [storeId]);

      for (const product of products) {
        await client.query(
          `
          INSERT INTO catalog_products (
            id, store_id, source_product_id, normalized_title, title, brand, model, sku, seller_name, seller_id,
            category_path, source_url, image_url, primary_image_url, images_json, availability, currency, live_price, original_price, on_sale,
            source_connector, freshness_at, last_seen_at, offer_label, offer_starts_at, offer_ends_at,
            brand_tokens, model_tokens, sku_tokens, raw_payload
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15::jsonb,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26::jsonb,$27::jsonb,$28::jsonb,$29::jsonb
          )
          `,
          [
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
            product.onSale,
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
          ],
        );

        await client.query(
          `
          INSERT INTO price_history_points (id, store_id, product_source_id, variant_source_id, live_price, original_price, captured_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [createId("php"), storeId, product.sourceProductId, null, product.livePrice, product.originalPrice, product.lastSeenAt],
        );
      }

      for (const variant of variants) {
        await client.query(
          `
          INSERT INTO product_variants (
            id, store_id, product_source_id, source_variant_id, title, sku, availability, live_price, original_price, attributes, last_seen_at, raw_payload
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,$11,$12::jsonb)
          `,
          [
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
          ],
        );

        await client.query(
          `
          INSERT INTO price_history_points (id, store_id, product_source_id, variant_source_id, live_price, original_price, captured_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          `,
          [createId("php"), storeId, variant.productSourceId, variant.sourceVariantId, variant.livePrice, variant.originalPrice, variant.lastSeenAt],
        );
      }

      for (const offer of offers) {
        await client.query(
          `
          INSERT INTO offers (
            id, store_id, product_source_id, label, discount_amount, discount_percent, starts_at, ends_at, active, last_seen_at, metadata
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb)
          `,
          [
            createId("off"),
            storeId,
            offer.productSourceId,
            offer.label,
            offer.discountAmount,
            offer.discountPercent,
            offer.startsAt,
            offer.endsAt,
            offer.active,
            offer.lastSeenAt,
            asJson(offer.metadata),
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async getStoreCatalog(storeId: string): Promise<{ products: CatalogProductDraft[]; variants: ProductVariantDraft[]; offers: OfferDraft[] }> {
    const [productsResult, variantsResult, offersResult] = await Promise.all([
      this.pool.query("SELECT * FROM catalog_products WHERE store_id = $1", [storeId]),
      this.pool.query("SELECT * FROM product_variants WHERE store_id = $1", [storeId]),
      this.pool.query("SELECT * FROM offers WHERE store_id = $1", [storeId]),
    ]);

    return {
      products: productsResult.rows.map((row: DbRow) => ({
        storeId: String(row.store_id),
        sourceProductId: String(row.source_product_id),
        normalizedTitle: String(row.normalized_title),
        title: String(row.title),
        brand: row.brand == null ? undefined : String(row.brand),
        model: row.model == null ? undefined : String(row.model),
        sku: row.sku == null ? undefined : String(row.sku),
        sellerName: row.seller_name == null ? undefined : String(row.seller_name),
        sellerId: row.seller_id == null ? undefined : String(row.seller_id),
        categoryPath: asStringArray(row.category_path),
        sourceUrl: String(row.source_url),
        imageUrl: row.image_url == null ? undefined : String(row.image_url),
        primaryImageUrl: row.primary_image_url == null ? undefined : String(row.primary_image_url),
        images: asStringArray(row.images_json),
        availability: String(row.availability) as CatalogProductDraft["availability"],
        currency: String(row.currency),
        livePrice: typeof row.live_price === "number" ? row.live_price : undefined,
        originalPrice: typeof row.original_price === "number" ? row.original_price : undefined,
        onSale: Boolean(row.on_sale),
        sourceConnector: String(row.source_connector) as CatalogProductDraft["sourceConnector"],
        freshnessAt: asRequiredIsoString(row.freshness_at),
        lastSeenAt: asRequiredIsoString(row.last_seen_at),
        offerLabel: row.offer_label == null ? undefined : String(row.offer_label),
        offerStartsAt: asOptionalIsoString(row.offer_starts_at),
        offerEndsAt: asOptionalIsoString(row.offer_ends_at),
        brandTokens: asStringArray(row.brand_tokens),
        modelTokens: asStringArray(row.model_tokens),
        skuTokens: asStringArray(row.sku_tokens),
        rawPayload: asUnknownRecord(row.raw_payload),
      })),
      variants: variantsResult.rows.map((row: DbRow) => ({
        productSourceId: String(row.product_source_id),
        sourceVariantId: String(row.source_variant_id),
        title: String(row.title),
        sku: row.sku == null ? undefined : String(row.sku),
        availability: String(row.availability) as CatalogProductDraft["availability"],
        livePrice: typeof row.live_price === "number" ? row.live_price : undefined,
        originalPrice: typeof row.original_price === "number" ? row.original_price : undefined,
        attributes: Object.fromEntries(
          Object.entries(asUnknownRecord(row.attributes)).map(([key, value]) => [key, String(value)]),
        ),
        lastSeenAt: asRequiredIsoString(row.last_seen_at),
        rawPayload: asUnknownRecord(row.raw_payload),
      })),
      offers: offersResult.rows.map((row: DbRow) => ({
        productSourceId: String(row.product_source_id),
        label: row.label == null ? undefined : String(row.label),
        discountAmount: typeof row.discount_amount === "number" ? row.discount_amount : undefined,
        discountPercent: typeof row.discount_percent === "number" ? row.discount_percent : undefined,
        startsAt: asOptionalIsoString(row.starts_at),
        endsAt: asOptionalIsoString(row.ends_at),
        active: Boolean(row.active),
        lastSeenAt: asRequiredIsoString(row.last_seen_at),
        metadata: asUnknownRecord(row.metadata),
      })),
    };
  }

  async saveStoreSizeSummary(summary: StoreSizeSummaryRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO store_size_summaries (
        store_id, indexed_product_count, indexed_variant_count, active_offer_count, category_count, last_successful_sync_at,
        estimated_catalog_size, coverage_pct, sync_priority_tier, computed_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      ON CONFLICT (store_id) DO UPDATE SET
        indexed_product_count = EXCLUDED.indexed_product_count,
        indexed_variant_count = EXCLUDED.indexed_variant_count,
        active_offer_count = EXCLUDED.active_offer_count,
        category_count = EXCLUDED.category_count,
        last_successful_sync_at = EXCLUDED.last_successful_sync_at,
        estimated_catalog_size = EXCLUDED.estimated_catalog_size,
        coverage_pct = EXCLUDED.coverage_pct,
        sync_priority_tier = EXCLUDED.sync_priority_tier,
        computed_at = EXCLUDED.computed_at
      `,
      [
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
      ],
    );
  }

  async getStoreSizeSummary(storeId: string): Promise<StoreSizeSummaryRecord | undefined> {
    const result = await this.pool.query("SELECT * FROM store_size_summaries WHERE store_id = $1 LIMIT 1", [storeId]);
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      storeId: row.store_id,
      indexedProductCount: row.indexed_product_count,
      indexedVariantCount: row.indexed_variant_count,
      activeOfferCount: row.active_offer_count,
      categoryCount: row.category_count,
      lastSuccessfulSyncAt: asOptionalIsoString(row.last_successful_sync_at),
      estimatedCatalogSize: row.estimated_catalog_size,
      coveragePct: Number(row.coverage_pct),
      syncPriorityTier: row.sync_priority_tier,
      computedAt: row.computed_at.toISOString(),
    };
  }

  async listStoreSizeSummaries(): Promise<StoreSizeSummaryRecord[]> {
    const result = await this.pool.query("SELECT * FROM store_size_summaries");
    return result.rows.map((row: DbRow) => ({
      storeId: String(row.store_id),
      indexedProductCount: Number(row.indexed_product_count ?? 0),
      indexedVariantCount: Number(row.indexed_variant_count ?? 0),
      activeOfferCount: Number(row.active_offer_count ?? 0),
      categoryCount: Number(row.category_count ?? 0),
      lastSuccessfulSyncAt: asOptionalIsoString(row.last_successful_sync_at),
      estimatedCatalogSize: Number(row.estimated_catalog_size ?? 0),
      coveragePct: Number(row.coverage_pct ?? 0),
      syncPriorityTier: String(row.sync_priority_tier) as StoreSizeSummaryRecord["syncPriorityTier"],
      computedAt: asRequiredIsoString(row.computed_at),
    }));
  }

  async saveAcquisitionProfile(profile: DomainAcquisitionProfile): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO domain_acquisition_profiles (
        store_id, root_domain, website_type, connector_type, strategy, lifecycle_state, public_catalog_detected,
        requires_session, requires_feed, duplicate_of_store_id, notes, last_classified_at, details
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb)
      ON CONFLICT (store_id) DO UPDATE SET
        root_domain = EXCLUDED.root_domain,
        website_type = EXCLUDED.website_type,
        connector_type = EXCLUDED.connector_type,
        strategy = EXCLUDED.strategy,
        lifecycle_state = EXCLUDED.lifecycle_state,
        public_catalog_detected = EXCLUDED.public_catalog_detected,
        requires_session = EXCLUDED.requires_session,
        requires_feed = EXCLUDED.requires_feed,
        duplicate_of_store_id = EXCLUDED.duplicate_of_store_id,
        notes = EXCLUDED.notes,
        last_classified_at = EXCLUDED.last_classified_at,
        details = EXCLUDED.details
      `,
      [
        profile.storeId,
        profile.rootDomain,
        profile.websiteType,
        profile.connectorType,
        profile.strategy,
        profile.lifecycleState,
        profile.publicCatalogDetected,
        profile.requiresSession,
        profile.requiresFeed,
        profile.duplicateOfStoreId,
        profile.notes,
        profile.lastClassifiedAt,
        asJson(profile.details),
      ],
    );
  }

  async getAcquisitionProfile(storeId: string): Promise<DomainAcquisitionProfile | undefined> {
    const result = await this.pool.query(
      "SELECT * FROM domain_acquisition_profiles WHERE store_id = $1 LIMIT 1",
      [storeId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      storeId: row.store_id,
      rootDomain: row.root_domain,
      websiteType: row.website_type,
      connectorType: row.connector_type ?? undefined,
      strategy: row.strategy,
      lifecycleState: row.lifecycle_state,
      publicCatalogDetected: row.public_catalog_detected,
      requiresSession: row.requires_session,
      requiresFeed: row.requires_feed,
      duplicateOfStoreId: row.duplicate_of_store_id ?? undefined,
      notes: row.notes ?? undefined,
      lastClassifiedAt: row.last_classified_at.toISOString(),
      details: row.details ?? {},
    };
  }

  async listAcquisitionProfiles(): Promise<DomainAcquisitionProfile[]> {
    const result = await this.pool.query("SELECT * FROM domain_acquisition_profiles");
    return result.rows.map((row: DbRow) => ({
      storeId: String(row.store_id),
      rootDomain: String(row.root_domain),
      websiteType: String(row.website_type) as DomainAcquisitionProfile["websiteType"],
      connectorType: row.connector_type == null ? undefined : String(row.connector_type) as DomainAcquisitionProfile["connectorType"],
      strategy: String(row.strategy) as DomainAcquisitionProfile["strategy"],
      lifecycleState: String(row.lifecycle_state) as DomainAcquisitionProfile["lifecycleState"],
      publicCatalogDetected: Boolean(row.public_catalog_detected),
      requiresSession: Boolean(row.requires_session),
      requiresFeed: Boolean(row.requires_feed),
      duplicateOfStoreId: row.duplicate_of_store_id == null ? undefined : String(row.duplicate_of_store_id),
      notes: row.notes == null ? undefined : String(row.notes),
      lastClassifiedAt: asRequiredIsoString(row.last_classified_at),
      details: asUnknownRecord(row.details),
    }));
  }

  async addBlockerEvidence(evidence: DomainBlockerEvidence): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO domain_blocker_evidence (
        id, store_id, blocker_type, reason, http_status, observed_url, observed_at, retry_after_hours, details
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
      `,
      [
        evidence.id,
        evidence.storeId,
        evidence.blockerType,
        evidence.reason,
        evidence.httpStatus,
        evidence.observedUrl,
        evidence.observedAt,
        evidence.retryAfterHours,
        asJson(evidence.details),
      ],
    );
  }

  async listBlockerEvidence(storeId: string): Promise<DomainBlockerEvidence[]> {
    const result = await this.pool.query(
      "SELECT * FROM domain_blocker_evidence WHERE store_id = $1 ORDER BY observed_at DESC",
      [storeId],
    );
    return result.rows.map((row: DbRow) => ({
      id: String(row.id),
      storeId: String(row.store_id),
      blockerType: String(row.blocker_type) as DomainBlockerEvidence["blockerType"],
      reason: String(row.reason),
      httpStatus: typeof row.http_status === "number" ? row.http_status : undefined,
      observedUrl: row.observed_url == null ? undefined : String(row.observed_url),
      observedAt: asRequiredIsoString(row.observed_at),
      retryAfterHours: typeof row.retry_after_hours === "number" ? row.retry_after_hours : undefined,
      details: asUnknownRecord(row.details),
    }));
  }

  async upsertSessionWorkflow(session: SessionWorkflowRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO session_workflows (store_id, status, cookies_json, headers, notes, expires_at, updated_at)
      VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7)
      ON CONFLICT (store_id) DO UPDATE SET
        status = EXCLUDED.status,
        cookies_json = EXCLUDED.cookies_json,
        headers = EXCLUDED.headers,
        notes = EXCLUDED.notes,
        expires_at = EXCLUDED.expires_at,
        updated_at = EXCLUDED.updated_at
      `,
      [
        session.storeId,
        session.status,
        session.cookiesJson,
        asJson(session.headers ?? {}),
        session.notes,
        session.expiresAt,
        session.updatedAt,
      ],
    );
  }

  async getSessionWorkflow(storeId: string): Promise<SessionWorkflowRecord | undefined> {
    const result = await this.pool.query(
      "SELECT * FROM session_workflows WHERE store_id = $1 LIMIT 1",
      [storeId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      storeId: row.store_id,
      status: row.status,
      cookiesJson: row.cookies_json ?? undefined,
      headers: row.headers ?? {},
      notes: row.notes ?? undefined,
      expiresAt: row.expires_at?.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    };
  }

  async upsertPartnerFeed(feed: PartnerFeedRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO partner_feeds (
        store_id, status, feed_type, source_url, auth_headers, field_map, updated_at, last_sync_at, last_error
      ) VALUES ($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8,$9)
      ON CONFLICT (store_id) DO UPDATE SET
        status = EXCLUDED.status,
        feed_type = EXCLUDED.feed_type,
        source_url = EXCLUDED.source_url,
        auth_headers = EXCLUDED.auth_headers,
        field_map = EXCLUDED.field_map,
        updated_at = EXCLUDED.updated_at,
        last_sync_at = EXCLUDED.last_sync_at,
        last_error = EXCLUDED.last_error
      `,
      [
        feed.storeId,
        feed.status,
        feed.feedType,
        feed.sourceUrl,
        asJson(feed.authHeaders ?? {}),
        asJson(feed.fieldMap ?? {}),
        feed.updatedAt,
        feed.lastSyncAt,
        feed.lastError,
      ],
    );
  }

  async getPartnerFeed(storeId: string): Promise<PartnerFeedRecord | undefined> {
    const result = await this.pool.query(
      "SELECT * FROM partner_feeds WHERE store_id = $1 LIMIT 1",
      [storeId],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      storeId: row.store_id,
      status: row.status,
      feedType: row.feed_type,
      sourceUrl: row.source_url,
      authHeaders: row.auth_headers ?? {},
      fieldMap: row.field_map ?? {},
      updatedAt: row.updated_at.toISOString(),
      lastSyncAt: row.last_sync_at?.toISOString(),
      lastError: row.last_error ?? undefined,
    };
  }

  async saveRawSnapshot(snapshot: RawSnapshotRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO raw_snapshots (id, store_id, sync_run_id, connector_type, object_key, sha256, size_bytes, encrypted, captured_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `,
      [
        snapshot.id,
        snapshot.storeId,
        snapshot.syncRunId,
        snapshot.connectorType,
        snapshot.objectKey,
        snapshot.sha256,
        snapshot.sizeBytes,
        snapshot.encrypted,
        snapshot.capturedAt,
      ],
    );
  }

  async listSearchDocuments(): Promise<SearchDocument[]> {
    const result = await this.pool.query(
      `
      SELECT p.*, s.name AS store_name
      FROM catalog_products p
      JOIN stores s ON s.id = p.store_id
      ORDER BY p.last_seen_at DESC
      `,
    );

    return result.rows.map((row: DbRow) => ({
      id: `${String(row.store_id)}:${String(row.source_product_id)}`,
      storeId: String(row.store_id),
      storeName: String(row.store_name),
      normalizedTitle: String(row.normalized_title),
      title: String(row.title),
      brand: row.brand == null ? undefined : String(row.brand),
      model: row.model == null ? undefined : String(row.model),
      sku: row.sku == null ? undefined : String(row.sku),
      livePrice: typeof row.live_price === "number" ? row.live_price : undefined,
      originalPrice: typeof row.original_price === "number" ? row.original_price : undefined,
      onSale: Boolean(row.on_sale),
      availability: String(row.availability) as SearchDocument["availability"],
      freshnessAt: asRequiredIsoString(row.freshness_at),
      sourceUrl: String(row.source_url),
      categoryPath: asStringArray(row.category_path).join(" > "),
      imageUrl: row.image_url == null ? undefined : String(row.image_url),
      currency: row.currency == null ? undefined : String(row.currency),
      offerLabel: row.offer_label == null ? undefined : String(row.offer_label),
      sellerName: row.seller_name == null ? undefined : String(row.seller_name),
    }));
  }

  async createAuditLog(log: AuditLogRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO audit_logs (id, actor, action, store_id, sync_run_id, details, created_at)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
      [log.id, log.actor, log.action, log.storeId, log.syncRunId, asJson(log.details), log.createdAt],
    );
  }

  async listAuditLogs(limit = 50, offset = 0): Promise<AuditLogRecord[]> {
    const result = await this.pool.query(
      `
      SELECT id, actor, action, store_id, sync_run_id, details, created_at
      FROM audit_logs
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
      `,
      [Math.max(1, Math.min(200, limit)), Math.max(0, offset)],
    );
    return result.rows.map((row: DbRow) => ({
      id: String(row.id),
      actor: String(row.actor),
      action: String(row.action),
      storeId: row.store_id == null ? undefined : String(row.store_id),
      syncRunId: row.sync_run_id == null ? undefined : String(row.sync_run_id),
      details: asUnknownRecord(row.details),
      createdAt: asRequiredIsoString(row.created_at),
    }));
  }

  async getSiteSettings(id = "default"): Promise<SiteSettingsRecord | undefined> {
    const result = await this.pool.query(
      `
      SELECT id, payload, updated_by, updated_at
      FROM site_settings
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );
    const row = result.rows[0] as DbRow | undefined;
    if (!row) return undefined;
    return {
      id: String(row.id),
      payload: asUnknownRecord(row.payload) as unknown as SiteSettingsRecord["payload"],
      updatedBy: String(row.updated_by),
      updatedAt: asRequiredIsoString(row.updated_at),
    };
  }

  async saveSiteSettings(settings: SiteSettingsRecord): Promise<void> {
    await this.pool.query(
      `
      INSERT INTO site_settings (id, payload, updated_by, updated_at)
      VALUES ($1,$2::jsonb,$3,$4)
      ON CONFLICT (id) DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at
      `,
      [settings.id, asJson(settings.payload), settings.updatedBy, settings.updatedAt],
    );
  }

  async syncServiceTokens(tokens: ServiceTokenRecord[]): Promise<void> {
    for (const token of tokens) {
      await this.pool.query(
        `
        INSERT INTO service_tokens (id, name, token_hash, scopes, active)
        VALUES ($1,$2,$3,$4::jsonb,TRUE)
        ON CONFLICT (name) DO UPDATE SET token_hash = EXCLUDED.token_hash, scopes = EXCLUDED.scopes, active = TRUE
        `,
        [createId("tok"), token.name, token.tokenHash, asJson(token.scopes)],
      );
    }
  }

  async getServiceTokenByHash(tokenHash: string): Promise<ServiceTokenRecord | undefined> {
    const result = await this.pool.query(
      "SELECT name, token_hash, scopes FROM service_tokens WHERE token_hash = $1 AND active = TRUE LIMIT 1",
      [tokenHash],
    );
    const row = result.rows[0];
    if (!row) return undefined;
    return {
      name: row.name,
      tokenHash: row.token_hash,
      scopes: row.scopes ?? [],
    };
  }

  async registerRequestNonce(nonceHash: string, expiresAt: string): Promise<boolean> {
    await this.pool.query("DELETE FROM request_nonces WHERE expires_at <= NOW()");
    const result = await this.pool.query(
      `
      INSERT INTO request_nonces (nonce_hash, expires_at)
      VALUES ($1, $2)
      ON CONFLICT (nonce_hash) DO NOTHING
      RETURNING nonce_hash
      `,
      [nonceHash, expiresAt],
    );
    return Boolean(result.rows[0]);
  }

  private mapStoreRow(row: DbRow): StoreRecord {
    return {
      id: String(row.id),
      placeId: row.place_id ? String(row.place_id) : undefined,
      name: String(row.name),
      normalizedName: String(row.normalized_name ?? row.normalizedName ?? row.name),
      slug: String(row.slug ?? row.id),
      city: row.city ? String(row.city) : undefined,
      cityAr: row.city_ar ? String(row.city_ar) : undefined,
      area: row.area ? String(row.area) : undefined,
      primaryCategory: row.primary_category ? String(row.primary_category) : undefined,
      suggestedCategory: row.suggested_category ? String(row.suggested_category) : undefined,
      address: row.address ? String(row.address) : undefined,
      phone: row.phone ? String(row.phone) : undefined,
      whatsapp: row.whatsapp ? String(row.whatsapp) : undefined,
      website: row.website ? String(row.website) : undefined,
      websiteType: row.website_type ? String(row.website_type) as StoreRecord["websiteType"] : undefined,
      googleMapsUrl: row.google_maps_url ? String(row.google_maps_url) : undefined,
      lat: typeof row.lat === "number" ? row.lat : row.lat ? Number(row.lat) : undefined,
      lng: typeof row.lng === "number" ? row.lng : row.lng ? Number(row.lng) : undefined,
      discoverySource: String(row.discovery_source ?? "city_seed") as StoreRecord["discoverySource"],
      sourceFile: row.source_file ? String(row.source_file) : undefined,
      highPriority: Boolean(row.high_priority),
      metadata: asUnknownRecord(row.metadata),
      status: String(row.status) as StoreRecord["status"],
      blockedReason: row.blocked_reason ? String(row.blocked_reason) : undefined,
      lastProbeAt: asOptionalIsoString(row.last_probe_at),
      lastSyncAt: asOptionalIsoString(row.last_sync_at),
      createdAt: asRequiredIsoString(row.created_at),
      updatedAt: asRequiredIsoString(row.updated_at),
    };
  }
}
