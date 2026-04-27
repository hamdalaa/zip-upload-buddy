import { createCatalogContext } from "../shared/bootstrap.js";

process.env.CATALOG_SKIP_SCRAPED_IMPORT ??= "true";
process.env.CATALOG_SKIP_STARTUP_REINDEX ??= "true";

const context = await createCatalogContext();
const stores = await context.repository.listStores();
const documents = await context.repository.listSearchDocuments();
const grouped = new Map<string, typeof documents>();

for (const document of documents) {
  const current = grouped.get(document.storeId) ?? [];
  current.push(document);
  grouped.set(document.storeId, current);
}

for (const store of stores) {
  await context.searchEngine.replaceStoreDocuments(store.id, grouped.get(store.id) ?? []);
}

console.log(
  JSON.stringify(
    {
      stores: stores.length,
      documents: documents.length,
      rebuiltAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
