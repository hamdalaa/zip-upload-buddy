// City data layer — the public app keeps only the tiny index locally.
// Full city payloads come from the backend `/public/cities/:slug` endpoint.

import cityIndex from "@/data/cities/index.json";
import { ApiError } from "./api";
import { getCityDetail, type CityFile, type CityIndexEntry, type CityShop } from "./catalogApi";

export type { CityFile, CityIndexEntry, CityShop } from "./catalogApi";

export const CITIES: CityIndexEntry[] = cityIndex as CityIndexEntry[];

const cache = new Map<string, CityFile>();
const pending = new Map<string, Promise<CityFile | null>>();

export async function loadCity(slug: string): Promise<CityFile | null> {
  if (cache.has(slug)) return cache.get(slug)!;
  if (!pending.has(slug)) {
    pending.set(
      slug,
      getCityDetail(slug)
        .then((data) => {
          cache.set(slug, data);
          pending.delete(slug);
          return data;
        })
        .catch((error) => {
          pending.delete(slug);
          if (error instanceof ApiError && error.status === 404) return null;
          throw error;
        }),
    );
  }
  return pending.get(slug)!;
}

export function getCityIndexEntry(slug: string): CityIndexEntry | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function primeCityCache(city: CityFile) {
  cache.set(city.slug, city);
}
