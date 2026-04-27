import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, MapPin, Phone, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { categoryChipClass } from "@/lib/categoryColors";
import type { Category, Shop } from "@/lib/types";
import { getShopImage } from "@/lib/shopImages";
import { getFallbackProductImage } from "@/lib/productVisuals";

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

// Format an Iraqi phone number for readability: "+964 770 123 4567".
function formatPhone(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  const m = digits.match(/^(\+?\d{1,4})(\d{3})(\d{3})(\d{2,4})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  return digits;
}

export function ShopCard({ shop }: { shop: Shop }) {
  const cityRouteShopId = shop.seedKey ?? shop.id;
  const shopHref =
    shop.citySlug && !shop.citySlug.includes("/") && !shop.citySlug.startsWith(".")
      ? `/city/${shop.citySlug}/shop/${cityRouteShopId}`
      : `/shop-view/${shop.id}`;
  const categories = shop.categories && shop.categories.length > 0 ? shop.categories : [shop.category];
  const fallback = getFallbackProductImage(categories[0]);
  const [imgFailed, setImgFailed] = useState(false);
  const previewImage = getShopImage(shop);
  const rawImg = !imgFailed ? (previewImage ?? fallback) : fallback;
  const img = optimizeImageUrl(rawImg, { width: 720, height: 520 }) ?? rawImg;
  const rating = typeof shop.rating === "number" && shop.rating > 0
    ? { rating: shop.rating, userRatingCount: shop.reviewCount ?? 0 }
    : null;

  // Ribbon logic — verified > top-rated > none
  const isTopRated = rating && rating.rating >= 4.5;
  const ribbon = shop.verified
    ? { className: "ribbon ribbon-emerald", icon: ShieldCheck, label: "موثّق" }
    : isTopRated
      ? { className: "ribbon ribbon-amber", icon: Sparkles, label: "مميّز" }
      : null;

  return (
    <article className="group relative flex h-full min-h-0 overflow-hidden rounded-[1.8rem] bg-border/40 p-px text-right shadow-[0_18px_50px_-44px_rgba(23,32,23,0.36)] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-border-hover">
      <div className="relative flex min-h-0 w-full flex-col overflow-hidden rounded-[calc(1.8rem-1px)] bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.88)]">
        {ribbon && (
          <span className={ribbon.className}>
            <ribbon.icon className="h-3 w-3" />
            {ribbon.label}
          </span>
        )}

        <Link
          to={shopHref}
          className="img-frame relative block aspect-[4/3] overflow-hidden bg-surface-2"
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
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/68 via-foreground/12 to-transparent" />

          {rating && (
            <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[10.5px] font-semibold text-foreground shadow-[0_10px_24px_-18px_rgba(23,32,23,0.45)] ring-1 ring-white/60 backdrop-blur-sm">
              <Star className="h-3 w-3 fill-warning text-warning" />
              <span className="tabular-nums">{rating.rating.toFixed(1)}</span>
              {rating.userRatingCount > 0 && (
                <span className="tabular-nums text-muted-foreground">
                  ({rating.userRatingCount.toLocaleString("en-US")})
                </span>
              )}
            </div>
          )}

          <div className="absolute bottom-3 left-3">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-card/95 px-2.5 py-1 text-[10px] font-semibold text-foreground shadow-[0_10px_24px_-18px_rgba(23,32,23,0.45)] ring-1 ring-white/60 backdrop-blur-sm">
              <MapPin className="h-3 w-3 text-primary" />
              {shop.area}
            </div>
          </div>
        </Link>

        <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
          <h3 className="font-display line-clamp-2 min-h-[3.35rem] text-balance text-[clamp(1.28rem,1.65vw,1.72rem)] font-black leading-[1.08] tracking-normal text-foreground transition-colors group-hover:text-primary sm:min-h-[3.72rem]">
            {shop.name}
          </h3>

          <ul className="space-y-1.5 text-[12px] leading-5 text-muted-foreground">
            {shop.area && (
              <li className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="line-clamp-1 text-muted-foreground">{shop.area}</span>
              </li>
            )}
            {formatPhone(shop.phone) && (
              <li className="flex items-start gap-1.5">
                <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span dir="ltr" className="font-numeric tabular-nums text-muted-foreground">{formatPhone(shop.phone)}</span>
              </li>
            )}
          </ul>

          <div className="flex min-h-[1.6rem] flex-wrap gap-1.5">
            {categories.slice(0, 3).map((category) => (
              <span
                key={category}
                className={`${categoryChipClass(category)} rounded-full px-2 py-0.5 text-[10px] font-semibold`}
              >
                {CAT_LABELS[category] ?? category}
              </span>
            ))}
            {categories.length > 3 && (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                <span className="font-numeric tabular-nums">+{categories.length - 3}</span>
              </span>
            )}
          </div>

          <div className="mt-auto flex items-center gap-2 pt-2">
            <Button asChild size="sm" className="group/open flex-1 rounded-full bg-foreground text-background transition-[transform,background-color,box-shadow,color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/90 active:scale-[0.96]">
              <Link to={shopHref}>
                افتح المحل
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/open:-translate-x-1">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </span>
              </Link>
            </Button>

            {shop.googleMapsUrl && (
              <Button
                asChild
                size="sm"
                variant="outline"
                className="rounded-full border-border bg-white/70 px-3 text-muted-foreground transition-[background-color,border-color,color,box-shadow] hover:border-primary/35 hover:bg-white hover:text-primary"
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
                className="rounded-full border-border bg-white/70 px-3 text-muted-foreground transition-[background-color,border-color,color,box-shadow] hover:border-primary/35 hover:bg-white hover:text-primary"
              >
                <a href={shop.website} target="_blank" rel="noreferrer noopener" aria-label="الموقع">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
