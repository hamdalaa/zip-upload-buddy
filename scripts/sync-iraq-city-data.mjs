#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");
const CITIES_DIR = path.join(ROOT_DIR, "src/data/cities");
const DEFAULT_INPUT = "/Volumes/SSD/tieh/output/iraq-electronics-full-enriched.json";

function parseArgs(argv) {
  const get = (flag, fallback = "") => (argv.includes(flag) ? argv[argv.indexOf(flag) + 1] || fallback : fallback);
  return {
    input: path.resolve(get("--input", DEFAULT_INPUT)),
  };
}

function toWhatsapp(phone = "") {
  const digits = `${phone}`.replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.startsWith("964")) return `https://wa.me/${digits}`;
  if (digits.startsWith("0")) return `https://wa.me/964${digits.slice(1)}`;
  return `https://wa.me/${digits}`;
}

function toWebsiteType(url = "") {
  if (!url) return "missing";
  if (/facebook|instagram|tiktok|x\.com|twitter|snapchat|linktr\.ee/i.test(url)) return "social";
  return "official";
}

function toCityShop(store, lastUpdatedAt) {
  const gallery = store.gallery?.photos ?? [];
  return {
    id: store.place_id,
    place_id: store.place_id,
    name: store.store_name,
    city: store.city,
    area: store.area || "",
    category: store.category || store.suggested_category || "",
    suggested_category: store.suggested_category || "",
    address: store.address || "",
    phone: store.phone || "",
    whatsapp: store.actions?.whatsapp_url || toWhatsapp(store.phone),
    website: store.website || "",
    websiteType: store.website_type || toWebsiteType(store.website),
    googleMapsUrl: store.google_maps_url || "",
    lat: store.latitude ?? null,
    lng: store.longitude ?? null,
    rating: typeof store.rating === "number" ? store.rating : null,
    reviewCount: store.user_rating_count ?? 0,
    imageUrl: store.main_image_url || "",
    gallery,
    openNow: store.open_now ?? null,
    businessStatus: store.business_status || "",
    workingHours: store.working_hours || [],
    trustBadges: store.trust_badges || [],
    primaryType: store.primary_type || "",
    editorialSummary: store.editorial_summary || "",
    reviewSummary: store.review_summary || "",
    reviewsSample: (store.reviews_sample || []).map((review) => ({
      rating: review.rating ?? null,
      relativePublishTime: review.relative_publish_time || "",
      publishTime: review.publish_time || "",
      text: review.text || "",
      authorName: review.author_name || "",
      reviewGoogleMapsUrl: review.review_google_maps_url || "",
    })),
    quickSignals: store.quick_signals || {
      has_website: Boolean(store.website),
      website_type: store.website_type || toWebsiteType(store.website),
      has_google_maps: Boolean(store.google_maps_url),
      has_rating: typeof store.rating === "number",
      has_reviews: (store.reviews_sample || []).length > 0,
      has_photos: Boolean(store.main_image_url) || gallery.length > 0,
      open_now: store.open_now ?? null,
      business_status: store.business_status || "",
    },
    lastUpdatedAt,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const raw = JSON.parse(await fs.readFile(options.input, "utf8"));
  const index = JSON.parse(await fs.readFile(path.join(CITIES_DIR, "index.json"), "utf8"));
  const cityMetaByName = new Map(index.map((entry) => [entry.city.toLowerCase(), entry]));
  const storesByCity = new Map();

  for (const store of raw.stores || []) {
    const key = `${store.city || ""}`.toLowerCase();
    if (!key || !cityMetaByName.has(key)) continue;
    const bucket = storesByCity.get(key) || [];
    bucket.push(toCityShop(store, raw.meta?.generated_at || new Date().toISOString()));
    storesByCity.set(key, bucket);
  }

  for (const entry of index) {
    const key = entry.city.toLowerCase();
    const stores = (storesByCity.get(key) || []).sort((a, b) => a.name.localeCompare(b.name, "ar"));
    const payload = {
      city: entry.city,
      cityAr: entry.cityAr,
      slug: entry.slug,
      count: stores.length,
      stores,
    };
    await fs.writeFile(path.join(CITIES_DIR, `${entry.slug}.json`), JSON.stringify(payload, null, 2));
    entry.count = stores.length;
    console.log(`Synced ${entry.slug}: ${stores.length}`);
  }

  await fs.writeFile(path.join(CITIES_DIR, "index.json"), JSON.stringify(index, null, 2));
  console.log(`Updated ${path.join(CITIES_DIR, "index.json")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
