import { useEffect, useRef, useState, type ComponentType } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MobileShopCTA } from "@/components/MobileShopCTA";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { VerifiedBadge } from "@/components/Badges";
import { useDataStore } from "@/lib/dataStore";
import { useUserPrefs } from "@/lib/userPrefs";
import { relativeArabicTime } from "@/lib/search";
import { SINAA_SHOP_PAGES } from "@/lib/sinaaShopPages";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import { getRating, topReviews } from "@/lib/googleRatings";
import { StarRating } from "@/components/StarRating";
import { cn } from "@/lib/utils";
import {
  ChevronLeft, ChevronRight, ExternalLink, MapPin, Phone, MessageCircle, Home, Store,
  Package, Globe, Camera, Image as ImageIcon, Clock, ShieldCheck, CheckCircle2,
  XCircle, Sparkles, Heart, Share2, Copy, ThumbsUp, ThumbsDown, X, Star, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";

const ENGLISH_DAY_TO_AR: Record<string, string> = {
  Monday: "الإثنين", Tuesday: "الثلاثاء", Wednesday: "الأربعاء",
  Thursday: "الخميس", Friday: "الجمعة", Saturday: "السبت", Sunday: "الأحد",
};

function formatHours(line: string): string {
  // "Monday: 9:00 AM – 5:00 PM" → "الإثنين: 9:00 ص – 5:00 م"
  const [day, ...rest] = line.split(":");
  const ar = ENGLISH_DAY_TO_AR[day.trim()] ?? day;
  const time = rest.join(":").trim()
    .replace(/AM/g, "ص").replace(/PM/g, "م").replace(/Closed/i, "مغلق");
  return `${ar}: ${time}`;
}

const ShopView = () => {
  const { shopId } = useParams<{ shopId: string }>();
  const navigate = useNavigate();
  const { shops, products, shopSources } = useDataStore();
  const { favorites, toggleFavorite } = useUserPrefs();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const handleBack = () => {
    // If user has history within the app, go back; otherwise go home.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const shop = shops.find((s) => s.id === shopId);
  const pageData = shopId ? SINAA_SHOP_PAGES[shopId] : undefined;

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <TopNav />
        <main className="flex-1 container py-12">
          <EmptyState
            title="المحل غير موجود"
            description="ربما تم دمجه مع محل آخر أو حذفه."
            action={<Button asChild variant="outline"><Link to="/">رجوع للرئيسية</Link></Button>}
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const shopProducts = products.filter((p) => p.shopId === shop.id);
  const sources = shopSources.filter((s) => s.shopId === shop.id);
  const heroImg = shop.imageUrl && shop.imageUrl !== "Not found"
    ? shop.imageUrl
    : CATEGORY_IMAGES[shop.category];
  const gallery = pageData?.gallery?.filter((g) => g && g !== "Not found") ?? [];
  const googleRating = getRating(shop);
  const topRevs = topReviews(googleRating, 4);
  const latestSource = [...sources]
    .filter((source) => source.lastCrawledAt)
    .sort((a, b) => new Date(b.lastCrawledAt!).getTime() - new Date(a.lastCrawledAt!).getTime())[0];
  const lastDataUpdatedAt = pageData?.lastUpdatedAt || shop.updatedAt || latestSource?.lastCrawledAt || null;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: shop.name, url });
      } catch {
        return;
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("نسخ الرابط");
    }
  };
  const handleCopyPhone = async () => {
    if (!shop.phone) return;
    await navigator.clipboard.writeText(shop.phone);
    toast.success("نسخ رقم الهاتف");
  };

  const isFav = favorites.has(shop.id);

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_16%,hsl(var(--surface))_100%)]">
      <TopNav />

      {/* Breadcrumbs + Back */}
      <div className="bg-background border-b border-border">
        <div className="container py-2.5 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary shrink-0"
            aria-label="رجوع للصفحة السابقة"
          >
            <ArrowRight className="h-3.5 w-3.5" />
            رجوع
          </button>
          <span className="mx-1 h-3 w-px bg-border shrink-0" />
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
            <Home className="h-3 w-3" /> الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <Link to={`/results?area=${encodeURIComponent(shop.area)}`} className="hover:text-primary">{shop.area}</Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground truncate max-w-[200px] md:max-w-none">{shop.name}</span>
        </div>
      </div>

      <main className="flex-1 container py-6 space-y-6 md:py-8">
        {/* ============ 1. HERO ============ */}
        <header className="overflow-hidden rounded-[2rem] border border-border/70 bg-card/88 shadow-soft-xl backdrop-blur-sm">
          <div className="relative h-52 sm:h-64 md:h-80 bg-muted">
            <img
              src={optimizeImageUrl(heroImg, { width: 1600, height: 600 }) ?? heroImg}
              alt={shop.name}
              className="h-full w-full object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-l from-black/25 via-transparent to-black/45" />
            <div className="absolute bottom-0 right-0 left-0 p-4 md:p-6 text-white">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/20 backdrop-blur px-2 py-0.5 text-[11px]">{shop.area}</span>
                <span className="rounded-md bg-white/20 backdrop-blur px-2 py-0.5 text-[11px]">{shop.category}</span>
                {shop.verified && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/90 px-2 py-0.5 text-[11px] font-bold">
                    <ShieldCheck className="h-3 w-3" /> محل موثّق
                  </span>
                )}
                {pageData?.businessStatus === "OPERATIONAL" && pageData?.openNow === true && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/90 px-2 py-0.5 text-[11px] font-bold">
                    <CheckCircle2 className="h-3 w-3" /> مفتوح الآن
                  </span>
                )}
                {pageData?.openNow === false && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-destructive/90 px-2 py-0.5 text-[11px] font-bold">
                    <XCircle className="h-3 w-3" /> مغلق حالياً
                  </span>
                )}
              </div>
              <h1 className="mt-2 text-xl sm:text-2xl md:text-3xl font-bold drop-shadow">{shop.name}</h1>
              {googleRating && (
                <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-black/45 px-2.5 py-1 backdrop-blur">
                  <StarRating rating={googleRating.rating} reviews={googleRating.userRatingCount} size="sm" className="[&_*]:!text-white [&_svg.fill-warning]:!fill-warning [&_svg.fill-warning]:!text-warning" />
                </div>
              )}
            </div>
          </div>

          {/* ============ 2. ACTIONS BAR ============ */}
          <div className="flex flex-wrap items-center gap-2 border-t border-border/60 p-4 md:p-5">
            {shop.googleMapsUrl && (
              <Button asChild className="gap-1.5 rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90">
                <a href={shop.googleMapsUrl} target="_blank" rel="noreferrer noopener">
                  <MapPin className="h-4 w-4" /> افتح بخرائط Google
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
                <a href={pageData?.callUrl ?? `tel:${shop.phone.replace(/\s/g, "")}`}>
                  <Phone className="h-4 w-4" /> <bdi dir="ltr">{shop.phone}</bdi>
                </a>
              </Button>
            )}
            {pageData?.whatsappUrl && (
              <Button asChild variant="outline" className="gap-1.5 rounded-full border-success/40 text-success hover:bg-success/10">
                <a href={pageData.whatsappUrl} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="h-4 w-4" /> واتساب
                </a>
              </Button>
            )}
            {shop.phone && (
              <Button variant="ghost" size="icon" className="rounded-full" onClick={handleCopyPhone} aria-label="نسخ الرقم">
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="rounded-full" onClick={handleShare} aria-label="مشاركة">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFavorite(shop.id)}
              aria-label="حفظ"
              className={cn("rounded-full", isFav && "text-primary")}
            >
              <Heart className={cn("h-4 w-4", isFav && "fill-current")} />
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-border/60 p-4 md:grid-cols-4 md:p-5">
            <SummaryTile
              icon={googleRating ? Star : ShieldCheck}
              value={googleRating ? googleRating.rating.toFixed(1) : shop.verified ? "موثّق" : "عام"}
              label={googleRating ? "تقييم Google" : "الحالة"}
            />
            <SummaryTile
              icon={Package}
              value={shopProducts.length.toLocaleString("ar")}
              label="منتج مفهرس"
            />
            <SummaryTile
              icon={Camera}
              value={`${pageData?.photosCount ?? gallery.length ?? 0}`}
              label="صورة متاحة"
            />
            <SummaryTile
              icon={Clock}
              value={lastDataUpdatedAt ? relativeArabicTime(lastDataUpdatedAt) : "—"}
              label="آخر تحديث للبيانات"
            />
          </div>
        </header>

        {/* ============ 3. QUICK DECISION STRIP ============ */}
        {pageData && (
          <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-5">
            <h2 className="mb-3 text-sm font-bold text-muted-foreground">قرار سريع</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              <QuickFlag label="موقع رسمي" ok={pageData.quickDecision.has_website} />
              <QuickFlag label="على الخرائط" ok={pageData.quickDecision.has_google_maps} />
              <QuickFlag label="صور متوفرة" ok={pageData.quickDecision.has_photos} />
              <QuickFlag label="منتجات مفهرسة" ok={pageData.quickDecision.has_indexed_products} />
              <QuickFlag label="نشط" ok={pageData.quickDecision.is_operational} />
              <QuickFlag label="موثّق" ok={pageData.quickDecision.is_verified} />
              <QuickFlag label="بيانات حديثة" ok={pageData.quickDecision.has_recent_data} />
            </div>
          </section>
        )}

        {/* Two-column layout for details + side info */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* ============ 4. GALLERY ============ */}
            {gallery.length > 0 && (
              <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
                <h2 className="mb-3 inline-flex items-center gap-2 text-lg font-bold">
                  <Camera className="h-5 w-5 text-primary" /> الصور
                  <span className="text-xs font-normal text-muted-foreground">({pageData?.photosCount ?? gallery.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {gallery.slice(0, 8).map((g, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIdx(i)}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-muted ring-1 ring-border hover:ring-primary transition-all"
                    >
                      <img
                        src={optimizeImageUrl(g, { width: 400, height: 400 }) ?? g}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ============ 4.5 GOOGLE REVIEWS ============ */}
            {googleRating && (
              <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="inline-flex items-center gap-2 text-lg font-bold">
                    <Star className="h-5 w-5 text-warning" /> تقييمات Google
                  </h2>
                  {shop.googleMapsUrl && (
                    <a
                      href={shop.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      شوف التقييمات على Google <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-background/70 p-4">
                  <div className="text-center">
                    <div className="font-display text-3xl font-bold text-foreground">
                      {googleRating.rating.toFixed(1)}
                    </div>
                    <StarRating rating={googleRating.rating} size="xs" className="mt-1" />
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {googleRating.userRatingCount.toLocaleString("en-US")} تقييم
                    </div>
                  </div>
                  {googleRating.reviewSummary && (
                    <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
                      {googleRating.reviewSummary}
                    </p>
                  )}
                </div>

                {topRevs.length > 0 ? (
                  <ul className="mt-4 space-y-3">
                    {topRevs.map((r, i) => (
                      <li key={i} className="rounded-2xl border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            {r.author_photo_url && (
                              <img
                                src={r.author_photo_url}
                                alt=""
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                className="h-7 w-7 rounded-full object-cover ring-1 ring-border"
                              />
                            )}
                            <span className="truncate text-xs font-bold">{r.author_name}</span>
                          </div>
                          <StarRating rating={r.rating} size="xs" />
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-4">
                          {r.text}
                        </p>
                        {r.relative_publish_time && (
                          <div className="mt-1.5 text-[10px] text-muted-foreground/70">
                            {r.relative_publish_time}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    ما توجد نصوص مراجعات متاحة، بس التقييم العام موجود أعلاه.
                  </p>
                )}
              </section>
            )}

            {/* ============ 5. INDEXED PRODUCTS ============ */}
            <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-lg font-bold">
                    <Package className="h-5 w-5 text-primary" /> المنتجات المفهرسة
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">الأسعار والتوفر مبنية على آخر فهرسة، مو لحظية.</p>
                </div>
                {shopProducts.length > 0 && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {shopProducts.length} منتج
                  </span>
                )}
              </div>

              {shopProducts.length === 0 ? (
                <EmptyState
                  title="بدون فهرسة منتجات"
                  description={
                    pageData?.indexedProductsEmpty ??
                    (shop.website
                      ? "ما تم استخراج منتجات لهذا المحل بعد. شغّل recrawl من الداشبورد."
                      : "هذا المحل بدون موقع، لذلك ما يظهر بفهرس البحث. متوفر فقط بدليل المحلات.")
                  }
                />
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {shopProducts.map((p) => (
                    <ProductCard key={p.id} product={{ ...p, score: 0 }} shopGoogleMapsUrl={shop.googleMapsUrl} />
                  ))}
                </div>
              )}
            </section>

            {/* ============ 6. SOURCES (collapsed for users without products) ============ */}
            {sources.length > 0 && (
              <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
                <h2 className="mb-3 text-lg font-bold">سجلات الفهرسة</h2>
                <div className="overflow-x-auto rounded-2xl border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المصدر</TableHead>
                        <TableHead>النوع</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>صفحات</TableHead>
                        <TableHead>آخر فهرسة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sources.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="max-w-[260px] truncate text-xs text-muted-foreground">{s.sourceUrl}</TableCell>
                          <TableCell className="text-xs">{s.sourceType}</TableCell>
                          <TableCell>
                            <span className={
                              s.status === "ok" ? "rounded-full bg-success/15 px-2 py-0.5 text-[11px] text-success"
                              : s.status === "failed" ? "rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] text-destructive"
                              : "rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                            }>{s.status}</span>
                          </TableCell>
                          <TableCell className="font-display text-sm">{s.pagesVisited}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {s.lastCrawledAt ? relativeArabicTime(s.lastCrawledAt) : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>
            )}
          </div>

          {/* ============ SIDE COLUMN ============ */}
          <aside className="space-y-6">
            {/* ============ 7. DETAILS & TRUST ============ */}
            <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold">
                <ShieldCheck className="h-4 w-4 text-primary" /> التفاصيل والثقة
              </h2>

              {shop.address && (
                <div className="mb-3 flex gap-2 text-xs">
                  <MapPin className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <span className="text-muted-foreground">{shop.address}</span>
                </div>
              )}

              {pageData?.workingHours && pageData.workingHours.length > 0 && (
                <div className="mb-3">
                  <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold">
                    <Clock className="h-3.5 w-3.5 text-primary" /> ساعات العمل
                  </div>
                  <ul className="space-y-1 text-[11px] text-muted-foreground">
                    {pageData.workingHours.map((h, i) => (
                      <li key={i} className="flex justify-between gap-2 border-b border-border/50 last:border-0 py-1">
                        <span>{formatHours(h)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!pageData?.workingHours?.length && !shop.address && (
                <p className="text-xs text-muted-foreground">لا توجد تفاصيل إضافية.</p>
              )}
            </section>

            {/* ============ 9. FRESHNESS ============ */}
            {pageData?.freshnessSummary && (
              <section className="rounded-[1.5rem] border border-border/70 bg-card/70 p-3 shadow-soft md:p-4">
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">آخر تحديث:</span> {pageData.freshnessSummary}
                </div>
              </section>
            )}
          </aside>
        </div>

        {/* ============ 10. SIMILAR STORES ============ */}
        {pageData?.similarStores && pageData.similarStores.length > 0 && (
          <section className="rounded-[1.75rem] border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
            <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-bold">
              <Store className="h-5 w-5 text-primary" /> محلات مشابهة
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {pageData.similarStores.map((s, i) => {
                // Try to find the matching shop in our store
                const target = shops.find((x) => x.slug === s.slug);
                const href = target ? `/shop-view/${target.id}` : `/results?q=${encodeURIComponent(s.name)}`;
                const img = s.mainImage && s.mainImage !== "Not found"
                  ? s.mainImage
                  : CATEGORY_IMAGES[shop.category];
                return (
                  <Link
                    key={i}
                    to={href}
                    className="group rounded-lg border border-border bg-background overflow-hidden hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img
                        src={optimizeImageUrl(img, { width: 300, height: 300 }) ?? img}
                        alt={s.name}
                        loading="lazy"
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="p-2">
                      <div className="line-clamp-2 text-[11px] font-bold leading-tight">{s.name}</div>
                      {s.hasWebsite && (
                        <div className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-success">
                          <Globe className="h-2.5 w-2.5" /> موقع
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      {/* Lightbox */}
      {lightboxIdx !== null && gallery[lightboxIdx] && (
        <Lightbox
          images={gallery}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onChange={setLightboxIdx}
        />
      )}

      <SiteFooter />

      {/* Mobile sticky CTA — call / WhatsApp / map / favorite */}
      <MobileShopCTA
        phone={shop.phone}
        callUrl={pageData?.callUrl}
        mapsUrl={shop.googleMapsUrl}
        whatsappUrl={pageData?.whatsappUrl}
        isFavorite={isFav}
        onToggleFavorite={() => toggleFavorite(shop.id)}
      />
    </div>
  );
};

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
    <div className="rounded-2xl border border-border/60 bg-background/75 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="font-display text-xl font-bold text-foreground">{value}</div>
      </div>
      <div className="mt-2 text-[11px] leading-5 text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickFlag({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-[11px]",
      ok ? "border-success/30 bg-success/5 text-success" : "border-border bg-muted/30 text-muted-foreground"
    )}>
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0 opacity-50" />}
      <span className="truncate">{label}</span>
    </div>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onChange,
}: {
  images: string[];
  index: number;
  onClose: () => void;
  onChange: (i: number) => void;
}) {
  const total = images.length;
  const go = (delta: number) => onChange((index + delta + total) % total);

  // Keyboard navigation: ←/→ to navigate, Esc to close.
  // RTL note: in Arabic UI, ArrowRight = previous, ArrowLeft = next.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(1);
      else if (e.key === "ArrowRight") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, total]);

  // Touch swipe support for mobile.
  // RTL note: swipe-left = next image, swipe-right = previous image.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const SWIPE_THRESHOLD = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    if (total < 2) return;
    if (dx < 0) go(1);   // swipe left → next
    else go(-1);         // swipe right → previous
  };

  // Auto-scroll active thumbnail into view
  const thumbsRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = thumbsRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLButtonElement>(`[data-idx="${index}"]`);
    active?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [index]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Close */}
      <button
        className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="إغلاق"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Counter */}
      {total > 1 && (
        <div className="absolute top-4 left-4 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white">
          {index + 1} / {total}
        </div>
      )}

      {/* Prev (RTL: arrow on the right means "previous") - hidden on mobile (use swipe) */}
      {total > 1 && (
        <button
          className="hidden md:flex absolute right-2 md:right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors active:scale-95"
          onClick={(e) => { e.stopPropagation(); go(-1); }}
          aria-label="السابق"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      <img
        src={images[index]}
        alt=""
        className="max-h-full max-w-full rounded-lg object-contain select-none"
        draggable={false}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Next (RTL: arrow on the left means "next") - hidden on mobile (use swipe) */}
      {total > 1 && (
        <button
          className="hidden md:flex absolute left-2 md:left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 transition-colors active:scale-95"
          onClick={(e) => { e.stopPropagation(); go(1); }}
          aria-label="التالي"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}

      {/* Thumbnails strip */}
      {total > 1 && (
        <div
          className="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-[95vw]"
          onClick={(e) => e.stopPropagation()}
        >
          <div ref={thumbsRef} className="flex gap-2 overflow-x-auto px-2 py-2 rounded-xl bg-white/5 backdrop-blur-sm scrollbar-thin">
            {images.map((src, i) => (
              <button
                key={i}
                data-idx={i}
                onClick={() => onChange(i)}
                className={`relative shrink-0 h-14 w-14 md:h-16 md:w-16 overflow-hidden rounded-md transition-all ${
                  i === index
                    ? "ring-2 ring-white opacity-100 scale-105"
                    : "ring-1 ring-white/20 opacity-60 hover:opacity-100"
                }`}
                aria-label={`الصورة ${i + 1}`}
                aria-current={i === index}
              >
                <img src={src} alt="" className="h-full w-full object-cover" draggable={false} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopView;
