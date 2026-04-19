import type { SearchDocument } from "../catalog/types.js";
import type { SearchQueryInput } from "../repositories/contracts.js";
import type { SearchEngine, SearchResult } from "./contracts.js";
import { compactText, normalizeText } from "../catalog/normalization.js";

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
      const queryTokens = normalizeText(query.q ?? "")
        .split(/[\s/_\-(),]+/)
        .filter((token) => token.length >= 2)
        .map((token) => compactText(token));

      docs = docs.filter((doc) => scoreDocument(doc, q, queryTokens) > 0);
      docs.sort((a, b) => scoreDocument(b, q, queryTokens) - scoreDocument(a, q, queryTokens));
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

function scoreDocument(doc: SearchDocument, q: string, queryTokens: string[]): number {
  const haystacks = [
    doc.normalizedTitle,
    doc.title,
    doc.brand ?? "",
    doc.model ?? "",
    doc.sku ?? "",
    doc.storeName,
    doc.categoryPath,
  ]
    .map((value) => compactText(String(value)))
    .filter(Boolean);

  let score = 0;
  for (const haystack of haystacks) {
    if (haystack.includes(q)) score += 5;
    for (const token of queryTokens) {
      if (!token) continue;
      if (haystack.includes(token)) score += 2;
      const haystackTokens = haystack.split(/[\s/_\-(),]+/).filter(Boolean);
      if (haystackTokens.some((candidate) => withinEditDistance(candidate, token, 1))) {
        score += 1;
      }
    }
  }
  if (doc.onSale) score += 0.5;
  return score;
}

function withinEditDistance(a: string, b: string, maxDistance: number): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > maxDistance) return false;
  const prev = Array.from({ length: b.length + 1 }, (_, index) => index);
  const curr = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    let rowMin = curr[0];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min((curr[j - 1] ?? 0) + 1, (prev[j] ?? 0) + 1, (prev[j - 1] ?? 0) + cost);
      rowMin = Math.min(rowMin, curr[j] ?? rowMin);
    }
    if (rowMin > maxDistance) return false;
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return (prev[b.length] ?? Infinity) <= maxDistance;
}
