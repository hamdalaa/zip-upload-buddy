// City data layer — lazy-loaded per city to keep initial bundle small.
// Each city JSON lives at src/data/cities/{slug}.json and is imported on demand.

import cityIndex from "@/data/cities/index.json";

export interface CityShop {
  id: string;
  place_id?: string;
  name: string;
  city: string;
  area?: string;
  category?: string;
  suggested_category?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  website?: string;
  websiteType?: string;
  googleMapsUrl?: string;
  lat?: number | null;
  lng?: number | null;
  rating?: number | null;
  reviewCount?: number;
  imageUrl?: string;
  gallery?: string[];
  openNow?: boolean | null;
  businessStatus?: string;
  workingHours?: string[];
  trustBadges?: string[];
  primaryType?: string;
  editorialSummary?: string;
  reviewSummary?: string;
  reviewsSample?: Array<{
    rating?: number | null;
    relativePublishTime?: string;
    publishTime?: string;
    text?: string;
    authorName?: string;
    reviewGoogleMapsUrl?: string;
  }>;
  quickSignals?: {
    has_website?: boolean;
    website_type?: string;
    has_google_maps?: boolean;
    has_rating?: boolean;
    has_reviews?: boolean;
    has_photos?: boolean;
    open_now?: boolean | null;
    business_status?: string;
  };
  lastUpdatedAt?: string;
}

export interface CityFile {
  city: string;
  cityAr: string;
  slug: string;
  count: number;
  stores: CityShop[];
}

export interface CityIndexEntry {
  slug: string;
  city: string;
  cityAr: string;
  count: number;
}

export const CITIES: CityIndexEntry[] = cityIndex as CityIndexEntry[];

// Vite dynamic-import map for code-splitting one chunk per city.
// Keys are paths relative to this file.
const cityLoaders = import.meta.glob("../data/cities/*.json");

const cache = new Map<string, CityFile>();

export async function loadCity(slug: string): Promise<CityFile | null> {
  if (cache.has(slug)) return cache.get(slug)!;
  const key = `../data/cities/${slug}.json`;
  const loader = cityLoaders[key] as (() => Promise<{ default: CityFile }>) | undefined;
  if (!loader) return null;
  const mod = await loader();
  const data = mod.default;
  cache.set(slug, data);
  return data;
}

export function getCityIndexEntry(slug: string): CityIndexEntry | undefined {
  return CITIES.find((c) => c.slug === slug);
}
