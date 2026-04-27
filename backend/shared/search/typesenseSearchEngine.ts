import Typesense from "typesense";
import type { CollectionCreateSchema } from "../../node_modules/typesense/lib/Typesense/Collections.js";
import type { SearchParams } from "../../node_modules/typesense/lib/Typesense/Types.js";
import { catalogConfig } from "../config.js";
import type { SearchDocument } from "../catalog/types.js";
import type { SearchQueryInput } from "../repositories/contracts.js";
import type { SearchEngine, SearchResult } from "./contracts.js";

const schema: CollectionCreateSchema = {
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
};

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
    const collection = this.client.collections<SearchDocument>(catalogConfig.typesense.collectionName);
    try {
      await collection.retrieve();
    } catch {
      await this.client.collections().create(schema);
    }
  }

  async replaceStoreDocuments(storeId: string, documents: SearchDocument[]): Promise<void> {
    await this.ensureReady();
    const collection = this.client.collections<SearchDocument>(catalogConfig.typesense.collectionName);
    try {
      await collection.documents().delete({
        filter_by: `storeId:=${storeId}`,
      });
    } catch {
      // Ignore initial delete failures when the store is not indexed yet.
    }
    if (documents.length === 0) return;
    await collection.documents().import(
      documents.map((document) => ({
        id: document.id,
        storeId: document.storeId,
        storeName: document.storeName,
        normalizedTitle: document.normalizedTitle,
        title: document.title,
        brand: document.brand,
        model: document.model,
        sku: document.sku,
        livePrice: document.livePrice,
        originalPrice: document.originalPrice,
        onSale: document.onSale,
        availability: document.availability,
        freshnessAt: document.freshnessAt,
        sourceUrl: document.sourceUrl,
        categoryPath: document.categoryPath,
        sellerName: document.sellerName,
      })),
      {
      action: "upsert",
      },
    );
  }

  async search(query: SearchQueryInput): Promise<SearchResult> {
    await this.ensureReady();
    const collection = this.client.collections<SearchDocument>(catalogConfig.typesense.collectionName);
    const filters: string[] = [];
    const hasQuery = Boolean(query.q?.trim());
    if (query.storeId) filters.push(`storeId:=${query.storeId}`);
    if (query.onSale != null) filters.push(`onSale:=${query.onSale}`);
    if (query.availability) filters.push(`availability:=${query.availability}`);
    if (query.minPrice != null) filters.push(`livePrice:>=${query.minPrice}`);
    if (query.maxPrice != null) filters.push(`livePrice:<=${query.maxPrice}`);

    const searchParams: SearchParams<SearchDocument> = {
      q: query.q || "*",
      query_by: "normalizedTitle,title,brand,model,sku,storeName,categoryPath",
      query_by_weights: "12,10,8,7,9,3,2",
      prefix: "true,true,true,true,false,false,false",
      prioritize_exact_match: true,
      prioritize_token_position: true,
      prioritize_num_matching_fields: true,
      text_match_type: "max_score",
      sort_by: hasQuery ? "_text_match:desc,onSale:desc,freshnessAt:desc" : "onSale:desc,freshnessAt:desc",
      per_page: query.limit ?? 20,
    };
    if (filters.length > 0) {
      searchParams.filter_by = filters.join(" && ");
    }

    const result = await collection.documents().search(searchParams);

    return {
      total: result.found ?? 0,
      hits: (result.hits ?? []).map((hit) => hit.document as unknown as SearchDocument),
    };
  }
}
