import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "./Badges";
import { StarRating } from "./StarRating";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { getRating } from "@/lib/googleRatings";
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

  return (
    <article className="group atlas-card overflow-hidden text-right">
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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_50%,rgba(14,22,32,0.55)_100%)]" />

        <div className="absolute right-3 top-3">
          <VerifiedBadge verified={shop.verified} />
        </div>

        <div className="absolute bottom-3 left-3">
          <div className="inline-flex items-center gap-1 bg-background/95 px-2 py-1 text-[10px] font-semibold text-foreground">
            <MapPin className="h-3 w-3 text-primary" />
            {shop.area}
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-4">
        <h3 className="font-display text-2xl font-bold leading-tight text-foreground line-clamp-2">
          {shop.name}
        </h3>

        {rating && (
          <StarRating rating={rating.rating} reviews={rating.userRatingCount} size="xs" />
        )}

        <div className="editorial-rule" />

        <div className="flex flex-wrap gap-1.5">
          {categories.slice(0, 3).map((category) => (
            <span
              key={category}
              className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
            >
              {CAT_LABELS[category] ?? category}
            </span>
          )).reduce((acc: React.ReactNode[], el, i, arr) => {
            acc.push(el);
            if (i < arr.length - 1) acc.push(<span key={`sep-${i}`} className="text-muted-foreground/40">·</span>);
            return acc;
          }, [])}
          {categories.length > 3 && (
            <span className="text-[10px] font-semibold text-muted-foreground">+{categories.length - 3}</span>
          )}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" className="h-9 flex-1 rounded-none bg-foreground text-background hover:bg-primary">
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
              className="h-9 rounded-none border-border bg-background px-3 text-foreground hover:border-foreground"
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
              className="h-9 rounded-none border-border bg-background px-3 text-foreground hover:border-foreground"
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
