import fs from "node:fs";
import path from "node:path";

interface SearchHit<T> {
  _source?: T;
}

interface SearchResponse<T> {
  hits?: {
    total?: number;
    hits?: Array<SearchHit<T>>;
  };
}

interface ElryanCategory {
  id: number;
  name?: string;
  parent_id?: number;
  level?: number;
  url_key?: string;
  url_path?: string;
  path?: string;
  children_count?: number;
  product_count?: number;
  is_active?: boolean;
}

interface ElryanProduct {
  id: number;
  name?: string;
  sku?: string;
  url_key?: string;
  url_path?: string;
  category_ids?: number[];
  [key: string]: unknown;
}

const SITE_URL = "https://www.elryan.com";
const STORE_CODE = "ar";
const PAGE_SIZE = 200;
const CATEGORY_ROOT_ID = 2;
const SPECIAL_OFFER_CATEGORY_ID = 64;
const TOP_LEVEL_CATEGORY_SIZE = 200;
const CATEGORY_INDEX = `vue_storefront_magento_${STORE_CODE}`;

function outDir() {
  return path.resolve(
    ".catalog-output",
    `elryan-api-full-${new Date().toISOString().slice(0, 10)}`,
  );
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          "content-type": "application/json",
          "user-agent": "Mozilla/5.0",
          accept: "application/json,text/plain,*/*",
          ...(init?.headers ?? {}),
        },
        signal: AbortSignal.timeout(30_000),
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }
  throw lastError ?? new Error(`Failed to fetch ${url}`);
}

async function fetchAllCategories(): Promise<ElryanCategory[]> {
  const url =
    `${SITE_URL}/api/catalog/${CATEGORY_INDEX}/category/_search` +
    "?_source_include=id,name,parent_id,level,url_key,url_path,path,children_count,product_count,is_active" +
    "&from=0&size=4000&sort=position:asc";

  const payload = {
    query: {
      bool: {
        filter: {
          terms: {
            is_active: [true],
          },
        },
      },
    },
  };

  const response = await fetchJson<SearchResponse<ElryanCategory>>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return (response.hits?.hits ?? [])
    .map((hit) => hit._source)
    .filter((category): category is ElryanCategory => Boolean(category && typeof category.id === "number"));
}

function topLevelCategories(categories: ElryanCategory[]) {
  return categories
    .filter((category) => category.parent_id === CATEGORY_ROOT_ID)
    .filter((category) => category.id !== SPECIAL_OFFER_CATEGORY_ID)
    .sort((a, b) => (b.product_count ?? 0) - (a.product_count ?? 0));
}

async function fetchCategoryProducts(categoryId: number, offset: number): Promise<SearchResponse<ElryanProduct>> {
  const url =
    `${SITE_URL}/api/catalog/${CATEGORY_INDEX}/product/_search` +
    `?from=${offset}&size=${PAGE_SIZE}&sort=id:asc`;

  const payload = {
    query: {
      bool: {
        filter: {
          bool: {
            must: [
              { terms: { visibility: [2, 3, 4] } },
              { terms: { status: [0, 1] } },
              { terms: { category_ids: [categoryId] } },
            ],
          },
        },
      },
    },
  };

  return fetchJson<SearchResponse<ElryanProduct>>(url, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

async function main() {
  const generatedAt = new Date().toISOString();
  const targetDir = outDir();
  await fs.promises.mkdir(targetDir, { recursive: true });

  const categories = await fetchAllCategories();
  const roots = topLevelCategories(categories);

  const productIds = new Set<number>();
  const categoryCoverage = new Map<number, { pages: number; fetched: number; expected: number }>();
  const productStream = fs.createWriteStream(path.join(targetDir, "products.ndjson"), {
    encoding: "utf8",
  });

  let duplicateProducts = 0;

  for (const category of roots) {
    let offset = 0;
    let pages = 0;
    let fetched = 0;
    let expected = 0;

    while (true) {
      const response = await fetchCategoryProducts(category.id, offset);
      const total = Number(response.hits?.total ?? 0);
      const hits = (response.hits?.hits ?? [])
        .map((hit) => hit._source)
        .filter((product): product is ElryanProduct => Boolean(product && typeof product.id === "number"));

      if (pages === 0) expected = total;
      if (hits.length === 0) break;

      pages += 1;
      fetched += hits.length;

      for (const product of hits) {
        if (productIds.has(product.id)) {
          duplicateProducts += 1;
          continue;
        }
        productIds.add(product.id);
        productStream.write(`${JSON.stringify(product)}\n`);
      }

      offset += hits.length;
      if (offset >= total) break;
    }

    categoryCoverage.set(category.id, {
      pages,
      fetched,
      expected,
    });
  }

  await new Promise<void>((resolve, reject) => {
    productStream.end(() => resolve());
    productStream.on("error", reject);
  });

  const topLevel = roots.map((category) => ({
    ...category,
    coverage: categoryCoverage.get(category.id) ?? {
      pages: 0,
      fetched: 0,
      expected: category.product_count ?? 0,
    },
  }));

  const summary = {
    generatedAt,
    site: `${SITE_URL}/${STORE_CODE}/`,
    source: `${SITE_URL}/api/catalog/${CATEGORY_INDEX}`,
    totalCategories: categories.length,
    topLevelCategories: roots.length,
    uniqueProducts: productIds.size,
    duplicateProductsSkipped: duplicateProducts,
  };

  await Promise.all([
    fs.promises.writeFile(path.join(targetDir, "summary.json"), JSON.stringify(summary, null, 2)),
    fs.promises.writeFile(path.join(targetDir, "categories.json"), JSON.stringify(categories, null, 2)),
    fs.promises.writeFile(path.join(targetDir, "top-level-categories.json"), JSON.stringify(topLevel, null, 2)),
  ]);

  console.log(
    JSON.stringify(
      {
        outDir: targetDir,
        summary,
      },
      null,
      2,
    ),
  );
}

await main();
