/**
 * ShopResultCard — vertical, photo-led card optimized for the /search shop grid.
 * Designed to scale cleanly from 1-col mobile up to 4-col desktop.
 * Apple-style: minimal borders, soft shadow on hover, generous breathing room.
 */
import { memo, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  Globe,
  MapPin,
  MessageCircle,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { getFallbackProductImage } from "@/lib/productVisuals";
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

export const ShopResultCard = memo(function ShopResultCard({
  shop,
  previewImageUrl,
  index = 0,
}: {
  shop: Shop;
  previewImageUrl?: string;
  index?: number;
}) {
  const categories = shop.categories?.length ? shop.categories : [shop.category];
  const fallback = getFallbackProductImage(categories[0]);
  const primaryImage = (() => {
    const rawImg = previewImageUrl ?? shop.gallery?.[0] ?? shop.imageUrl;
    return rawImg ? optimizeImageUrl(rawImg, { width: 640, height: 480 }) ?? rawImg : undefined;
  })();
  const fallbackImage = fallback;
  const [imgSrc, setImgSrc] = useState<string | undefined>(primaryImage ?? fallbackImage);

  useEffect(() => {
    setImgSrc(primaryImage ?? fallbackImage);
  }, [primaryImage, fallbackImage]);

  const rating = typeof shop.rating === "number" && shop.rating > 0
    ? { rating: shop.rating, userRatingCount: shop.reviewCount ?? 0 }
    : null;
  const location = shop.address ?? shop.area;

  return (
    <article
      className="cv-card-shop search-card-shell group relative flex h-full flex-col overflow-hidden p-1.5 animate-enter will-change-transform sm:p-2"
      style={{ ["--stagger" as never]: Math.min(index, 12) }}
    >
      {/* ===== Image area ===== */}
      <Link
        to={`/shop-view/${shop.id}`}
        className="product-media-well relative block aspect-[5/4] overflow-hidden"
      >
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={shop.name}
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => {
              if (imgSrc !== fallbackImage) {
                setImgSrc(fallbackImage);
                return;
              }
              setImgSrc(undefined);
            }}
            className="h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.045]"
          />
        ) : (
          <div
            aria-hidden="true"
            className="h-full w-full bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--surface-2))_100%)]"
          />
        )}
        {/* Subtle bottom gradient for depth */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-foreground/14 to-transparent" />

        {/* Verified — top start, minimal pill */}
        {shop.verified && (
          <div className="absolute start-2.5 top-2.5 inline-flex items-center gap-1 rounded-full border border-white/70 bg-card/92 px-2 py-0.5 text-[10px] font-semibold text-accent-emerald shadow-soft">
            <ShieldCheck className="h-2.5 w-2.5" strokeWidth={2.5} />
            <span>موثّق</span>
          </div>
        )}

        {rating && (
          <div className="absolute end-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-card/92 px-2 py-0.5 text-[10px] font-medium text-foreground shadow-soft">
            <Star className="h-2.5 w-2.5 fill-warning text-warning" strokeWidth={0} />
            <span className="tabular-nums">{rating.rating.toFixed(1)}</span>
            {rating.userRatingCount > 0 && (
              <span className="tabular-nums text-muted-foreground/80">
                ({rating.userRatingCount.toLocaleString("en-US")})
              </span>
            )}
          </div>
        )}
      </Link>

      {/* ===== Body ===== */}
      <div className="flex flex-1 flex-col gap-2 px-2.5 pb-2 pt-4 sm:px-3.5">
        {/* Top row: rating + primary category */}
        <div className="flex items-center justify-between gap-2">
          {!rating ? (
            <span className="rounded-full bg-primary-soft px-2 py-1 text-[11px] font-semibold text-primary">جديد</span>
          ) : <span className="text-[11px] text-muted-foreground/60">مقيّم</span>}
          <span className="truncate text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
            {CAT_LABELS[categories[0]] ?? categories[0]}
          </span>
        </div>

        {/* Name */}
        <Link to={`/shop-view/${shop.id}`} className="block">
          <h3 className="line-clamp-2 min-h-[2.6em] text-balance text-[15px] font-bold leading-snug tracking-normal text-foreground transition-colors group-hover:text-primary">
            {shop.name}
          </h3>
        </Link>

        {/* Address */}
        {location && (
          <div className="flex items-start gap-1.5 text-[12px] leading-relaxed text-muted-foreground">
            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground/60" strokeWidth={2} />
            <span className="line-clamp-2">{location}</span>
          </div>
        )}

        {/* Hairline separator */}
        <div className="mt-auto h-px w-full bg-border/60" />

        {/* Bottom row: contact icons + CTA */}
        <div className="flex items-center gap-0.5 pt-1">
          {shop.phone && (
            <a
              href={`tel:${shop.phone}`}
              onClick={(e) => e.stopPropagation()}
              aria-label="اتصال"
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-primary-soft hover:text-primary"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          )}
          {shop.whatsapp && (
            <a
              href={`https://wa.me/${shop.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              aria-label="واتساب"
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-emerald-soft hover:text-accent-emerald"
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          )}
          {shop.website && (
            <a
              href={shop.website}
              target="_blank"
              rel="noreferrer noopener"
              onClick={(e) => e.stopPropagation()}
              aria-label="موقع"
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground/70 transition-colors hover:bg-cyan-soft hover:text-accent-cyan"
            >
              <Globe className="h-3.5 w-3.5" strokeWidth={2} />
            </a>
          )}

          <Link
            to={`/shop-view/${shop.id}`}
            className="ms-auto inline-flex min-h-10 items-center gap-2 rounded-full bg-foreground px-3 py-1.5 text-[12.5px] font-semibold text-background shadow-[0_14px_30px_-24px_hsl(var(--foreground)/0.8)] transition-[background-color,box-shadow,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-foreground/90 hover:shadow-[0_18px_36px_-26px_hsl(var(--foreground)/0.9)]"
          >
            <span>فتح المحل</span>
            <span className="grid h-7 w-7 place-items-center rounded-full bg-background/10">
              <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1" />
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
});
