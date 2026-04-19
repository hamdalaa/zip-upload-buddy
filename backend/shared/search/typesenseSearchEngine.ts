import Typesense from "typesense";
import { catalogConfig } from "../config.js";
import type { SearchDocument } from "../catalog/types.js";
import type { SearchQueryInput } from "../repositories/contracts.js";
import type { SearchEngine, SearchResult } from "./contracts.js";

const schema = {
  name: catalogConfig.typesense.collectionName,
  fields: [
    { name: "id", type: "string" },
    { name: "storeId", type: "string", facet: true },
    { name: "storeName", type: "string", facet: true },
    { name: "normalizedTitle", type: "string" },
    { name: "title", type: "string" },
    { name: "brand", type: "string", optional: true, facet: true },
    { name: "model", type: "string", optional: true },
    { name: "sku", type: "string", optional: true },
    { name: "livePrice", type: "float", optional: true },
    { name: "originalPrice", type: "float", optional: true },
    { name: "onSale", type: "bool", facet: true },
    { name: "availability", type: "string", facet: true },
    { name: "freshnessAt", type: "string" },
    { name: "sourceUrl", type: "string" },
    { name: "categoryPath", type: "string", facet: true },
    { name: "sellerName", type: "string", optional: true, facet: true },
  ],
} as const;

export class TypesenseSearchEngine implements SearchEngine {
  private readonly client = new Typesense.Client({
    nodes: [
      {
        host: new URL(catalogConfig.typesense.url).hostname,
        port: Number(new URL(catalogConfig.typesense.url).port || 80),
        protocol: new URL(catalogConfig.typesense.url).protocol.replace(":", "") as "http" | "https",
      },
    ],
    apiKey: catalogConfig.typesense.apiKey,
    connectionTimeoutSeconds: 5,
  });

  async ensureReady(): Promise<void> {
    try {
      await this.client.collections(catalogConfig.typesense.collectionName).retrieve();
    } catch {
      await this.client.collections().create(schema as any);
    }
  }

  async replaceStoreDocuments(storeId: string, documents: SearchDocument[]): Promise<void> {
    await this.ensureReady();
    try {
      await this.client.collections(catalogConfig.typesense.collectionName).documents().delete({
        filter_by: `storeId:=${storeId}`,
      });
    } catch {
      // Ignore initial delete failures when the store is not indexed yet.
    }
    if (documents.length === 0) return;
    await this.client.collections(catalogConfig.typesense.collectionName).documents().import(documents, {
      action: "upsert",
    });
  }

  async search(query: SearchQueryInput): Promise<SearchResult> {
    await this.ensureReady();
    const filters: string[] = [];
    if (query.storeId) filters.push(`storeId:=${query.storeId}`);
    if (query.onSale != null) filters.push(`onSale:=${query.onSale}`);
    if (query.availability) filters.push(`availability:=${query.availability}`);
    if (query.minPrice != null) filters.push(`livePrice:>=${query.minPrice}`);
    if (query.maxPrice != null) filters.push(`livePrice:<=${query.maxPrice}`);

    const searchParams: any = {
      q: query.q || "*",
      query_by: "normalizedTitle,title,brand,model,sku,storeName,categoryPath",
      sort_by: "onSale:desc,freshnessAt:desc",
      per_page: query.limit ?? 20,
    };
    if (filters.length > 0) {
      searchParams.filter_by = filters.join(" && ");
    }

    const result = await this.client.collections(catalogConfig.typesense.collectionName).documents().search(searchParams);

    return {
      total: result.found ?? 0,
      hits: (result.hits ?? []).map((hit) => hit.document as unknown as SearchDocument),
    };
  }
}
