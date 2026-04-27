import { DatabaseSync } from "node:sqlite";
import { normalizeText } from "../catalog/normalization.js";
import type { SearchDocument } from "../catalog/types.js";
import { buildCanonicalProductId, buildLegacyCanonicalProductId } from "../catalog/searchDocuments.js";
import type { SearchQueryInput } from "../repositories/contracts.js";
import {
  ensureCatalogSqliteSchema,
  ensureSearchDocumentsFtsIndex,
  openCatalogSqlite,
} from "../db/sqliteSupport.js";
import type { SearchEngine, SearchResult } from "./contracts.js";
import { scoreProductIntentMatch, scoreSearchTextMatch } from "./relevance.js";

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

function toSqliteParams(...values: unknown[]): SqliteParam[] {
  return values.map((value) => {
    if (value == null) return null;
    if (value instanceof Uint8Array) return value;
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
    return String(value);
  });
}

export class SqliteSearchEngine implements SearchEngine {
  private readonly db: DatabaseSync;
  private ready = false;

  constructor(databasePath: string) {
    this.db = openCatalogSqlite(databasePath);
  }

  async ensureReady(): Promise<void> {
    if (this.ready) return;
    ensureCatalogSqliteSchema(this.db);
    ensureSearchDocumentsFtsIndex(this.db);
    this.ready = true;
  }

  async replaceStoreDocuments(storeId: string, documents: SearchDocument[]): Promise<void> {
    await this.ensureReady();
    this.db.exec("BEGIN IMMEDIATE");
    try {
      this.db.prepare("DELETE FROM search_documents WHERE store_id = ?").run(storeId);
      this.db.prepare("DELETE FROM search_documents_fts WHERE store_id = ?").run(storeId);
      if (documents.length > 0) {
        const insert = this.db.prepare(
          `
          INSERT INTO search_documents (
            id, store_id, store_name, normalized_title, title, brand, model, sku, live_price, original_price,
            on_sale, availability, freshness_at, source_url, category_path, image_url, currency, offer_label, seller_name,
            canonical_product_id, legacy_canonical_product_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        );
        const insertFts = this.db.prepare(
          `
          INSERT INTO search_documents_fts (
            id, store_id, normalized_title, title, brand, model, sku, store_name, category_path
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
        );

        for (const document of documents) {
          insert.run(...toSqliteParams(
            document.id,
            document.storeId,
            document.storeName,
            document.normalizedTitle,
            document.title,
            document.brand,
            document.model,
            document.sku,
            document.livePrice,
            document.originalPrice,
            Number(document.onSale),
            document.availability,
            document.freshnessAt,
            document.sourceUrl,
            document.categoryPath,
            document.imageUrl,
            document.currency,
            document.offerLabel,
            document.sellerName,
            buildCanonicalProductId(document),
            buildLegacyCanonicalProductId(document),
          ));
          insertFts.run(...toSqliteParams(
            document.id,
            document.storeId,
            document.normalizedTitle,
            document.title,
            document.brand ?? "",
            document.model ?? "",
            document.sku ?? "",
            document.storeName,
            document.categoryPath,
          ));
        }
      }
      this.db.exec("COMMIT");
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  async search(query: SearchQueryInput): Promise<SearchResult> {
    await this.ensureReady();
    const limit = Math.max(1, Math.min(query.limit ?? 20, 500));
    const { whereSql, params } = this.buildFilters(query);

    if (!query.q?.trim()) {
      const totalRow = this.db
        .prepare(`SELECT COUNT(*) AS count FROM search_documents ${whereSql}`)
        .get(...params) as DbRow | undefined;
      const rows = this.db
        .prepare(
          `
          SELECT *
          FROM search_documents
          ${whereSql}
          ORDER BY on_sale DESC, freshness_at DESC
          LIMIT ?
          `,
        )
        .all(...params, limit);

      return {
        total: asNumber(totalRow?.count) ?? 0,
        hits: rows.map((row) => this.mapRow(row as DbRow)),
      };
    }

    const candidateLimit = Math.max(limit * 6, 160);
    const ftsQueries = buildSearchCandidateFtsQueries(query.q);
    const filtered = this.buildFilters(query, "sd");
    if (ftsQueries.length === 0) {
      return {
        total: 0,
        hits: [],
      };
    }

    const searchStatement = this.db.prepare(`
      SELECT sd.*
      FROM search_documents_fts
      JOIN search_documents sd ON sd.id = search_documents_fts.id
      WHERE search_documents_fts MATCH ?${filtered.whereSql ? ` AND ${filtered.whereSql.replace(/^WHERE\s+/i, "")}` : ""}
      ORDER BY bm25(search_documents_fts, 4.5, 5.0, 3.0, 2.5, 4.0, 1.0, 1.2), sd.on_sale DESC, sd.freshness_at DESC
      LIMIT ?
    `);
    const rowsById = new Map<string, DbRow>();

    for (const [index, ftsQuery] of ftsQueries.entries()) {
      const queryLimit = index === 0 ? candidateLimit : Math.max(limit * 3, 80);
      const rows = searchStatement.all(ftsQuery, ...filtered.params, queryLimit) as DbRow[];
      for (const row of rows) {
        const id = String(row.id ?? "");
        if (id && !rowsById.has(id)) rowsById.set(id, row);
      }
      if (index === 0 && rowsById.size > 0) break;
    }

    const scored = [...rowsById.values()]
      .map((row) => this.mapRow(row as DbRow))
      .map((document) => ({
        document,
        score: scoreDocument(document, query.q ?? ""),
      }))
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          Number(b.document.onSale) - Number(a.document.onSale) ||
          b.document.freshnessAt.localeCompare(a.document.freshnessAt),
      );

    return {
      total: scored.length,
      hits: scored.slice(0, limit).map((entry) => entry.document),
    };
  }

  private buildFilters(
    query: SearchQueryInput,
    tableAlias?: string,
  ): { whereSql: string; params: Array<string | number> } {
    const filters: string[] = [];
    const params: Array<string | number> = [];
    const column = (name: string) => (tableAlias ? `${tableAlias}.${name}` : name);

    if (query.storeId) {
      filters.push(`${column("store_id")} = ?`);
      params.push(query.storeId);
    }
    if (query.onSale != null) {
      filters.push(`${column("on_sale")} = ?`);
      params.push(Number(query.onSale));
    }
    if (query.availability) {
      filters.push(`${column("availability")} = ?`);
      params.push(query.availability);
    }
    if (query.minPrice != null) {
      filters.push(`COALESCE(${column("live_price")}, 1000000000000) >= ?`);
      params.push(query.minPrice);
    }
    if (query.maxPrice != null) {
      filters.push(`COALESCE(${column("live_price")}, 0) <= ?`);
      params.push(query.maxPrice);
    }

    return {
      whereSql: filters.length > 0 ? `WHERE ${filters.join(" AND ")}` : "",
      params,
    };
  }

  private mapRow(row: DbRow): SearchDocument {
    return {
      id: String(row.id),
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
      categoryPath: String(row.category_path),
      imageUrl: asOptionalString(row.image_url),
      currency: asOptionalString(row.currency),
      offerLabel: asOptionalString(row.offer_label),
      sellerName: asOptionalString(row.seller_name),
    };
  }
}

function scoreDocument(document: SearchDocument, query: string): number {
  const score = scoreSearchTextMatch(query, [
    { value: document.title, weight: 5 },
    { value: document.normalizedTitle, weight: 4 },
    { value: document.brand, weight: 3 },
    { value: document.model, weight: 2.5 },
    { value: document.sku, weight: 4 },
    { value: document.storeName, weight: 1 },
    { value: document.categoryPath, weight: 1.2 },
  ]);

  return score + scoreProductIntentMatch(query, {
    title: document.title,
    brand: document.brand,
    model: document.model,
    sku: document.sku,
    categoryPath: document.categoryPath,
    storeName: document.storeName,
  }) + (document.onSale ? 0.5 : 0);
}

const FTS_TOKEN_ALIASES: Record<string, string> = {
  readmi: "redmi",
  "ريدمي": "redmi",
  "ردمي": "redmi",
};

function buildSearchCandidateFtsQueries(query?: string): string[] {
  if (!query?.trim()) return [];

  const tokens = [...new Set(
    normalizeText(query)
      .match(/[\p{L}\p{N}]+/gu)
      ?.map((token) => FTS_TOKEN_ALIASES[token.trim()] ?? token.trim())
      .filter((token) => token.length >= 2 || /\d/.test(token)) ?? [],
  )];

  if (tokens.length === 0) return [];

  const escapedTokens = tokens.map(formatFtsToken);
  const queries = [escapedTokens.join(" ")];
  if (escapedTokens.length > 1) {
    queries.push(escapedTokens.join(" OR "));
  }
  return [...new Set(queries)];
}

function formatFtsToken(token: string): string {
  return `"${token.replace(/"/g, "\"\"")}"${token.length >= 2 ? "*" : ""}`;
}
