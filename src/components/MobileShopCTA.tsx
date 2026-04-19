import { Phone, MapPin, MessageCircle, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileShopCTAProps {
  phone?: string | null;
  callUrl?: string | null;
  mapsUrl?: string | null;
  whatsappUrl?: string | null;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
}

/**
 * Sticky bottom CTA bar for ShopView on mobile.
 * Sits ABOVE the BottomTabBar (offset by 88px) and respects safe-area inset.
 * iOS-style: large tap targets, subtle press feedback, frosted glass.
 */
export function MobileShopCTA({
  phone,
  callUrl,
  mapsUrl,
  whatsappUrl,
  isFavorite,
  onToggleFavorite,
}: MobileShopCTAProps) {
  const hasAny = phone || mapsUrl || whatsappUrl;
  if (!hasAny) return null;

  return (
    <div
      className="fixed inset-x-0 z-40 lg:hidden"
      style={{ bottom: `calc(72px + env(safe-area-inset-bottom))` }}
      aria-label="إجراءات سريعة للمحل"
    >
      <div className="mx-auto max-w-md px-3 pb-2">
        <div className="flex items-stretch gap-1.5 rounded-[20px] border border-border/50 bg-background/85 p-1.5 shadow-[0_8px_32px_-8px_hsl(var(--foreground)/0.18)] backdrop-blur-xl">
          {phone && (
            <a
              href={callUrl ?? `tel:${phone.replace(/\s/g, "")}`}
              className="ios-tap flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-primary px-3 py-2.5 text-sm font-bold text-primary-foreground shadow-soft-md"
              aria-label="اتصل بالمحل"
            >
              <Phone className="h-4 w-4" />
              اتصل
            </a>
          )}
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="ios-tap flex items-center justify-center gap-1.5 rounded-2xl bg-success px-3 py-2.5 text-sm font-bold text-white"
              aria-label="واتساب"
            >
              <MessageCircle className="h-4 w-4" />
            </a>
          )}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="ios-tap flex items-center justify-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-2.5 text-sm font-bold text-foreground"
              aria-label="افتح بخرائط Google"
            >
              <MapPin className="h-4 w-4" />
              الموقع
            </a>
          )}
          {onToggleFavorite && (
            <button
              type="button"
              onClick={onToggleFavorite}
              className={cn(
                "ios-tap flex items-center justify-center rounded-2xl border border-border bg-card px-3 py-2.5",
                isFavorite ? "text-accent" : "text-foreground",
              )}
              aria-label={isFavorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
            >
              <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
