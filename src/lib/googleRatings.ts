// Google ratings & reviews lookup — sourced from the static snapshot at
// src/data/all-google-reviews.json (combined شارع الصناعة + شارع الربيعي).
//
// Matching strategy: we extract the stable Google CID from `googleMapsUrl`
// (e.g. `?cid=14373823472293759937`) which 1:1-matches the `place_id` rows
// in the snapshot. This works for 348/348 imported shops.
//
// When Lovable Cloud is enabled, swap `getRating(shop)` to call an edge
// function backed by `live_place_cache` — the consumer API stays identical.

import raw from "@/data/all-google-reviews.json";
import type { Shop } from "./types";

export interface GoogleReview {
  rating: number;
  text: string;
  author_name: string;
  author_photo_url?: string;
  relative_publish_time?: string;
  publish_time?: string;
  review_google_maps_url?: string;
}

export interface GoogleRating {
  placeId: string;
  rating: number;
  userRatingCount: number;
  reviews: GoogleReview[];
  editorialSummary?: string;
  reviewSummary?: string;
}

interface RawStore {
  place_id: string;
  store_name: string;
  google_maps_url: string;
  rating?: number;
  user_rating_count?: number;
  editorial_summary?: string;
  review_summary?: string;
  reviews?: GoogleReview[];
}

const dataset = raw as { stores: RawStore[] };

function cidFromMapsUrl(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/[?&]cid=(\d+)/);
  return m ? m[1] : null;
}

// Build CID → rating index once at module load
const byCid = new Map<string, GoogleRating>();
for (const s of dataset.stores) {
  const cid = cidFromMapsUrl(s.google_maps_url);
  if (!cid) continue;
  if (typeof s.rating !== "number") continue;
  byCid.set(cid, {
    placeId: s.place_id,
    rating: s.rating,
    userRatingCount: s.user_rating_count ?? 0,
    reviews: (s.reviews ?? []).filter((r) => r && typeof r.rating === "number"),
    editorialSummary: s.editorial_summary || undefined,
    reviewSummary: s.review_summary || undefined,
  });
}

export function getRating(shop: Pick<Shop, "googleMapsUrl">): GoogleRating | null {
  const cid = cidFromMapsUrl(shop.googleMapsUrl);
  if (!cid) return null;
  return byCid.get(cid) ?? null;
}

/** Top reviews with non-empty Arabic/English text, highest rating first. */
export function topReviews(rating: GoogleRating | null, limit = 3): GoogleReview[] {
  if (!rating) return [];
  return [...rating.reviews]
    .filter((r) => r.text && r.text.trim().length > 0)
    .sort((a, b) => b.rating - a.rating)
    .slice(0, limit);
}
