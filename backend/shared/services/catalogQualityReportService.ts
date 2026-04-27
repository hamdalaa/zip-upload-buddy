import fs from "node:fs/promises";
import path from "node:path";
import { catalogConfig } from "../config.js";
import { openCatalogSqlite } from "../db/sqliteSupport.js";

type DbRow = Record<string, unknown>;

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string" && value.trim()) return Number(value);
  return 0;
}

function count(sql: string): number {
  const db = openCatalogSqlite(catalogConfig.database.sqlitePath);
  return asNumber((db.prepare(sql).get() as DbRow | undefined)?.c);
}

export interface CatalogQualityReport {
  generatedAt: string;
  sqlitePath: string;
  counts: {
    stores: number;
    catalogProducts: number;
    searchDocuments: number;
    canonicalProducts: number;
  };
  quality: {
    productsMissingImage: number;
    productsMissingPrice: number;
    productsMissingBrand: number;
    productsMissingSearchDocument: number;
    searchDocumentsMissingCatalogProduct: number;
    productsUnsupportedCurrency: number;
    productsTinyIqdPrice: number;
    productsBlockedOfferDomain: number;
  };
  output?: {
    jsonPath?: string;
    markdownPath?: string;
  };
}

export function readCatalogQualityReport(): CatalogQualityReport {
  if (catalogConfig.database.driver !== "sqlite") {
    throw new Error("Catalog quality report only applies to the SQLite catalog driver.");
  }

  return {
    generatedAt: new Date().toISOString(),
    sqlitePath: catalogConfig.database.sqlitePath,
    counts: {
      stores: count("SELECT COUNT(*) AS c FROM stores"),
      catalogProducts: count("SELECT COUNT(*) AS c FROM catalog_products"),
      searchDocuments: count("SELECT COUNT(*) AS c FROM search_documents"),
      canonicalProducts: count("SELECT COUNT(DISTINCT canonical_product_id) AS c FROM search_documents WHERE canonical_product_id IS NOT NULL AND canonical_product_id != ''"),
    },
    quality: {
      productsMissingImage: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products
        WHERE (image_url IS NULL OR image_url = '')
          AND (primary_image_url IS NULL OR primary_image_url = '')
      `),
      productsMissingPrice: count("SELECT COUNT(*) AS c FROM catalog_products WHERE live_price IS NULL OR live_price <= 0"),
      productsMissingBrand: count("SELECT COUNT(*) AS c FROM catalog_products WHERE brand IS NULL OR brand = ''"),
      productsMissingSearchDocument: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products p
        LEFT JOIN search_documents sd ON sd.id = p.store_id || ':' || p.source_product_id
        WHERE sd.id IS NULL
      `),
      searchDocumentsMissingCatalogProduct: count(`
        SELECT COUNT(*) AS c
        FROM search_documents sd
        LEFT JOIN catalog_products p ON sd.id = p.store_id || ':' || p.source_product_id
        WHERE p.source_product_id IS NULL
      `),
      productsUnsupportedCurrency: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products
        WHERE currency IS NOT NULL
          AND currency != ''
          AND upper(currency) NOT IN ('IQD', 'USD')
      `),
      productsTinyIqdPrice: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products
        WHERE upper(COALESCE(currency, 'IQD')) = 'IQD'
          AND live_price IS NOT NULL
          AND live_price > 0
          AND live_price < 1000
      `),
      productsBlockedOfferDomain: count(`
        SELECT COUNT(*) AS c
        FROM catalog_products
        WHERE source_url LIKE '%almatajiralthalath.com%'
           OR source_url LIKE '%apple.com/%'
           OR source_url LIKE '%samsung.com/%'
           OR source_url LIKE '%lg.com/%'
           OR source_url LIKE '%hikvision.com/%'
      `),
    },
  };
}

export function renderCatalogQualityMarkdown(report: CatalogQualityReport): string {
  return [
    "# Catalog Quality Report",
    "",
    `Generated: ${report.generatedAt}`,
    `Database: ${report.sqlitePath}`,
    "",
    "## Counts",
    `- Stores: ${report.counts.stores}`,
    `- Catalog products: ${report.counts.catalogProducts}`,
    `- Search documents: ${report.counts.searchDocuments}`,
    `- Canonical products: ${report.counts.canonicalProducts}`,
    "",
    "## Quality",
    `- Products missing image: ${report.quality.productsMissingImage}`,
    `- Products missing price: ${report.quality.productsMissingPrice}`,
    `- Products missing brand: ${report.quality.productsMissingBrand}`,
    `- Catalog products missing from search index: ${report.quality.productsMissingSearchDocument}`,
    `- Search documents missing source product: ${report.quality.searchDocumentsMissingCatalogProduct}`,
    `- Products with unsupported currency: ${report.quality.productsUnsupportedCurrency}`,
    `- Products with tiny IQD prices: ${report.quality.productsTinyIqdPrice}`,
    `- Products on blocked public-offer domains: ${report.quality.productsBlockedOfferDomain}`,
    "",
  ].join("\n");
}

export async function writeCatalogQualityReport(label = "catalog-quality"): Promise<CatalogQualityReport> {
  const report = readCatalogQualityReport();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportsDir = path.resolve(path.dirname(catalogConfig.database.sqlitePath), "catalog-reports");
  const jsonPath = path.join(reportsDir, `${label}-${timestamp}.json`);
  const markdownPath = path.join(reportsDir, `${label}-${timestamp}.md`);
  await fs.mkdir(reportsDir, { recursive: true });
  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  await fs.writeFile(markdownPath, renderCatalogQualityMarkdown(report));
  return {
    ...report,
    output: {
      jsonPath,
      markdownPath,
    },
  };
}
