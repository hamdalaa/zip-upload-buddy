import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "./Badges";
import { StarRating } from "./StarRating";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { getRating } from "@/lib/googleRatings";
import { categoryChipClass } from "@/lib/categoryColors";
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

export function ShopCard({ shop }: { shop: Shop }) {
  const categories = shop.categories && shop.categories.length > 0 ? shop.categories : [shop.category];
  const fallback = CATEGORY_IMAGES[categories[0]];
  const [imgFailed, setImgFailed] = useState(false);
  const rawImg = shop.imageUrl && !imgFailed ? shop.imageUrl : fallback;
  const img = optimizeImageUrl(rawImg, { width: 720, height: 520 }) ?? rawImg;
  const rating = getRating(shop);

  // Ribbon logic — verified > top-rated > none
  const isTopRated = rating && rating.rating >= 4.5;
  const ribbon = shop.verified
    ? { className: "ribbon ribbon-emerald", icon: ShieldCheck, label: "موثّق" }
    : isTopRated
      ? { className: "ribbon ribbon-amber", icon: Sparkles, label: "مميّز" }
      : null;

  return (
    <article className="group atlas-card relative overflow-hidden text-right shadow-soft-md">
      {ribbon && (
        <span className={ribbon.className}>
          <ribbon.icon className="h-3 w-3" />
          {ribbon.label}
        </span>
      )}

      <Link
        to={`/shop-view/${shop.id}`}
        className="relative block aspect-[4/3] overflow-hidden bg-surface-2"
        aria-label={`${shop.name} — افتح صفحة المحل`}
      >
        <img
          src={img}
          alt={shop.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="smooth-img h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-foreground/55 via-transparent to-transparent" />

        <div className="absolute bottom-3 left-3">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-soft-md backdrop-blur-sm">
            <span className="pin-pulse inline-flex">
              <MapPin className="relative h-3 w-3 text-primary" />
            </span>
            {shop.area}
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-4 sm:p-5">
        <h3 className="font-display text-lg sm:text-xl font-semibold leading-tight text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {shop.name}
        </h3>

        {rating && (
          <StarRating rating={rating.rating} reviews={rating.userRatingCount} size="xs" />
        )}

        <div className="flex flex-wrap gap-1.5">
          {categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className={`${categoryChipClass(category)} rounded-full px-2 py-0.5 text-[10px] font-semibold`}
            >
              {CAT_LABELS[category] ?? category}
            </span>
          ))}
          {categories.length > 3 && (
            <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{categories.length - 3}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" className="btn-ripple h-9 flex-1 rounded-xl bg-foreground text-background hover:bg-primary transition-colors">
            <Link to={`/shop-view/${shop.id}`}>
              افتح المحل
              <ArrowLeft className="icon-nudge-x h-3.5 w-3.5" />
            </Link>
          </Button>

          {shop.googleMapsUrl && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-9 rounded-xl border-border bg-background px-3 text-foreground hover:border-primary hover:text-primary"
            >
              <a href={shop.googleMapsUrl} target="_blank" rel="noreferrer noopener" aria-label="خرائط Google">
                <MapPin className="h-4 w-4" />
              </a>
            </Button>
          )}

          {shop.website && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-9 rounded-xl border-border bg-background px-3 text-foreground hover:border-primary hover:text-primary"
            >
              <a href={shop.website} target="_blank" rel="noreferrer noopener" aria-label="الموقع">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
