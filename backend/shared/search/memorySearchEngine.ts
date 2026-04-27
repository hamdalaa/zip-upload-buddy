import type { SearchDocument } from "../catalog/types.js";
import type { SearchQueryInput } from "../repositories/contracts.js";
import type { SearchEngine, SearchResult } from "./contracts.js";
import { compactText } from "../catalog/normalization.js";
import { scoreProductIntentMatch, scoreSearchTextMatch } from "./relevance.js";

export class MemorySearchEngine implements SearchEngine {
  private readonly documents = new Map<string, SearchDocument[]>();

  async ensureReady(): Promise<void> {}

  async replaceStoreDocuments(storeId: string, documents: SearchDocument[]): Promise<void> {
    this.documents.set(storeId, documents);
  }

  async search(query: SearchQueryInput): Promise<SearchResult> {
    const q = compactText(query.q ?? "");
    let docs = [...this.documents.values()].flat();

    if (query.storeId) docs = docs.filter((doc) => doc.storeId === query.storeId);
    if (query.onSale != null) docs = docs.filter((doc) => doc.onSale === query.onSale);
    if (query.availability) docs = docs.filter((doc) => doc.availability === query.availability);
    if (query.minPrice != null) docs = docs.filter((doc) => (doc.livePrice ?? Infinity) >= query.minPrice!);
    if (query.maxPrice != null) docs = docs.filter((doc) => (doc.livePrice ?? 0) <= query.maxPrice!);

    if (q) {
      docs = docs.filter((doc) => scoreDocument(doc, query.q ?? "") > 0);
      docs.sort(
        (a, b) =>
          scoreDocument(b, query.q ?? "") - scoreDocument(a, query.q ?? "") ||
          Number(b.onSale) - Number(a.onSale) ||
          b.freshnessAt.localeCompare(a.freshnessAt),
      );
    } else {
      docs.sort((a, b) => Number(b.onSale) - Number(a.onSale) || b.freshnessAt.localeCompare(a.freshnessAt));
    }
    const limit = query.limit ?? 20;

    return {
      total: docs.length,
      hits: docs.slice(0, limit),
    };
  }
}

function scoreDocument(doc: SearchDocument, query: string): number {
  const score = scoreSearchTextMatch(query, [
    { value: doc.title, weight: 5 },
    { value: doc.normalizedTitle, weight: 4 },
    { value: doc.brand, weight: 3 },
    { value: doc.model, weight: 2.5 },
    { value: doc.sku, weight: 4 },
    { value: doc.storeName, weight: 1 },
    { value: doc.categoryPath, weight: 1.2 },
  ]);

  return score + scoreProductIntentMatch(query, {
    title: doc.title,
    brand: doc.brand,
    model: doc.model,
    sku: doc.sku,
    categoryPath: doc.categoryPath,
    storeName: doc.storeName,
  }) + (doc.onSale ? 0.5 : 0);
}
