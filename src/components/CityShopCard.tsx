import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  MessageCircle,
  Phone,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StarRating } from "./StarRating";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import { buildGoogleMapsUrl } from "@/lib/googleMaps";
import { optimizeImageUrl } from "@/lib/imageUrl";
import type { CityShop } from "@/lib/cityData";

interface Props {
  shop: CityShop;
  citySlug: string;
}

// Try to extract today's hours from the workingHours array.
// Google returns entries like: "Monday: 10:00 AM – 10:00 PM".
function getTodayHours(hours?: string[]): string | null {
  if (!hours || hours.length === 0) return null;
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const today = days[new Date().getDay()];
  const match = hours.find((h) => h.toLowerCase().startsWith(today.toLowerCase()));
  const raw = match ?? hours[0];
  if (raw.includes(":")) {
    const after = raw.split(":").slice(1).join(":").trim();
    return after || null;
  }
  return raw;
}

// Pick the most useful one-liner from the available copy fields.
function getHighlight(shop: CityShop): string | null {
  const candidates = [shop.editorialSummary, shop.reviewSummary].filter(Boolean) as string[];
  if (!candidates.length) return null;
  const text = candidates[0].trim();
  if (text.length <= 110) return text;
  return text.slice(0, 107).trimEnd() + "…";
}

// Detect a Google Plus Code (e.g. "94HP+XWF, Mosul, Nineveh Governorate, Iraq").
// These are not human-friendly so we hide them.
function isPlusCodeAddress(address?: string): boolean {
  if (!address) return false;
  return /^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}/i.test(address.trim());
}

// Produce a short, human-friendly location line: prefer area + city,
// fall back to a cleaned address with the Plus Code stripped.
function getLocationLine(shop: CityShop): string | null {
  if (shop.area && shop.city && shop.area !== shop.city) return `${shop.area} — ${shop.city}`;
  if (shop.area) return shop.area;
  if (shop.address && !isPlusCodeAddress(shop.address)) return shop.address;
  // Try to drop a leading Plus Code from a mixed address.
  if (shop.address) {
    const cleaned = shop.address.replace(/^[23456789CFGHJMPQRVWX]{4,}\+[23456789CFGHJMPQRVWX]{2,}\s*,?\s*/i, "").trim();
    if (cleaned) return cleaned;
  }
  return shop.city ?? null;
}

// Format an Iraqi phone number for readability: "+964 770 123 4567".
function formatPhone(raw?: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  // Group as +XXX XXX XXX XXXX style.
  const m = digits.match(/^(\+?\d{1,4})(\d{3})(\d{3})(\d{2,4})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]} ${m[4]}`;
  return digits;
}

export function CityShopCard({ shop, citySlug }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const fallback = CATEGORY_IMAGES[(shop.category || shop.suggested_category || "Computing") as keyof typeof CATEGORY_IMAGES];
  const rawImg = shop.imageUrl && !imgFailed ? shop.imageUrl : fallback;
  const img = optimizeImageUrl(rawImg, { width: 720, height: 520 }) ?? rawImg;
  const mapsUrl = buildGoogleMapsUrl({
    googleMapsUrl: shop.googleMapsUrl,
    lat: shop.lat,
    lng: shop.lng,
    name: shop.name,
    address: shop.address,
  });
  const badges = Array.from(new Set([shop.category, shop.suggested_category].filter(Boolean))).slice(0, 3) as string[];
  const isVerified = Boolean(
    shop.quickSignals?.has_website ||
    (shop.trustBadges || []).some((badge) => /موث|رسمي|صور متوفرة|تقييم متوفر|نشط/.test(badge)),
  );
  const reviews = shop.reviewCount ?? 0;
  const todayHours = getTodayHours(shop.workingHours);
  const highlight = getHighlight(shop);
  const openNow = shop.openNow ?? shop.quickSignals?.open_now ?? null;

  // Compact contact icons row
  const contacts: { icon: typeof Phone; label: string; href?: string }[] = [];
  if (shop.phone) contacts.push({ icon: Phone, label: "اتصال", href: `tel:${shop.phone}` });
  if (shop.whatsapp) {
    const wa = shop.whatsapp.replace(/[^\d+]/g, "");
    contacts.push({ icon: MessageCircle, label: "واتساب", href: `https://wa.me/${wa.replace(/^\+/, "")}` });
  }
  if (shop.website) contacts.push({ icon: Globe, label: "موقع", href: shop.website });

  return (
    <article className="group card-elevate relative overflow-hidden rounded-[1.65rem] border border-border/75 bg-card/94 shadow-soft-lg sm:rounded-[1.8rem]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/75 to-transparent" />

      <Link
        to={`/city/${citySlug}/shop/${shop.id}`}
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

        <div className="absolute right-3 top-3 flex flex-col items-end gap-1.5">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold backdrop-blur-sm ${
              isVerified ? "bg-success/90 text-white" : "bg-black/35 text-white"
            }`}
          >
            {isVerified ? "موثّق" : "محل"}
          </span>
          {openNow !== null && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${
                openNow ? "bg-success/90 text-white" : "bg-destructive/85 text-white"
              }`}
            >
              {openNow ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
              {openNow ? "مفتوح الآن" : "مغلق"}
            </span>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 p-4 text-white">
          <div className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm">
            <MapPin className="h-3 w-3 text-primary" />
            {shop.area || shop.city}
          </div>
          <h3 className="mt-3 font-display text-[1.8rem] font-bold leading-[0.94] drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-3xl sm:leading-[0.9]">
            {shop.name}
          </h3>
          {typeof shop.rating === "number" && shop.rating > 0 && (
            <div className="mt-2">
              <StarRating rating={shop.rating} reviews={reviews} size="xs" className="[&_span]:text-white" />
            </div>
          )}
        </div>
      </Link>

      <div className="space-y-3 p-3.5 text-right sm:p-4">
        {/* Category chips */}
        {badges.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span
                key={badge}
                className="inline-flex items-center rounded-full border border-border/75 bg-background px-2.5 py-1 text-[10px] font-semibold text-foreground/78"
              >
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Useful info rows — only render rows we actually have data for */}
        <ul className="space-y-1.5 text-[12px] leading-5 text-muted-foreground">
          {shop.address && (
            <li className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60" />
              <span className="line-clamp-1 text-foreground/85">{shop.address}</span>
            </li>
          )}
          {todayHours && (
            <li className="flex items-start gap-1.5">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60" />
              <span className="text-foreground/85">
                <span className="me-1 font-semibold text-foreground">اليوم:</span>
                {todayHours}
              </span>
            </li>
          )}
          {highlight && (
            <li className="line-clamp-2 text-foreground/75 italic">
              “{highlight}”
            </li>
          )}
        </ul>

        {/* Quick contact icons row */}
        {contacts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 border-t border-border/60 pt-3">
            {contacts.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target={href?.startsWith("http") ? "_blank" : undefined}
                rel={href?.startsWith("http") ? "noreferrer noopener" : undefined}
                className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background px-2.5 py-1 text-[11px] font-medium text-foreground/85 transition-colors hover:border-primary/40 hover:text-primary"
              >
                <Icon className="h-3 w-3" />
                {label}
              </a>
            ))}
          </div>
        )}

        {/* Primary CTA + map */}
        <div className="flex items-center gap-2 pt-1">
          <Button asChild size="sm" className="h-10 flex-1 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/94">
            <Link to={`/city/${citySlug}/shop/${shop.id}`}>
              افتح صفحة المحل
              <ArrowLeft className="icon-nudge-x h-3.5 w-3.5" />
            </Link>
          </Button>

          {mapsUrl && (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="h-10 rounded-full border-border/75 bg-background px-3 hover:border-accent/35 hover:text-accent"
            >
              <a href={mapsUrl} target="_blank" rel="noreferrer noopener" aria-label="افتح بالخريطة">
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
