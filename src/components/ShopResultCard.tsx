/**
 * ShopResultCard — compact horizontal card optimized for /search results list.
 * Different from <ShopCard /> (used on home/listing) — denser, more meta data,
 * built for scanning a long list quickly.
 */
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Globe,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { getRating } from "@/lib/googleRatings";
import { cn } from "@/lib/utils";
import type { Category, Shop } from "@/lib/types";

const CAT_LABELS: Partial<Record<Category, string>> = {
  Computing: "حاسبات",
  "PC Parts": "قطع PC",
  Networking: "شبكات",
  Gaming: "ألعاب",
  Cameras: "كاميرات",
  Printers: "طابعات",
  Phones: "هواتف",
  Chargers: "شواحن",
  Accessories: "إكسسوارات",
  Tablets: "تابلت",
  "Smart Devices": "أجهزة ذكية",
};

export function ShopResultCard({ shop }: { shop: Shop }) {
  const categories = shop.categories?.length ? shop.categories : [shop.category];
  const fallback = CATEGORY_IMAGES[categories[0]];
  const rawImg = shop.imageUrl ?? fallback;
  const img = optimizeImageUrl(rawImg, { width: 280, height: 280 }) ?? rawImg;
  const rating = getRating(shop);

  return (
    <article className="group relative flex gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 shadow-soft-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-soft-md sm:gap-4 sm:p-4">
      {/* Thumb */}
      <Link
        to={`/shop-view/${shop.id}`}
        className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-surface sm:h-28 sm:w-28"
      >
        <img
          src={img}
          alt={shop.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {shop.verified && (
          <div className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-emerald text-emerald-foreground shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        )}
      </Link>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/shop-view/${shop.id}`}
              className="block truncate text-base font-bold text-foreground hover:text-primary sm:text-lg"
            >
              {shop.name}
            </Link>
            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{shop.address ?? shop.area}</span>
            </div>
          </div>

          {rating && (
            <div className="flex shrink-0 items-center gap-1 rounded-lg bg-amber/10 px-2 py-1 text-xs font-bold text-amber">
              <Star className="h-3 w-3 fill-current" />
              {rating.rating.toFixed(1)}
              <span className="text-[10px] font-normal text-muted-foreground">
                ({rating.userRatingCount})
              </span>
            </div>
          )}
        </div>

        {/* Category chips */}
        <div className="mt-2 flex flex-wrap gap-1">
          {categories.slice(0, 3).map((c) => (
            <Badge
              key={c}
              variant="secondary"
              className="h-5 rounded-full px-2 text-[10px] font-medium"
            >
              {CAT_LABELS[c] ?? c}
            </Badge>
          ))}
          {categories.length > 3 && (
            <Badge variant="outline" className="h-5 rounded-full px-2 text-[10px]">
              +{categories.length - 3}
            </Badge>
          )}
        </div>

        {/* Contact + CTA row */}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            {shop.phone && (
              <a
                href={`tel:${shop.phone}`}
                onClick={(e) => e.stopPropagation()}
                aria-label="اتصال"
                className="grid h-7 w-7 place-items-center rounded-full bg-surface transition-colors hover:bg-primary/10 hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>
            )}
            {shop.whatsapp && (
              <a
                href={`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
                aria-label="واتساب"
                className="grid h-7 w-7 place-items-center rounded-full bg-surface transition-colors hover:bg-emerald/10 hover:text-emerald"
              >
                <MessageCircle className="h-3.5 w-3.5" />
              </a>
            )}
            {shop.website && (
              <a
                href={shop.website}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
                aria-label="موقع"
                className="grid h-7 w-7 place-items-center rounded-full bg-surface transition-colors hover:bg-accent-cyan/10 hover:text-accent-cyan"
              >
                <Globe className="h-3.5 w-3.5" />
              </a>
            )}
            {shop.googleMapsUrl && (
              <a
                href={shop.googleMapsUrl}
                target="_blank"
                rel="noreferrer noopener"
                onClick={(e) => e.stopPropagation()}
                aria-label="خرائط"
                className="grid h-7 w-7 place-items-center rounded-full bg-surface transition-colors hover:bg-accent-violet/10 hover:text-accent-violet"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <Button
            asChild
            size="sm"
            className="h-8 rounded-lg bg-gradient-primary text-xs text-primary-foreground shadow-sm"
          >
            <Link to={`/shop-view/${shop.id}`}>
              فتح المحل
              <ArrowLeft className="ms-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
