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
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
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

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;
    const handler = (e: KeyboardEvent) => {
      const total = data?.stores.find((s) => s.id === shopId || s.place_id === shopId)?.gallery?.length ?? 0;
      if (total === 0) return;
      if (e.key === "Escape") setLightboxIndex(null);
      if (e.key === "ArrowLeft") setLightboxIndex((i) => (i! + 1) % total);
      if (e.key === "ArrowRight") setLightboxIndex((i) => (i! - 1 + total) % total);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightboxIndex, data, shopId]);

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
          <div className="relative h-56 sm:h-72 md:h-80 bg-muted">
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
                  <Phone className="h-4 w-4" /> {shop.phone}
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

        {!!shop.quickSignals && (
          <section className="relative overflow-hidden rounded-[1.75rem] border border-border/70 bg-card/82 p-5 shadow-soft-lg backdrop-blur-sm md:p-6">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" aria-hidden />
            <div className="relative mb-4 flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-sm font-bold tracking-tight text-foreground">إشارات سريعة</h2>
              </div>
              <span className="text-[11px] font-medium text-muted-foreground">حالة المتجر في لمحة</span>
            </div>
            <div className="relative grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
              <QuickFlag label="موقع" icon={Globe} ok={shop.quickSignals.has_website} />
              <QuickFlag label="خرائط" icon={MapPin} ok={shop.quickSignals.has_google_maps} />
              <QuickFlag label="تقييم" icon={Star} ok={shop.quickSignals.has_rating} />
              <QuickFlag label="مراجعات" icon={MessageSquare} ok={shop.quickSignals.has_reviews} />
              <QuickFlag label="صور" icon={Camera} ok={shop.quickSignals.has_photos} />
              <QuickFlag label="نشط" icon={Activity} ok={shop.quickSignals.business_status === "OPERATIONAL"} />
              <QuickFlag label="مفتوح الآن" icon={DoorOpen} ok={shop.quickSignals.open_now === true} neutral={shop.quickSignals.open_now === null} />
            </div>
          </section>
        )}

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

      <Dialog open={lightboxIndex !== null} onOpenChange={(open) => !open && setLightboxIndex(null)}>
        <DialogContent
          className="max-w-6xl gap-0 border-0 bg-transparent p-0 shadow-none [&>button]:hidden sm:rounded-none"
        >
          <DialogTitle className="sr-only">معرض صور {shop.name}</DialogTitle>
          {lightboxIndex !== null && uniqueGallery[lightboxIndex] && (
            <div className="relative flex flex-col">
              {/* Top bar */}
              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
                <div className="flex items-center gap-2.5 text-white">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
                    <Camera className="h-4 w-4" />
                  </div>
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm font-semibold truncate max-w-[60vw]">{shop.name}</span>
                    <span className="text-[11px] text-white/70 font-numeric tabular-nums">
                      {lightboxIndex + 1} / {uniqueGallery.length}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLightboxIndex(null)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:scale-105 active:scale-95"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Image stage */}
              <div className="relative flex items-center justify-center bg-black/95 sm:rounded-2xl overflow-hidden">
                <img
                  key={lightboxIndex}
                  src={optimizeImageUrl(uniqueGallery[lightboxIndex], { width: 1600, height: 1200 }) ?? uniqueGallery[lightboxIndex]}
                  alt={`${shop.name} - صورة ${lightboxIndex + 1}`}
                  className="max-h-[80vh] w-full object-contain animate-in fade-in zoom-in-95 duration-300"
                  referrerPolicy="no-referrer"
                />

                {uniqueGallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex((i) => (i! - 1 + uniqueGallery.length) % uniqueGallery.length)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md ring-1 ring-white/20 transition-all duration-200 hover:bg-white/25 hover:scale-110 active:scale-95"
                      aria-label="السابق"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLightboxIndex((i) => (i! + 1) % uniqueGallery.length)}
                      className="absolute left-4 top-1/2 -translate-y-1/2 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md ring-1 ring-white/20 transition-all duration-200 hover:bg-white/25 hover:scale-110 active:scale-95"
                      aria-label="التالي"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {uniqueGallery.length > 1 && (
                <div className="mt-3 flex justify-center">
                  <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-black/60 p-1.5 backdrop-blur-md ring-1 ring-white/10">
                    {uniqueGallery.map((image, index) => (
                      <button
                        key={`${image}-thumb-${index}`}
                        type="button"
                        onClick={() => setLightboxIndex(index)}
                        className={cn(
                          "relative h-12 w-16 shrink-0 overflow-hidden rounded-md transition-all duration-200",
                          index === lightboxIndex
                            ? "ring-2 ring-primary opacity-100 scale-105"
                            : "opacity-50 hover:opacity-90 ring-1 ring-white/15",
                        )}
                        aria-label={`الصورة ${index + 1}`}
                      >
                        <img
                          src={optimizeImageUrl(image, { width: 160, height: 120 }) ?? image}
                          alt=""
                          className="h-full w-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

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
