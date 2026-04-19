import fs from "node:fs/promises";
import path from "node:path";
import { catalogConfig } from "../config.js";
import { compactText, classifyWebsiteType, normalizeWebsiteUrl, slugify } from "../catalog/normalization.js";
import type { StoreSeed } from "../catalog/types.js";

interface RawCityIndexEntry {
  slug: string;
  city: string;
  cityAr: string;
  count: number;
}

interface RawCityStore {
  id: string;
  place_id?: string;
  name: string;
  city?: string;
  area?: string;
  category?: string;
  suggested_category?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  websiteType?: "official" | "social" | "missing";
  googleMapsUrl?: string;
  lat?: number;
  lng?: number;
}

export async function loadCitySeedStores(): Promise<StoreSeed[]> {
  const citiesDir = path.join(catalogConfig.repoRoot, "data", "cities");
  const rawIndex = await fs.readFile(path.join(citiesDir, "index.json"), "utf8");
  const cityIndex = JSON.parse(rawIndex) as RawCityIndexEntry[];
  const seeds: StoreSeed[] = [];

  for (const city of cityIndex) {
    const rawPayload = await fs.readFile(path.join(citiesDir, `${city.slug}.json`), "utf8");
    const parsed = JSON.parse(rawPayload) as { stores: RawCityStore[] };
    for (const store of parsed.stores ?? []) {
      const normalizedWebsite = normalizeWebsiteUrl(store.website);
      seeds.push({
        id: `city_${city.slug}_${store.place_id ?? store.id}`,
        placeId: store.place_id ?? store.id,
        name: store.name,
        normalizedName: compactText(store.name),
        slug: slugify(store.name),
        city: store.city ?? city.city,
        cityAr: city.cityAr,
        area: store.area,
        primaryCategory: store.category,
        suggestedCategory: store.suggested_category,
        address: store.address,
        phone: store.phone,
        whatsapp: store.whatsapp,
        website: normalizedWebsite || undefined,
        websiteType: classifyWebsiteType(normalizedWebsite || store.website),
        googleMapsUrl: store.googleMapsUrl,
        lat: store.lat,
        lng: store.lng,
        discoverySource: "city_seed",
        sourceFile: `${city.slug}.json`,
        metadata: {
          citySlug: city.slug,
          fromCitySeed: true,
        },
      });
    }
  }

  return seeds;
}
