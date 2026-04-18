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
  const summaryParts = [
    rating ? `تقييم ${rating.rating.toFixed(1)} من ${rating.userRatingCount.toLocaleString("ar")} مراجعة` : null,
    shop.phone ? "رقم اتصال متوفر" : null,
    shop.website ? "موقع متوفر" : null,
    shop.googleMapsUrl ? "رابط خريطة متوفر" : null,
  ].filter(Boolean) as string[];
  const summary = summaryParts.slice(0, 2).join(" • ");

  return (
    <article className="group card-elevate relative overflow-hidden rounded-[1.65rem] border border-border/75 bg-card/94 shadow-soft-lg sm:rounded-[1.8rem]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent" />

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
        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_5%,rgba(9,16,26,0.06)_40%,rgba(9,16,26,0.72)_100%)]" />

        <div className="absolute right-3 top-3">
          <VerifiedBadge verified={shop.verified} />
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 text-white">
          <div className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
            <MapPin className="h-3 w-3 text-primary" />
            {shop.area}
          </div>
          <h3 className="mt-3 font-display text-[1.8rem] font-bold leading-[0.94] drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-3xl sm:leading-[0.9]">
            {shop.name}
          </h3>
          {rating && <div className="mt-2"><StarRating rating={rating.rating} reviews={rating.userRatingCount} size="xs" className="[&_span]:text-white" /></div>}
        </div>
      </Link>

      <div className="space-y-4 p-3.5 text-right sm:p-4">
        <div className="flex flex-wrap gap-1.5">
          {categories.slice(0, 4).map((category) => (
            <span
              key={category}
              className="inline-flex items-center rounded-full border border-border/75 bg-background px-2.5 py-1 text-[10px] font-semibold text-foreground/78"
            >
              {CAT_LABELS[category] ?? category}
            </span>
          ))}
          {categories.length > 4 && (
            <span className="inline-flex items-center rounded-full border border-border/75 bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
              +{categories.length - 4}
            </span>
          )}
        </div>

        <div className="atlas-separator pb-4">
          <p className="text-xs leading-6 text-muted-foreground">
            {summary || "افتح صفحة المحل حتى تشوف التفاصيل، الصور، وطرق التواصل المتوفرة."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="h-10 flex-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/94">
            <Link to={`/shop-view/${shop.id}`}>
              افتح صفحة المحل
              <ArrowLeft className="icon-nudge-x h-3.5 w-3.5" />
            </Link>
          </Button>

          {shop.googleMapsUrl && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-10 rounded-full border-border/75 bg-background px-3 hover:border-accent/35 hover:text-accent"
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
              className="h-10 rounded-full border-border/75 bg-background px-3 hover:border-accent/35 hover:text-accent"
            >
              <a href={shop.website} target="_blank" rel="noreferrer noopener" aria-label="الموقع الإلكتروني">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
