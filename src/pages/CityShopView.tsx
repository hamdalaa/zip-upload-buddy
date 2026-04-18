import { useEffect, useState, type ComponentType } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  ExternalLink,
  Expand,
  Globe,
  Home,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  MessageSquare,
  Minus,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  X,
  XCircle,
} from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { LightboxViewer } from "@/components/LightboxViewer";
import { EmptyState } from "@/components/EmptyState";
import { StarRating } from "@/components/StarRating";
import { getCityIndexEntry, loadCity, type CityFile } from "@/lib/cityData";
import { buildGoogleMapsUrl } from "@/lib/googleMaps";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";

const ENGLISH_DAY_TO_AR: Record<string, string> = {
  Monday: "الإثنين",
  Tuesday: "الثلاثاء",
  Wednesday: "الأربعاء",
  Thursday: "الخميس",
  Friday: "الجمعة",
  Saturday: "السبت",
  Sunday: "الأحد",
};

function formatHours(line: string): string {
  const [day, ...rest] = line.split(":");
  const ar = ENGLISH_DAY_TO_AR[day.trim()] ?? day.trim();
  const time = rest.join(":").trim().replace(/AM/g, "ص").replace(/PM/g, "م").replace(/Closed/i, "مغلق");
  return `${ar}: ${time}`;
}

export default function CityShopView() {
  const { slug = "", shopId = "" } = useParams<{ slug: string; shopId: string }>();
  const navigate = useNavigate();
  const meta = getCityIndexEntry(slug);
  const [data, setData] = useState<CityFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadCity(slug).then((nextData) => {
      if (alive) {
        setData(nextData);
        setLoading(false);
      }
    });

    return () => {
      alive = false;
    };
  }, [slug]);

  // Keyboard navigation handled inside LightboxViewer

  const shop = data?.stores.find((entry) => entry.id === shopId || entry.place_id === shopId);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <TopNav />
        <main className="flex-1 container py-12">
          <div className="rounded-[2rem] border border-border/70 bg-card/88 p-8 text-center shadow-soft-lg">
            <p className="text-sm text-muted-foreground">جاري تحميل تفاصيل المحل…</p>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!meta || !data || !shop) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <TopNav />
        <main className="flex-1 container py-12">
          <EmptyState
            title="المحل غير موجود"
            description="إما الرابط غير صحيح أو أن بيانات هذا المحل لم تعد متوفرة داخل ملف المدينة."
            action={
              <Button asChild variant="outline">
                <Link to={meta ? `/city/${slug}` : "/iraq"}>رجوع</Link>
              </Button>
            }
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const gallery = [shop.imageUrl, ...(shop.gallery ?? [])].filter(Boolean) as string[];
  const uniqueGallery = [...new Set(gallery)];
  const heroImage = uniqueGallery[0] || "";
  const mapsUrl = buildGoogleMapsUrl({
    googleMapsUrl: shop.googleMapsUrl,
    lat: shop.lat,
    lng: shop.lng,
    name: shop.name,
    address: shop.address,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_16%,hsl(var(--surface))_100%)]">
      <TopNav />

      <div className="bg-background border-b border-border">
        <div className="container py-2.5 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary shrink-0"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            رجوع
          </button>
          <span className="mx-1 h-3 w-px bg-border shrink-0" />
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
            <Home className="h-3 w-3" /> الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <Link to="/iraq" className="hover:text-primary">كل محلات العراق</Link>
          <ChevronLeft className="h-3 w-3" />
          <Link to={`/city/${slug}`} className="hover:text-primary">{meta.cityAr}</Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground truncate">{shop.name}</span>
        </div>
      </div>

      <main className="flex-1 container py-6 space-y-6 md:py-8">
        <header className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/88 shadow-soft-xl backdrop-blur-sm">
          <div className="relative h-44 sm:h-52 md:h-60 bg-muted">
            {heroImage ? (
              <button
                type="button"
                onClick={() => setLightboxIndex(0)}
                className="group absolute inset-0 h-full w-full focus:outline-none"
                aria-label="عرض الصورة"
              >
                <img
                  src={optimizeImageUrl(heroImage, { width: 1600, height: 700 }) ?? heroImage}
                  alt={shop.name}
                  className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-medium text-white opacity-0 backdrop-blur-md transition-all duration-300 group-hover:opacity-100">
                  <Expand className="h-3.5 w-3.5" />
                  عرض المعرض
                </div>
              </button>
            ) : (
              <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.14),transparent_58%),linear-gradient(180deg,hsl(var(--muted))_0%,hsl(var(--background))_100%)]">
                <Store className="h-14 w-14 text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            <div className="absolute bottom-0 right-0 left-0 p-4 md:p-6 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/20 backdrop-blur px-2 py-0.5 text-[11px]">
                  {shop.area || meta.cityAr}
                </span>
                {shop.category && (
                  <span className="rounded-md bg-white/20 backdrop-blur px-2 py-0.5 text-[11px]">{shop.category}</span>
                )}
                {shop.businessStatus === "OPERATIONAL" && shop.openNow === true && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/90 px-2 py-0.5 text-[11px] font-bold">
                    <CheckCircle2 className="h-3 w-3" /> مفتوح الآن
                  </span>
                )}
                {shop.openNow === false && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-destructive/90 px-2 py-0.5 text-[11px] font-bold">
                    <XCircle className="h-3 w-3" /> مغلق حالياً
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold drop-shadow">{shop.name}</h1>
              {typeof shop.rating === "number" && shop.rating > 0 && (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur">
                  <StarRating
                    rating={shop.rating}
                    reviews={shop.reviewCount ?? 0}
                    size="sm"
                    className="[&_*]:!text-white [&_svg.fill-warning]:!fill-warning [&_svg.fill-warning]:!text-warning"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-4 md:p-5">
            {mapsUrl && (
              <Button asChild className="gap-1.5 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                <a href={mapsUrl}>
                  <MapPin className="h-4 w-4" /> افتح بالخريطة
                </a>
              </Button>
            )}
            {shop.website && (
              <Button asChild variant="outline" className="gap-1.5 rounded-full">
                <a href={shop.website} target="_blank" rel="noreferrer noopener">
                  <Globe className="h-4 w-4" /> الموقع
                </a>
              </Button>
            )}
            {shop.phone && (
              <Button asChild variant="outline" className="gap-1.5 rounded-full">
                <a href={`tel:${shop.phone.replace(/\D+/g, "")}`}>
                  <Phone className="h-4 w-4" /> <bdi dir="ltr">{shop.phone}</bdi>
                </a>
              </Button>
            )}
            {shop.whatsapp && (
              <Button asChild variant="outline" className="gap-1.5 rounded-full border-success/40 text-success hover:bg-success/10">
                <a href={shop.whatsapp} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="h-4 w-4" /> واتساب
                </a>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4 md:grid-cols-4 md:p-5">
            <SummaryTile icon={Star} value={typeof shop.rating === "number" ? shop.rating.toFixed(1) : "—"} label="التقييم" />
            <SummaryTile icon={ShieldCheck} value={(shop.reviewCount ?? 0).toLocaleString("ar")} label="عدد المراجعات" />
            <SummaryTile icon={Camera} value={`${uniqueGallery.length}`} label="صورة متاحة" />
            <SummaryTile icon={Clock} value={`${shop.workingHours?.length ?? 0}`} label="ساعات معروضة" />
          </div>
        </header>

        {!!shop.quickSignals && (() => {
          const signals = [
            { label: "موقع", icon: Globe, ok: shop.quickSignals.has_website === true },
            { label: "خرائط", icon: MapPin, ok: shop.quickSignals.has_google_maps === true },
            { label: "تقييم", icon: Star, ok: shop.quickSignals.has_rating === true },
            { label: "مراجعات", icon: MessageSquare, ok: shop.quickSignals.has_reviews === true },
            { label: "صور", icon: Camera, ok: shop.quickSignals.has_photos === true },
            { label: "نشط", icon: Activity, ok: shop.quickSignals.business_status === "OPERATIONAL" },
            {
              label: "مفتوح الآن",
              icon: DoorOpen,
              ok: shop.quickSignals.open_now === true,
              neutral: shop.quickSignals.open_now === null || shop.quickSignals.open_now === undefined,
            },
          ];
          const total = signals.length;
          const scored = signals.filter((s) => !s.neutral);
          const positive = scored.filter((s) => s.ok).length;
          const denominator = scored.length || total;
          const ratio = denominator > 0 ? positive / denominator : 0;
          const percent = Math.round(ratio * 100);
          const tier =
            ratio >= 0.85
              ? { label: "ممتاز", tone: "success" as const, icon: ShieldCheck }
              : ratio >= 0.6
                ? { label: "جيد", tone: "primary" as const, icon: CheckCircle2 }
                : ratio >= 0.35
                  ? { label: "مقبول", tone: "amber" as const, icon: Sparkles }
                  : { label: "محدود", tone: "muted" as const, icon: Minus };
          const toneRing = {
            success: "stroke-success",
            primary: "stroke-primary",
            amber: "stroke-amber-500",
            muted: "stroke-muted-foreground",
          }[tier.tone];
          const toneBadge = {
            success: "bg-success/12 text-success border-success/30",
            primary: "bg-primary/10 text-primary border-primary/30",
            amber: "bg-amber-500/12 text-amber-700 border-amber-500/30",
            muted: "bg-muted text-muted-foreground border-border",
          }[tier.tone];
          const radius = 32;
          const circumference = 2 * Math.PI * radius;
          const dash = circumference * ratio;

          return (
            <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/82 p-5 shadow-soft-lg backdrop-blur-sm md:p-6">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" aria-hidden />
              <div className="relative flex flex-col gap-5 md:flex-row md:items-center">
                {/* Score badge */}
                <div className="flex items-center gap-4">
                  <div className="relative h-[88px] w-[88px] shrink-0">
                    <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        className="fill-none stroke-muted"
                        strokeWidth="6"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        className={cn("fill-none transition-all duration-700 ease-out", toneRing)}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${dash} ${circumference}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-numeric text-xl font-bold leading-none tabular-nums text-foreground">
                        {positive}
                        <span className="text-sm text-muted-foreground">/{denominator}</span>
                      </span>
                      <span className="font-numeric mt-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {percent}%
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <Sparkles className="h-3 w-3" /> درجة الجودة
                    </div>
                    <div
                      className={cn(
                        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold",
                        toneBadge,
                      )}
                    >
                      <tier.icon className="h-3.5 w-3.5" />
                      {tier.label}
                    </div>
                    <p className="text-[11px] leading-relaxed text-muted-foreground">
                      {positive} من {denominator} إشارات إيجابية تم التحقق منها
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="hidden h-16 w-px bg-border md:block" />

                {/* Compact signal pills */}
                <div className="flex flex-1 flex-wrap gap-1.5">
                  {signals.map((s) => (
                    <span
                      key={s.label}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                        s.neutral
                          ? "border-border/70 bg-background/80 text-muted-foreground"
                          : s.ok
                            ? "border-success/30 bg-success/8 text-success"
                            : "border-border bg-muted/60 text-muted-foreground line-through decoration-muted-foreground/40",
                      )}
                    >
                      <s.icon className="h-3 w-3" />
                      {s.label}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          );
        })()}

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {uniqueGallery.length > 0 && (
              <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
                <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-bold">
                  <Camera className="h-5 w-5 text-primary" /> الصور
                  <span className="text-xs font-normal text-muted-foreground">({uniqueGallery.length})</span>
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {uniqueGallery.slice(0, 8).map((image, index) => {
                    const isLastVisible = index === 7 && uniqueGallery.length > 8;
                    return (
                      <button
                        key={`${image}-${index}`}
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className="group relative aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-border transition-all hover:ring-2 hover:ring-primary focus:outline-none focus:ring-2 focus:ring-primary"
                        aria-label={`فتح الصورة ${index + 1}`}
                      >
                        <img
                          src={optimizeImageUrl(image, { width: 500, height: 500 }) ?? image}
                          alt=""
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {isLastVisible && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-base font-bold text-white">
                            +{uniqueGallery.length - 8}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {(shop.editorialSummary || shop.reviewSummary) && (
              <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
                <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-bold">
                  <ImageIcon className="h-5 w-5 text-primary" /> ملخص سريع
                </h2>
                <div className="space-y-3 text-sm leading-7 text-muted-foreground">
                  {shop.editorialSummary && <p>{shop.editorialSummary}</p>}
                  {shop.reviewSummary && <p>{shop.reviewSummary}</p>}
                </div>
              </section>
            )}

            {(shop.reviewsSample?.length ?? 0) > 0 && (
              <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="inline-flex items-center gap-2 text-lg font-bold">
                    <Star className="h-5 w-5 text-warning" /> مراجعات Google
                  </h2>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      افتح على Google <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <ul className="space-y-3">
                  {shop.reviewsSample!.map((review, index) => (
                    <li key={`${review.authorName || "review"}-${index}`} className="rounded-2xl border border-border/60 bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-foreground">{review.authorName || "مستخدم Google"}</div>
                          {review.relativePublishTime && (
                            <div className="text-[11px] text-muted-foreground">{review.relativePublishTime}</div>
                          )}
                        </div>
                        {typeof review.rating === "number" && (
                          <div className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-xs font-bold text-warning">
                            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                            {review.rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      {review.text && <p className="mt-3 text-sm leading-7 text-muted-foreground">{review.text}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          <aside className="space-y-6">
            <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-5">
              <h2 className="mb-3 text-lg font-bold">معلومات المحل</h2>
              <div className="space-y-3 text-sm">
                {shop.address && <InfoRow label="العنوان" value={shop.address} icon={MapPin} />}
                {shop.primaryType && <InfoRow label="النوع" value={shop.primaryType} icon={Store} />}
                {shop.businessStatus && <InfoRow label="الحالة" value={shop.businessStatus} icon={ShieldCheck} />}
                {shop.lastUpdatedAt && (
                  <InfoRow label="آخر تحديث" value={new Date(shop.lastUpdatedAt).toLocaleDateString("ar-IQ")} icon={Clock} />
                )}
              </div>
            </section>

            <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-5">
              <h2 className="mb-3 text-lg font-bold">ساعات العمل</h2>
              {shop.workingHours && shop.workingHours.length > 0 ? (
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {shop.workingHours.map((line) => (
                    <li key={line} className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                      {formatHours(line)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">ما متوفرة ساعات عمل مفصلة لهذا المحل حالياً.</p>
              )}
            </section>

          </aside>
        </div>
      </main>

      <LightboxViewer
        images={uniqueGallery}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        title={shop.name}
      />

      <SiteFooter />
    </div>
  );
}

function SummaryTile({
  icon: Icon,
  value,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/85 p-4 text-center">
      <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="font-display text-2xl font-bold text-foreground">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickFlag({
  label,
  ok,
  icon: Icon,
  neutral = false,
}: {
  label: string;
  ok?: boolean | null;
  icon?: ComponentType<{ className?: string }>;
  neutral?: boolean;
}) {
  const isOk = ok === true;
  const isOff = ok === false && !neutral;
  const StatusIcon = neutral ? Minus : isOk ? CheckCircle2 : XCircle;
  return (
    <div
      className={cn(
        "group relative flex items-center gap-2 overflow-hidden rounded-2xl border px-3 py-2.5 text-xs font-bold transition-all duration-200",
        isOk && "border-success/30 bg-success/8 text-success hover:border-success/50 hover:bg-success/12 hover:shadow-soft-md",
        isOff && "border-destructive/20 bg-destructive/8 text-destructive/85 hover:border-destructive/40 hover:bg-destructive/12",
        neutral && "border-border/70 bg-background/80 text-muted-foreground hover:border-border",
      )}
    >
      {Icon && (
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110",
            isOk && "bg-success/15 text-success",
            isOff && "bg-destructive/12 text-destructive/80",
            neutral && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
      )}
      <span className="flex-1 truncate text-start">{label}</span>
      <StatusIcon
        className={cn(
          "h-3.5 w-3.5 shrink-0 opacity-70",
          isOk && "text-success",
          isOff && "text-destructive/70",
          neutral && "text-muted-foreground",
        )}
      />
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
      <div className="mb-1 inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-sm leading-6 text-foreground">{value}</div>
    </div>
  );
}
