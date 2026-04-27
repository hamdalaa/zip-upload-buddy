import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const SITE_URL = (process.env.SITE_URL || "https://hayeer.com").replace(/\/$/, "");
const API_BASE_URL = (process.env.SEO_API_BASE_URL || SITE_URL).replace(/\/$/, "");
const OUT_FILE = resolve(process.cwd(), process.env.SEO_SITEMAP_OUT || "public/sitemap.xml");
const MAX_PRODUCTS = Number(process.env.SEO_SITEMAP_MAX_PRODUCTS || 1500);
const ANSWER_DATA_PATHS = [
  "/answer-data/index.json",
  "/answer-data/hayr-overview.md",
  "/answer-data/iraq-electronics-search.md",
  "/answer-data/baghdad-electronics-markets.md",
  "/answer-data/product-price-comparison.md",
  "/answer-data/best-electronics-stores-iraq.md",
  "/answer-data/baghdad-phone-shops.md",
  "/answer-data/pc-parts-iraq.md",
  "/answer-data/elryan-products.md",
  "/answer-data/how-to-cite-hayr.md",
  "/answer-data/data-and-citation-policy.md",
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toUrl(path) {
  if (!path) return SITE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function validLastmod(value) {
  if (!value) return undefined;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return undefined;
  return new Date(time).toISOString();
}

async function fetchJson(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { accept: "application/json" },
  });
  if (!response.ok) throw new Error(`${path} returned ${response.status}`);
  return response.json();
}

function addUrl(map, path, options = {}) {
  const url = toUrl(path);
  if (!url.startsWith(SITE_URL)) return;
  const current = map.get(url);
  const next = {
    loc: url,
    lastmod: validLastmod(options.lastmod),
    changefreq: options.changefreq,
    priority: options.priority,
  };
  if (!current || Number(next.priority ?? 0) > Number(current.priority ?? 0)) {
    map.set(url, next);
  }
}

async function main() {
  const urls = new Map();
  const now = new Date().toISOString();

  [
    ["/", 1, "daily"],
    ["/search", 0.9, "daily"],
    ["/brands", 0.8, "weekly"],
    ["/iraq", 0.8, "weekly"],
    ["/street", 0.7, "weekly"],
    ["/sinaa", 0.8, "weekly"],
    ["/rubaie", 0.8, "weekly"],
    ["/answers", 0.7, "monthly"],
    ["/about", 0.5, "monthly"],
    ["/llms.txt", 0.5, "monthly"],
    ["/llms-full.txt", 0.5, "monthly"],
    ["/llms-ctx.txt", 0.5, "monthly"],
    ["/llms-ctx-full.txt", 0.5, "monthly"],
    ...ANSWER_DATA_PATHS.map((path) => [path, 0.5, "monthly"]),
  ].forEach(([path, priority, changefreq]) => addUrl(urls, path, { priority, changefreq, lastmod: now }));

  try {
    const cities = await fetchJson("/public/cities");
    cities.forEach((city) => addUrl(urls, `/city/${encodeURIComponent(city.slug)}`, { priority: 0.75, changefreq: "weekly" }));
  } catch (error) {
    console.warn(`[seo:sitemap] cities skipped: ${error.message}`);
  }

  try {
    const bootstrap = await fetchJson("/public/bootstrap");
    bootstrap.brands?.forEach((brand) => {
      if (brand.slug) addUrl(urls, `/brand/${encodeURIComponent(brand.slug)}`, { priority: 0.72, changefreq: "weekly", lastmod: brand.updatedAt });
    });
    bootstrap.stores?.forEach((store) => {
      if (store.id) addUrl(urls, `/shop-view/${encodeURIComponent(store.id)}`, { priority: store.featured ? 0.78 : 0.62, changefreq: "weekly", lastmod: store.updatedAt });
      if (store.citySlug && (store.seedKey || store.id)) {
        addUrl(urls, `/city/${encodeURIComponent(store.citySlug)}/shop/${encodeURIComponent(store.seedKey || store.id)}`, {
          priority: store.featured ? 0.78 : 0.62,
          changefreq: "weekly",
          lastmod: store.updatedAt,
        });
      }
    });
  } catch (error) {
    console.warn(`[seo:sitemap] bootstrap skipped: ${error.message}`);
    try {
      const lite = await fetchJson("/public/bootstrap-lite");
      lite.brands?.forEach((brand) => {
        if (brand.slug) addUrl(urls, `/brand/${encodeURIComponent(brand.slug)}`, { priority: 0.72, changefreq: "weekly", lastmod: brand.updatedAt });
      });
      [...(lite.featuredShops ?? []), ...(lite.topRatedShops ?? [])].forEach((store) => {
        if (store.id) addUrl(urls, `/shop-view/${encodeURIComponent(store.id)}`, { priority: 0.7, changefreq: "weekly", lastmod: store.updatedAt });
      });
    } catch (liteError) {
      console.warn(`[seo:sitemap] bootstrap-lite skipped: ${liteError.message}`);
    }
  }

  let offset = 0;
  const limit = 500;
  while (offset < MAX_PRODUCTS) {
    try {
      const page = await fetchJson(`/public/catalog-products?limit=${limit}&offset=${offset}`);
      const items = page.items ?? [];
      items.forEach((product) => {
        const id = product.canonicalProductId || product.id;
        if (!id) return;
        addUrl(urls, `/product/${encodeURIComponent(id)}`, {
          priority: 0.68,
          changefreq: "daily",
          lastmod: product.crawledAt,
        });
      });
      if (items.length < limit) break;
      offset += limit;
    } catch (error) {
      console.warn(`[seo:sitemap] products stopped at offset ${offset}: ${error.message}`);
      break;
    }
  }

  const body = [...urls.values()]
    .sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0) || a.loc.localeCompare(b.loc))
    .map((entry) => [
      "  <url>",
      `    <loc>${escapeXml(entry.loc)}</loc>`,
      entry.lastmod ? `    <lastmod>${escapeXml(entry.lastmod)}</lastmod>` : "",
      entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : "",
      entry.priority ? `    <priority>${entry.priority.toFixed(1)}</priority>` : "",
      "  </url>",
    ].filter(Boolean).join("\n"))
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, xml, "utf8");
  console.log(`[seo:sitemap] wrote ${urls.size} URLs to ${OUT_FILE}`);
}

main().catch((error) => {
  console.error(`[seo:sitemap] failed: ${error.stack || error.message}`);
  process.exitCode = 1;
});
