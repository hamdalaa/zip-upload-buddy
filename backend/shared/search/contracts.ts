import type { SearchDocument } from "../catalog/types.js";
import type { SearchQueryInput } from "../repositories/contracts.js";

export interface SearchResult {
  total: number;
  hits: SearchDocument[];
}

export interface SearchEngine {
  ensureReady(): Promise<void>;
  replaceStoreDocuments(storeId: string, documents: SearchDocument[]): Promise<void>;
  search(query: SearchQueryInput): Promise<SearchResult>;
}
