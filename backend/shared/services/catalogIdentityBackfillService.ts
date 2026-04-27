import { buildCanonicalProductId, buildLegacyCanonicalProductId } from "../catalog/searchDocuments.js";
import { catalogConfig } from "../config.js";
import { ensureCatalogSqliteSchema, openCatalogSqlite } from "../db/sqliteSupport.js";

type SearchDocumentIdentityRow = {
  id: string;
  normalized_title: string;
  title: string;
  brand?: string | null;
  model?: string | null;
  sku?: string | null;
  category_path?: string | null;
  canonical_product_id?: string | null;
  legacy_canonical_product_id?: string | null;
};

export interface CatalogIdentityBackfillResult {
  sqlitePath: string;
  updated: number;
  changed: number;
  total: number;
  missing: number;
}

export function backfillCanonicalProductIds(): CatalogIdentityBackfillResult {
  if (catalogConfig.database.driver !== "sqlite") {
    throw new Error("Canonical product ID backfill only applies to the SQLite catalog driver.");
  }

  const db = openCatalogSqlite(catalogConfig.database.sqlitePath);
  ensureCatalogSqliteSchema(db);

  const selectDocuments = db.prepare(`
    SELECT
      id,
      normalized_title,
      title,
      brand,
      model,
      sku,
      category_path,
      canonical_product_id,
      legacy_canonical_product_id
    FROM search_documents
  `);
  const updateCanonical = db.prepare(`
    UPDATE search_documents
    SET canonical_product_id = ?,
        legacy_canonical_product_id = ?
    WHERE id = ?
  `);

  let updated = 0;
  let changed = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    for (const row of selectDocuments.iterate() as Iterable<SearchDocumentIdentityRow>) {
      const canonicalProductId = buildCanonicalProductId({
        normalizedTitle: row.normalized_title,
        title: row.title,
        brand: row.brand ?? undefined,
        model: row.model ?? undefined,
        sku: row.sku ?? undefined,
        categoryPath: row.category_path ?? undefined,
      });
      const titleLegacyCanonicalProductId = buildLegacyCanonicalProductId({
        normalizedTitle: row.normalized_title,
        title: row.title,
        brand: row.brand ?? undefined,
        model: row.model ?? undefined,
      });
      const legacyCanonicalProductId =
        row.canonical_product_id && row.canonical_product_id !== canonicalProductId
          ? row.canonical_product_id
          : titleLegacyCanonicalProductId;
      if (
        row.canonical_product_id !== canonicalProductId ||
        row.legacy_canonical_product_id !== legacyCanonicalProductId
      ) {
        changed += 1;
      }
      updateCanonical.run(canonicalProductId, legacyCanonicalProductId, row.id);
      updated += 1;
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  const totalRow = db.prepare("SELECT COUNT(*) AS count FROM search_documents").get() as { count?: number | bigint } | undefined;
  const missingRow = db.prepare(`
    SELECT COUNT(*) AS count
    FROM search_documents
    WHERE canonical_product_id IS NULL OR canonical_product_id = ''
  `).get() as { count?: number | bigint } | undefined;

  return {
    sqlitePath: catalogConfig.database.sqlitePath,
    updated,
    changed,
    total: Number(totalRow?.count ?? 0),
    missing: Number(missingRow?.count ?? 0),
  };
}
