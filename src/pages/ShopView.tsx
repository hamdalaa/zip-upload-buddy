import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { VerifiedBadge } from "@/components/Badges";
import { useDataStore } from "@/lib/dataStore";
import { useUserPrefs } from "@/lib/userPrefs";
import { useStoreProductsQuery, useStoreSummaryQuery } from "@/lib/catalogQueries";
import { relativeArabicTime } from "@/lib/search";
import { ShopViewSkeleton } from "@/components/skeletons/PageSkeletons";
import { BackendErrorState } from "@/components/BackendErrorState";
import type { ShopPageData } from "@/lib/sinaaShopPages";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { OFFICIAL_DEALER_BRANCHES } from "@/lib/officialDealers";
import { getFallbackProductImage } from "@/lib/productVisuals";
import { StarRating } from "@/components/StarRating";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { cn } from "@/lib/utils";
import { breadcrumbJsonLd, localBusinessJsonLd, truncateMeta } from "@/lib/seo";
import type { Shop } from "@/lib/types";
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
  const [scrolled, setScrolled] = useState(false);
  const [visibleProductCount, setVisibleProductCount] = useState(24);
  const [legacyFallback, setLegacyFallback] = useState<{ shop: Shop; pageData?: ShopPageData } | null>(null);
  const [legacyLookupStatus, setLegacyLookupStatus] = useState<"idle" | "loading" | "done">("idle");
  const officialDealerShop = useMemo(() => (shopId ? mapOfficialDealerBranchToShop(shopId) : null), [shopId]);
  const legacyShop = legacyFallback?.shop ?? null;
  const storeSummaryQuery = useStoreSummaryQuery(!officialDealerShop ? shopId : undefined);
  const storeProductsQuery = useStoreProductsQuery(!officialDealerShop ? shopId : undefined, visibleProductCount, 0);

  useEffect(() => {
    setLegacyFallback(null);
    setLegacyLookupStatus("idle");
  }, [shopId]);

  useEffect(() => {
    if (!shopId || officialDealerShop || legacyFallback || !storeSummaryQuery.isError || legacyLookupStatus !== "idle") return;
    let cancelled = false;
    setLegacyLookupStatus("loading");

    Promise.all([
      import("@/lib/legacyStreetShops"),
      import("@/lib/sinaaShopPages"),
    ])
      .then(([legacyModule, pageModule]) => {
        if (cancelled) return;
        const shop = legacyModule.getLegacySinaaShopById(shopId);
        setLegacyFallback(shop ? { shop, pageData: pageModule.SINAA_SHOP_PAGES[shopId] } : null);
      })
      .finally(() => {
        if (!cancelled) setLegacyLookupStatus("done");
      });

    return () => {
      cancelled = true;
    };
  }, [shopId, officialDealerShop, legacyFallback, legacyLookupStatus, storeSummaryQuery.isError]);

  // Detect scroll past hero so we can elevate the actions bar (sticky context).
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 280);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleBack = () => {
    // If user has history within the app, go back; otherwise go home.
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const localShop = shops.find((s) => s.id === shopId) ?? legacyShop ?? officialDealerShop;
  const remoteSummary = legacyShop ? undefined : storeSummaryQuery.data;
  const remoteProducts = legacyShop ? undefined : storeProductsQuery.data;
  const shop = remoteSummary?.store ?? localShop;
  const pageData = legacyFallback?.pageData;
  const detailStatus =
    (!shopId || legacyShop || officialDealerShop)
      ? "idle"
      : (storeSummaryQuery.isLoading || legacyLookupStatus === "loading" || (storeSummaryQuery.isError && legacyLookupStatus === "idle")) && !remoteSummary
        ? "loading"
        : !shop
          ? "not_found"
          : "ready";

  if (!shop && detailStatus === "loading") {
    return <ShopViewSkeleton />;
  }

  if (!shop && (storeSummaryQuery.isError || storeProductsQuery.isError) && legacyLookupStatus !== "done") {
    return (
      <BackendErrorState
        title="تعذّر تحميل بيانات المحل"
        description="ما گدرنا نجيب تفاصيل هذا المحل من السيرفر. تأكد من الإنترنت وجرّب مرة لخ."
        error={(storeSummaryQuery.error as Error | null) ?? (storeProductsQuery.error as Error | null)}
        onRetry={() => {
          void storeSummaryQuery.refetch();
          void storeProductsQuery.refetch();
        }}
      />
    );
  }

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

  const relatedShopIds = shop.website
    ? shops
        .filter((candidate) => sameWebsiteHost(candidate.website, shop.website))
        .map((candidate) => candidate.id)
    : [];
  const shopProducts =
    legacyShop
      ? []
      : remoteProducts?.items ?? products.filter((p) => p.shopId === shop.id || relatedShopIds.includes(p.shopId));
  const totalShopProducts = remoteProducts?.total ?? shopProducts.length;
  const sources = legacyShop
    ? [
        ...(shop.website
          ? [{
              id: `src:${shop.id}:website`,
              shopId: shop.id,
              sourceType: "website" as const,
              sourceUrl: shop.website,
              status: "ok" as const,
              lastCrawledAt: shop.updatedAt,
              pagesVisited: 0,
            }]
          : []),
        ...(shop.googleMapsUrl
          ? [{
              id: `src:${shop.id}:maps`,
              shopId: shop.id,
              sourceType: "google_maps" as const,
              sourceUrl: shop.googleMapsUrl,
              status: "ok" as const,
              lastCrawledAt: shop.updatedAt,
              pagesVisited: 1,
            }]
          : []),
      ]
    : [
        ...(shop.website
          ? [{
              id: `src:${shop.id}:website`,
              shopId: shop.id,
              sourceType: "website" as const,
              sourceUrl: shop.website,
              status:
                shop.sourceStatus === "indexed"
                  ? "ok" as const
                  : shop.sourceStatus === "failed" || shop.sourceStatus === "blocked"
                    ? "failed" as const
                    : "pending" as const,
              lastCrawledAt: remoteSummary?.size?.lastSuccessfulSyncAt ?? shop.lastSyncAt ?? shop.updatedAt,
              pagesVisited: remoteSummary?.size?.estimatedCatalogSize ?? totalShopProducts,
            }]
          : []),
        ...(shop.googleMapsUrl
          ? [{
              id: `src:${shop.id}:maps`,
              shopId: shop.id,
              sourceType: "google_maps" as const,
              sourceUrl: shop.googleMapsUrl,
              status: "ok" as const,
              lastCrawledAt: shop.updatedAt,
              pagesVisited: 1,
            }]
          : []),
        ...shopSources.filter((s) => s.shopId === shop.id),
      ].filter((source, index, all) => all.findIndex((entry) => entry.id === source.id) === index);
  const heroImg = shop.imageUrl && shop.imageUrl !== "Not found"
    ? shop.imageUrl
    : getFallbackProductImage(shop.category);
  const shopPath = `/shop-view/${encodeURIComponent(shop.id)}`;
  const shopDescription = truncateMeta(
    `${shop.name} في ${shop.area}${shop.cityAr ? `، ${shop.cityAr}` : ""}. ${totalShopProducts.toLocaleString("en-US")} منتج مفهرس، ${shop.phone ? `رقم الهاتف ${shop.phone}، ` : ""}وروابط خرائط وموقع المتجر داخل حاير.`,
  );
  const gallery = pageData?.gallery?.filter((g) => g && g !== "Not found")
    ?? shop.gallery?.filter((g) => g && g !== "Not found")
    ?? [];
  const googleRating =
    typeof shop.rating === "number" && shop.rating > 0
      ? {
          rating: shop.rating,
          userRatingCount: shop.reviewCount ?? 0,
          reviews: (shop.reviewsSample ?? []).filter((review) => review?.text?.trim()),
          editorialSummary: shop.editorialSummary,
          reviewSummary: shop.reviewSummary,
        }
      : null;
  const topRevs = [...(googleRating?.reviews ?? [])].slice(0, 4);
  const latestSource = [...sources]
    .filter((source) => source.lastCrawledAt)
    .sort((a, b) => new Date(b.lastCrawledAt!).getTime() - new Date(a.lastCrawledAt!).getTime())[0];
  const lastDataUpdatedAt = pageData?.lastUpdatedAt || remoteSummary?.size?.lastSuccessfulSyncAt || shop.updatedAt || latestSource?.lastCrawledAt || null;

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
      <Seo
        title={`${shop.name} — محل إلكترونيات في ${shop.area}`}
        description={shopDescription}
        path={shopPath}
        image={heroImg}
        structuredData={[
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: shop.area, path: shop.area === "شارع الربيعي" ? "/rubaie" : "/sinaa" },
            { name: shop.name, path: shopPath },
          ]),
          localBusinessJsonLd(shop, shopPath, heroImg),
        ]}
      />
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

      <main className="flex-1 container py-4 space-y-5 pb-24 md:py-8 md:pb-8 md:space-y-6">
        {/* ============ 1. HERO ============ */}
        <header className="overflow-hidden rounded-3xl border border-border/70 bg-card/88 shadow-soft-xl backdrop-blur-sm reveal-init reveal-on">
          <div className="group relative h-44 sm:h-72 md:h-96 bg-muted overflow-hidden">
            <img
              src={optimizeImageUrl(heroImg, { width: 1600, height: 600 }) ?? heroImg}
              alt={shop.name}
              className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-105"
              loading="eager"
              fetchPriority="high"
            />
            {/* Layered gradients for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-l from-black/30 via-transparent to-black/50" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            <div className="absolute bottom-0 right-0 left-0 p-3 sm:p-4 md:p-7 text-white">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px]">
                  <MapPin className="h-3 w-3" /> {shop.area}
                </span>
                <span className="rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-[11px]">{shop.category}</span>
                {shop.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/90 ring-1 ring-white/30 px-2 py-0.5 text-[10px] font-bold shadow-[0_4px_18px_-4px_hsl(var(--success)/0.55)] sm:px-2.5 sm:py-1 sm:text-[11px]">
                    <ShieldCheck className="h-3 w-3" /> محل موثّق
                  </span>
                )}
                {pageData?.businessStatus === "OPERATIONAL" && pageData?.openNow === true && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success/90 ring-1 ring-white/30 px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-[11px]">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
                      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
                    </span>
                    مفتوح الآن
                  </span>
                )}
                {pageData?.openNow === false && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-destructive/90 ring-1 ring-white/30 px-2 py-0.5 text-[10px] font-bold sm:px-2.5 sm:py-1 sm:text-[11px]">
                    <XCircle className="h-3 w-3" /> مغلق حالياً
                  </span>
                )}
              </div>
              <h1 className="mt-2 font-display text-xl sm:text-3xl md:text-4xl font-bold leading-tight tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)] line-clamp-2 sm:line-clamp-none">
                {shop.name}
              </h1>
              {googleRating && (
                <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/45 ring-1 ring-white/15 px-2.5 py-1 backdrop-blur-md sm:mt-2.5 sm:px-3 sm:py-1.5">
                  <StarRating rating={googleRating.rating} reviews={googleRating.userRatingCount} size="sm" className="[&_*]:!text-white [&_svg.fill-warning]:!fill-warning [&_svg.fill-warning]:!text-warning" />
                </div>
              )}
            </div>
          </div>

          {/* ============ 2. ACTIONS BAR ============ */}
          <div
            className={cn(
              "flex items-center gap-1.5 border-t border-border/60 p-2.5 transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 overflow-x-auto whitespace-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:whitespace-normal sm:gap-2 sm:p-4 md:p-5",
              scrolled ? "bg-card/95 backdrop-blur-md shadow-soft-md" : "bg-transparent",
            )}
          >
            {shop.googleMapsUrl && (
              <Button asChild size="sm" className="btn-ripple h-9 shrink-0 gap-1.5 rounded-full bg-primary px-3.5 text-xs text-primary-foreground shadow-[0_6px_20px_-6px_hsl(var(--primary)/0.55)] transition-transform hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.96] sm:h-10 sm:px-5 sm:text-sm">
                <a href={shop.googleMapsUrl} target="_blank" rel="noreferrer noopener">
                  <MapPin className="h-4 w-4" /> خرائط Google
                </a>
              </Button>
            )}
            {shop.website && (
              <Button asChild variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 rounded-full px-3 text-xs transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] hover:border-primary hover:text-primary hover:scale-[1.02] active:scale-[0.96] sm:h-10 sm:px-4 sm:text-sm">
                <a href={shop.website} target="_blank" rel="noreferrer noopener">
                  <Globe className="h-4 w-4" /> الموقع
                </a>
              </Button>
            )}
            {shop.phone && (
              <Button asChild variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 rounded-full px-3 text-xs transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] hover:border-primary hover:text-primary hover:scale-[1.02] active:scale-[0.96] sm:h-10 sm:px-4 sm:text-sm">
                <a
                  href={`https://wa.me/${shop.phone.replace(/\D/g, "").replace(/^0/, "964")}`}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <MessageCircle className="h-4 w-4" /> <bdi dir="ltr">{shop.phone}</bdi>
                </a>
              </Button>
            )}
            {pageData?.whatsappUrl && (
              <Button asChild variant="outline" size="sm" className="h-9 shrink-0 gap-1.5 rounded-full border-success/40 px-3 text-xs text-success transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] hover:bg-success/10 hover:scale-[1.02] active:scale-[0.96] sm:h-10 sm:px-4 sm:text-sm">
                <a href={pageData.whatsappUrl} target="_blank" rel="noreferrer noopener">
                  <MessageCircle className="h-4 w-4" /> واتساب
                </a>
              </Button>
            )}
            <div className="ms-auto flex shrink-0 items-center gap-0.5 ps-1 sm:gap-1 sm:ps-0">
            {shop.phone && (
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full transition-transform hover:scale-110 active:scale-[0.96] sm:h-10 sm:w-10" onClick={handleCopyPhone} aria-label="نسخ الرقم">
                <Copy className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 rounded-full transition-transform hover:scale-110 active:scale-[0.96] sm:h-10 sm:w-10" onClick={handleShare} aria-label="مشاركة">
              <Share2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleFavorite(shop.id)}
              aria-label="حفظ"
              className={cn("h-9 w-9 shrink-0 rounded-full transition-transform hover:scale-110 active:scale-[0.96] sm:h-10 sm:w-10", isFav && "text-primary")}
            >
              <Heart className={cn("h-4 w-4 transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter]", isFav && "fill-current scale-110")} />
            </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-border/40 md:grid-cols-4 [direction:ltr]">
            <SummaryTile
              icon={googleRating ? Star : ShieldCheck}
              value={googleRating ? googleRating.rating.toFixed(1) : shop.verified ? "موثّق" : "عام"}
              label={googleRating ? "تقييم Google" : "الحالة"}
              accent={googleRating ? "warning" : "success"}
            />
            <SummaryTile
              icon={Package}
              value={totalShopProducts.toLocaleString("ar")}
              label="منتج مفهرس"
              accent="primary"
            />
            <SummaryTile
              icon={Camera}
              value={`${pageData?.photosCount ?? gallery.length ?? 0}`}
              label="صورة متاحة"
              accent="accent"
            />
            <SummaryTile
              icon={Clock}
              value={lastDataUpdatedAt ? relativeArabicTime(lastDataUpdatedAt) : "—"}
              label="آخر تحديث للبيانات"
              accent="muted"
            />
          </div>
        </header>

        {/* ============ 3. QUICK DECISION STRIP ============ */}
        {pageData && (
          <section className="reveal-init reveal-on rounded-2xl border border-border/70 bg-card/82 p-3 shadow-soft-lg backdrop-blur-sm sm:rounded-3xl sm:p-4 md:p-5">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> قرار سريع
            </h2>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-7">
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
              <section className="reveal-init reveal-on rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
                <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-bold tracking-tight">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Camera className="h-4 w-4" />
                  </span>
                  الصور
                  <span className="text-xs font-normal text-muted-foreground">({pageData?.photosCount ?? gallery.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {gallery.slice(0, 8).map((g, i) => (
                    <button
                      key={i}
                      onClick={() => setLightboxIdx(i)}
                      className="group relative aspect-square overflow-hidden rounded-xl bg-muted ring-1 ring-border transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 hover:ring-2 hover:ring-primary hover:shadow-soft-md hover:-translate-y-0.5"
                    >
                      <img
                        src={optimizeImageUrl(g, { width: 400, height: 400 }) ?? g}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="absolute bottom-2 right-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-foreground opacity-0 backdrop-blur-sm transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 group-hover:opacity-100">
                        <ImageIcon className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ============ 4.5 GOOGLE REVIEWS ============ */}
            {googleRating && (
              <section className="overflow-hidden rounded-3xl border border-border/70 bg-card/82 shadow-soft-lg backdrop-blur-sm">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-l from-warning/5 to-transparent px-4 py-3.5 md:px-6">
                  <h2 className="inline-flex items-center gap-2 text-base font-bold sm:text-lg">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 text-warning">
                      <Star className="h-4 w-4 fill-warning" />
                    </span>
                    تقييمات Google
                  </h2>
                  {shop.googleMapsUrl && (
                    <a
                      href={shop.googleMapsUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-[11px] font-semibold text-primary transition-colors hover:bg-primary/15"
                    >
                      شوف الكل <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <div className="space-y-4 p-4 md:p-6">
                  {/* Rating summary */}
                  <div className="flex items-stretch gap-3 rounded-2xl border border-border/60 bg-gradient-to-br from-background to-muted/30 p-3 sm:gap-4 sm:p-4">
                    <div className="flex flex-col items-center justify-center border-l border-border/60 pl-3 text-center sm:pl-4">
                      <div className="font-display text-3xl font-bold leading-none text-foreground sm:text-4xl">
                        {googleRating.rating.toFixed(1)}
                      </div>
                      <StarRating rating={googleRating.rating} size="xs" className="mt-1.5" />
                      <div className="mt-1.5 font-numeric text-[10px] tabular-nums text-muted-foreground">
                        {googleRating.userRatingCount.toLocaleString("en-US")} تقييم
                      </div>
                    </div>
                    {googleRating.reviewSummary ? (
                      <p className="flex-1 self-center text-[11px] leading-relaxed text-muted-foreground line-clamp-5 sm:text-sm sm:line-clamp-none">
                        {googleRating.reviewSummary}
                      </p>
                    ) : (
                      <p className="flex-1 self-center text-[11px] leading-relaxed text-muted-foreground/70 sm:text-xs">
                        تقييمات الزبائن من Google Maps
                      </p>
                    )}
                  </div>

                  {/* Reviews list */}
                  {topRevs.length > 0 ? (
                    <ul className="space-y-2.5">
                      {topRevs.map((r, i) => (
                        <li
                          key={i}
                          className="group rounded-2xl border border-border/60 bg-background p-3.5 transition-colors hover:border-border hover:bg-muted/20"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2.5">
                              {r.authorPhotoUrl ? (
                                <img
                                  src={r.authorPhotoUrl}
                                  alt=""
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  className="h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border"
                                />
                              ) : (
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                                  {r.authorName?.[0] ?? "?"}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="truncate text-xs font-bold text-foreground sm:text-sm">{r.authorName}</div>
                                {r.relativePublishTime && (
                                  <div className="text-[10px] text-muted-foreground/70">
                                    {r.relativePublishTime}
                                  </div>
                                )}
                              </div>
                            </div>
                            <StarRating rating={r.rating} size="xs" />
                          </div>
                          <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground line-clamp-4 sm:text-[13px]">
                            {r.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      ما توجد نصوص مراجعات متاحة، بس التقييم العام موجود أعلاه.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* ============ 5. INDEXED PRODUCTS ============ */}
            <section className="reveal-init reveal-on rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
              <div className="mb-5 flex items-end justify-between gap-3">
                <div>
                  <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Package className="h-4 w-4" />
                    </span>
                    المنتجات المفهرسة
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">الأسعار والتوفر مبنية على آخر فهرسة، مو لحظية.</p>
                </div>
                {totalShopProducts > 0 && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary ring-1 ring-primary/20">
                    {totalShopProducts} منتج
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
                <>
                  <div className="mx-auto grid w-full max-w-[25rem] grid-cols-1 gap-3 sm:max-w-none sm:grid-cols-2">
                    {shopProducts.map((p) => (
                      <ProductCard key={p.id} product={{ ...p, score: 0 }} shopGoogleMapsUrl={shop.googleMapsUrl} />
                    ))}
                  </div>
                  {shopId && totalShopProducts > shopProducts.length && (
                    <div className="mt-5 flex justify-center">
                      <Button
                        variant="outline"
                        onClick={() => setVisibleProductCount((count) => count + 24)}
                        disabled={storeProductsQuery.isFetching}
                      >
                        {storeProductsQuery.isFetching ? "جارٍ التحميل..." : "عرض المزيد"}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>

            {/* ============ 6. SOURCES (collapsed for users without products) ============ */}
            {sources.length > 0 && (
              <section className="rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
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
            <section className="reveal-init reveal-on rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-5">
              <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold tracking-tight">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <ShieldCheck className="h-3.5 w-3.5" />
                </span>
                التفاصيل والثقة
              </h2>

              {shop.address && (
                <div className="mb-3 flex gap-2 rounded-xl border border-border/50 bg-background/50 p-2.5 text-xs">
                  <MapPin className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                  <span className="text-foreground/80">{shop.address}</span>
                </div>
              )}

              {pageData?.workingHours && pageData.workingHours.length > 0 && (
                <div className="mb-3">
                  <div className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold">
                    <Clock className="h-3.5 w-3.5 text-primary" /> ساعات العمل
                  </div>
                  <ul className="space-y-0.5 text-[11px] text-muted-foreground rounded-xl border border-border/50 bg-background/40 px-3">
                    {pageData.workingHours.map((h, i) => (
                      <li key={i} className="flex justify-between gap-2 border-b border-border/30 last:border-0 py-1.5">
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
              <section className="rounded-2xl border border-border/70 bg-card/70 p-3 shadow-soft md:p-4">
                <div className="text-[11px] text-muted-foreground leading-relaxed">
                  <span className="font-bold text-foreground">آخر تحديث:</span> {pageData.freshnessSummary}
                </div>
              </section>
            )}
          </aside>
        </div>

        {/* ============ 10. SIMILAR STORES ============ */}
        {pageData?.similarStores && pageData.similarStores.length > 0 && (
          <section className="reveal-init reveal-on rounded-3xl border border-border/70 bg-card/82 p-4 shadow-soft-lg backdrop-blur-sm md:p-6">
            <h2 className="mb-4 inline-flex items-center gap-2 text-lg font-bold tracking-tight">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Store className="h-4 w-4" />
              </span>
              محلات مشابهة
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {pageData.similarStores.map((s, i) => {
                // Try to find the matching shop in our store
                const target = shops.find((x) => x.slug === s.slug);
                const href = target ? `/shop-view/${target.id}` : `/results?q=${encodeURIComponent(s.name)}`;
                const img = s.mainImage && s.mainImage !== "Not found"
                  ? s.mainImage
                  : getFallbackProductImage(shop.category);
                return (
                  <Link
                    key={i}
                    to={href}
                    className="group rounded-xl border border-border bg-background overflow-hidden transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 hover:border-primary/60 hover:shadow-soft-md hover:-translate-y-1"
                  >
                    <div className="aspect-square bg-muted overflow-hidden">
                      <img
                        src={optimizeImageUrl(img, { width: 300, height: 300 }) ?? img}
                        alt={s.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <div className="p-2.5">
                      <div className="line-clamp-2 text-[11px] font-bold leading-tight transition-colors group-hover:text-primary">{s.name}</div>
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

    </div>
  );
};

function SummaryTile({
  icon: Icon,
  value,
  label,
  accent = "primary",
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  label: string;
  accent?: "primary" | "warning" | "success" | "accent" | "muted";
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    warning: "text-warning",
    success: "text-success",
    accent: "text-accent-foreground",
    muted: "text-muted-foreground",
  };
  return (
    <div className="group relative flex items-start gap-3 px-4 py-5 transition-colors hover:bg-muted/30 sm:px-6 sm:py-6 [direction:rtl]">
      <span className={cn(
        "mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted/50 transition-colors group-hover:bg-muted",
        tones[accent],
      )}>
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[11px] font-medium tracking-tight text-muted-foreground">
          {label}
        </span>
        <span className="font-display text-[22px] font-semibold leading-none tracking-tight text-foreground tabular-nums sm:text-[26px]">
          {value}
        </span>
      </div>
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
          className="absolute right-2 md:right-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 md:p-3 text-white backdrop-blur-md hover:bg-white/20 transition-colors active:scale-[0.96]"
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
          className="absolute left-2 md:left-6 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 md:p-3 text-white backdrop-blur-md hover:bg-white/20 transition-colors active:scale-[0.96]"
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
                className={`relative shrink-0 h-14 w-14 md:h-16 md:w-16 overflow-hidden rounded-md transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] ${
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

function mapOfficialDealerBranchToShop(shopId: string): Shop | null {
  const branch = OFFICIAL_DEALER_BRANCHES.find((entry) => entry.id === shopId);
  if (!branch) return null;
  const timestamp = new Date().toISOString();
  return {
    id: branch.id,
    slug: branch.slug,
    seedKey: `official-${branch.brandSlug}-${branch.id}`,
    name: branch.name,
    area: branch.area,
    category: branch.category,
    categories: branch.categories,
    address: branch.address || undefined,
    lat: branch.lat ?? undefined,
    lng: branch.lng ?? undefined,
    googleMapsUrl: branch.googleMapsUrl ?? undefined,
    website: branch.website ?? undefined,
    phone: branch.phone ?? undefined,
    imageUrl: branch.mainImage ?? undefined,
    discoverySource: "seed",
    verified: true,
    verificationStatus: "verified",
    notes: `وكيل رسمي معتمد من ${branch.brand}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    featured: true,
  };
}

function sameWebsiteHost(left?: string, right?: string): boolean {
  if (!left || !right) return false;
  try {
    const leftHost = new URL(left).hostname.replace(/^www\./i, "").toLowerCase();
    const rightHost = new URL(right).hostname.replace(/^www\./i, "").toLowerCase();
    return leftHost === rightHost;
  } catch {
    return false;
  }
}
