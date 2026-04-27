import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Award,
  Check,
  ChevronLeft,
  ExternalLink,
  Heart,
  Package,
  Share2,
  ShieldCheck,
  Star,
  Store as StoreIcon,
  TrendingDown,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";
import { useProductFullQuery } from "@/lib/catalogQueries";
import { cn } from "@/lib/utils";
import type { UnifiedOffer } from "@/lib/unifiedSearch";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { getProductImageNotFound, getRenderableProductImageCandidates, isRenderableProductImage } from "@/lib/productVisuals";
import { decodeHtmlEntities } from "@/lib/textDisplay";
import { ProductDetailSkeleton } from "@/components/skeletons/PageSkeletons";
import { BackendErrorState } from "@/components/BackendErrorState";
import { StickyBuyBar } from "@/components/product/StickyBuyBar";
import { TrustBadges } from "@/components/product/TrustBadges";
import { ReviewsBlock } from "@/components/product/ReviewsBlock";
import { useSequentialImage } from "@/hooks/use-sequential-image";
import { useDataStore } from "@/lib/dataStore";
import { breadcrumbJsonLd, productJsonLd, truncateMeta } from "@/lib/seo";
import { formatCurrencyPrice } from "@/lib/prices";

const arabicNumber = new Intl.NumberFormat("ar");
const formatCount = (value: number) => arabicNumber.format(value);

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const { brands } = useDataStore();
  const productFullQuery = useProductFullQuery(id);
  const product = productFullQuery.data?.product ?? null;
  const offers = productFullQuery.data?.offers ?? [];
  const loading = productFullQuery.isLoading && !product;
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const fallbackSpecs = useMemo(() => {
    if (!product) return {};
    if (product.specs && Object.keys(product.specs).length > 0) return product.specs;
    return {
      ...(product.brand ? { البراند: decodeHtmlEntities(product.brand) } : {}),
      ...(product.category ? { الفئة: decodeHtmlEntities(product.category) } : {}),
      ...(typeof product.lowestPrice === "number" ? { "أقل سعر": formatCurrencyPrice(product.lowestPrice, product.priceCurrency) } : {}),
      ...(typeof product.highestPrice === "number" ? { "أعلى سعر": formatCurrencyPrice(product.highestPrice, product.priceCurrency) } : {}),
      "عدد العروض": String(product.offerCount),
      "المتوفر حالياً": String(product.inStockCount),
    };
  }, [product]);

  const fallbackDescription = useMemo(() => {
    if (!product) return "";
    if (product.description) return decodeHtmlEntities(product.description);
    const parts = [
      product.brand ? decodeHtmlEntities(product.brand) : undefined,
      decodeHtmlEntities(product.title),
      product.category ? `ضمن فئة ${decodeHtmlEntities(product.category)}` : undefined,
      product.offerCount > 0 ? `ومتوفر حالياً عبر ${formatCount(product.offerCount)} عرض داخل حاير.` : undefined,
    ].filter(Boolean);
    return parts.join(" ");
  }, [product]);

  const brandSlug = useMemo(() => {
    if (!product?.brand) return null;
    const exact = brands.find((entry) => entry.brandName.toLowerCase() === product.brand!.toLowerCase());
    if (exact?.slug) return exact.slug;
    return product.brand
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  }, [brands, product]);

  const fallbackImage = getProductImageNotFound();
  const renderableImages = product
    ? getRenderableProductImageCandidates(product).filter((image) => isRenderableProductImage(image))
    : [];
  const gallery = (renderableImages.length > 0 ? renderableImages : [fallbackImage]).map(
    (image) => optimizeImageUrl(image, { width: 1080, height: 1080 }) ?? image,
  );
  const safeActiveImage = Math.min(activeImageIndex, Math.max(gallery.length - 1, 0));
  const { src: activeImageSrc, onError: onActiveImageError } = useSequentialImage(
    gallery.slice(safeActiveImage),
    {
      fallbackSrc: fallbackImage,
      resetKey: `${product?.id ?? "missing"}:${safeActiveImage}:${gallery.join("|")}`,
    },
  );

  if (loading) return <ProductDetailSkeleton />;

  if (!product && productFullQuery.isError) {
    return (
      <BackendErrorState
        title="تعذّر تحميل تفاصيل المنتج"
        description="ما گدرنا نوصل لمعلومات هذا المنتج من السيرفر. جرّب إعادة المحاولة أو ارجع للبحث."
        error={productFullQuery.error as Error | null}
        onRetry={() => {
          productFullQuery.refetch();
        }}
      />
    );
  }

  if (!product) {
    return (
      <div className="page-shell min-h-screen">
        <TopNav />
        <main className="container py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">المنتج غير موجود</h1>
          <Button asChild className="mt-4">
            <Link to="/search">العودة للبحث</Link>
          </Button>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const title = decodeHtmlEntities(product.title);
  const brand = decodeHtmlEntities(product.brand);
  const category = decodeHtmlEntities(product.category);
  const productPath = `/product/${encodeURIComponent(product.id)}`;
  const seoTitle = `${title} — أسعار وعروض في العراق`;
  const seoDescription = truncateMeta(
    `${title}${brand ? ` من ${brand}` : ""}${category ? ` ضمن ${category}` : ""}. قارن ${formatCount(product.offerCount)} عرض من محلات موثوقة داخل حاير واعرف أقل سعر قبل الشراء.`,
  );
  const seoImage = gallery[0] ?? fallbackImage;
  const inStockOffers = offers.filter((offer) => offer.stock === "in_stock");
  const bestOffer = inStockOffers[0] ?? offers[0];
  const trustedOffers = offers.filter((offer) => offer.officialDealer || offer.verified).length;
  const savings =
    product.highestPrice && product.lowestPrice && product.highestPrice > product.lowestPrice
      ? Math.round(((product.highestPrice - product.lowestPrice) / product.highestPrice) * 100)
      : 0;

  return (
    <div className="page-shell min-h-screen text-foreground">
      <Seo
        title={seoTitle}
        description={seoDescription || fallbackDescription}
        path={productPath}
        image={seoImage}
        type="product"
        structuredData={[
          breadcrumbJsonLd([
            { name: "الرئيسية", path: "/" },
            { name: "البحث", path: "/search" },
            ...(brandSlug ? [{ name: brand, path: `/brand/${brandSlug}` }] : []),
            { name: title, path: productPath },
          ]),
          productJsonLd(product, offers, productPath),
        ]}
      />
      <TopNav />

      {/* Breadcrumb */}
      <div className="border-b border-border/50 bg-card/40">
        <div className="container flex items-center gap-1.5 overflow-x-auto whitespace-nowrap py-3 text-[12px] font-semibold text-muted-foreground">
          <Link to="/" className="transition-colors hover:text-foreground">الرئيسية</Link>
          <ChevronLeft className="h-3 w-3 opacity-50" />
          <Link to="/search" className="transition-colors hover:text-foreground">البحث</Link>
          {brand && (
            <>
              <ChevronLeft className="h-3 w-3 opacity-50" />
              {brandSlug ? (
                <Link to={`/brand/${brandSlug}`} className="transition-colors hover:text-foreground">
                  {brand}
                </Link>
              ) : (
                <span className="transition-colors hover:text-foreground">{brand}</span>
              )}
            </>
          )}
          <ChevronLeft className="h-3 w-3 opacity-50" />
          <span className="line-clamp-1 font-medium text-foreground">{title}</span>
        </div>
      </div>

      {/* Hero — gallery + buy box */}
      <section className="relative isolate overflow-hidden border-b border-border/50">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-hero" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary)/0.045)_1px,transparent_1px),linear-gradient(180deg,hsl(var(--primary)/0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-60" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,hsl(var(--background)/0),hsl(var(--background)))]" />
        </div>
        <div className="container py-7 sm:py-9 md:py-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.92fr)] lg:items-start lg:gap-8 xl:gap-10">
            {/* Gallery */}
            <div className="lg:sticky lg:top-24 lg:self-start">
              <div className="product-studio-shell group relative p-1.5">
                <div className="product-studio-core relative overflow-hidden p-2 sm:p-3">
                <div className="absolute end-4 top-4 z-10 inline-flex items-center gap-0.5 rounded-full border border-border/60 bg-card/92 p-1 shadow-soft">
                  <IconAction label="إضافة إلى المفضلة"><Heart className="h-3.5 w-3.5" /></IconAction>
                  <span aria-hidden className="h-4 w-px bg-border/60" />
                  <IconAction label="مشاركة"><Share2 className="h-3.5 w-3.5" /></IconAction>
                </div>

                {savings > 5 && (
                  <div className="absolute start-4 top-4 z-10 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-bold text-background shadow-[0_16px_30px_-22px_hsl(var(--foreground)/0.82)]">
                    <TrendingDown className="h-3 w-3" />
                    وفّر {formatCount(savings)}%
                  </div>
                )}

                <div className="product-media-well relative aspect-[5/4] w-full overflow-hidden sm:aspect-square">
                  <div className="absolute inset-0 overflow-hidden">
                    <img
                      src={activeImageSrc}
                      alt={title}
                      onError={onActiveImageError}
                      fetchPriority="high"
                      className="h-full w-full scale-[1.14] object-cover object-center drop-shadow-[0_28px_34px_rgba(15,23,42,0.12)] transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.18]"
                    />
                  </div>
                </div>
                </div>
              </div>

              {gallery.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {gallery.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      type="button"
                      onClick={() => setActiveImageIndex(index)}
                      aria-label={`عرض الصورة ${index + 1}`}
                      className={cn(
                        "product-media-well relative h-20 w-20 shrink-0 overflow-hidden p-2 ring-1 ring-inset transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300",
                        safeActiveImage === index
                          ? "ring-2 ring-primary"
                          : "ring-border/50 hover:ring-foreground/30",
                      )}
                    >
                      <img src={image} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Buy box */}
            <div className="product-studio-shell p-1.5">
            <div className="product-studio-core flex flex-col p-5 sm:p-6 lg:p-7">
              {/* Brand · Category */}
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-bold text-muted-foreground">
                {brand && brandSlug ? (
                  <Link to={`/brand/${brandSlug}`} className="rounded-full bg-primary-soft px-2.5 py-1 font-black text-primary transition-colors hover:text-foreground">
                    {brand}
                  </Link>
                ) : brand ? (
                  <span className="rounded-full bg-primary-soft px-2.5 py-1 font-black text-primary">{brand}</span>
                ) : null}
                {category && <span className="rounded-full border border-border/70 bg-card/72 px-2.5 py-1">{category}</span>}
              </div>

              {/* Title */}
              <h1 className="mt-4 font-display text-balance text-[clamp(2rem,8vw,3rem)] font-black leading-[1.02] tracking-normal text-foreground lg:text-[3.45rem]">
                {title}
              </h1>

              {/* Rating */}
              {product.rating != null && product.rating > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] font-semibold">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((step) => (
                      <Star
                        key={step}
                        className={cn(
                          "h-3.5 w-3.5",
                          step <= Math.round(product.rating ?? 0) ? "fill-foreground text-foreground" : "text-muted-foreground/30",
                        )}
                      />
                    ))}
                  </div>
                  <span className="font-semibold tabular-nums text-foreground">{product.rating.toFixed(1)}</span>
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{formatCount(product.reviewCount ?? 0)} تقييم</span>
                </div>
              )}

              {/* Price block */}
              <div className="mt-6 rounded-[1.55rem] border border-border/65 bg-white/64 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-6">
                <p className="text-[11px] font-black tracking-[0.12em] text-primary">
                  أقل سعر متوفر
                </p>
                <div className="mt-2 flex flex-wrap items-baseline gap-3">
                  <span className="font-numeric tabular-nums text-4xl font-black leading-none tracking-normal text-foreground sm:text-5xl">
                    {product.lowestPrice ? formatCurrencyPrice(product.lowestPrice, product.priceCurrency) : "—"}
                  </span>
                  {product.highestPrice && product.highestPrice > (product.lowestPrice ?? 0) && (
                    <span className="font-numeric tabular-nums text-base text-muted-foreground/70 line-through">
                      {formatCurrencyPrice(product.highestPrice, product.priceCurrency)}
                    </span>
                  )}
                </div>

                {bestOffer && (
                  <p className="mt-3 text-[13px] text-muted-foreground">
                    من{" "}
                    <Link
                      to={`/shop-view/${bestOffer.storeId}`}
                      className="font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      {decodeHtmlEntities(bestOffer.storeName)}
                    </Link>
                    {bestOffer.storeCity && <span> · {bestOffer.storeCity}</span>}
                  </p>
                )}

                {bestOffer ? (
                  <Button asChild size="lg" className="mt-5 h-12 w-full rounded-[1.1rem] bg-foreground text-[14px] font-black text-background hover:bg-foreground/90">
                    <a href={bestOffer.productUrl} target="_blank" rel="noopener noreferrer">
                      اشترِ من {decodeHtmlEntities(bestOffer.storeName)}
                      <ExternalLink className="ms-1 h-4 w-4" />
                    </a>
                  </Button>
                ) : (
                  <Button asChild variant="outline" size="lg" className="mt-5 h-12 w-full rounded-[1.1rem] border-border/70 bg-card/82 font-black">
                    <Link to="/search">العودة للبحث</Link>
                  </Button>
                )}

                {/* Trust strip */}
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-border/50 pt-4 text-[12px] sm:grid-cols-3">
                  {bestOffer?.shippingNote && (
                    <TrustItem icon={Truck} label={bestOffer.shippingNote} />
                  )}
                  {trustedOffers > 0 && (
                    <TrustItem icon={ShieldCheck} label={`${formatCount(trustedOffers)} مصدر موثّق`} />
                  )}
                  {product.inStockCount > 0 && (
                    <TrustItem icon={Check} label={`${formatCount(product.inStockCount)} متوفر`} />
                  )}
                </div>
              </div>

              {/* Trust badges — warranty, shipping, returns, COD */}
              <TrustBadges />

              {/* Quick metrics */}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat value={formatCount(offers.length)} label="متجر" />
                <MiniStat value={formatCount(inStockOffers.length)} label="متوفر" />
                <MiniStat value={savings > 0 ? `${formatCount(savings)}%` : "—"} label="فرق" />
                <MiniStat value={formatCount(trustedOffers)} label="موثّق" />
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      <main className="container space-y-10 py-9 pb-28 md:space-y-14 md:py-12 md:pb-20">
        {/* Offers */}
        <section id="all-offers" className="scroll-mt-24">
          <SectionHeader
            kicker="العروض"
            title="جميع المتاجر اللي يبيعون هذا المنتج"
            subtitle="مرتّبة حسب السعر والتوفر — بدون ضجيج."
          />

          {offers.length > 0 ? (
            <div className="search-surface mt-6 p-1.5">
              <div className="search-core grid gap-2.5 overflow-hidden p-2">
                {offers.map((offer, index) => (
                  <OfferRow key={offer.id} offer={offer} highlighted={index === 0 && offer.stock === "in_stock"} />
                ))}
              </div>
            </div>
          ) : (
            <EmptyPanel>لا توجد عروض شراء مباشرة لهذا المنتج حالياً.</EmptyPanel>
          )}
        </section>

        {/* Reviews */}
        {product.rating != null && product.rating > 0 && (
          <section>
            <SectionHeader
              kicker="التقييمات"
              title="آراء العملاء وتوزيع النجوم"
              subtitle="فلتر بالنجوم لتشوف رأي مَن جرّبه قبلك."
            />
            <div className="mt-6">
              <ReviewsBlock
                rating={product.rating}
                reviewCount={product.reviewCount}
              />
            </div>
          </section>
        )}

        {/* Details tabs */}
        <section>
          <SectionHeader kicker="التفاصيل" title="مواصفات ووصف المنتج" />

          <Tabs defaultValue="specs" className="mt-6 w-full">
            <TabsList className="search-surface h-auto p-1">
              <TabsTrigger value="specs" className="rounded-[1rem] px-4 py-2 text-[13px] font-bold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm">
                المواصفات
              </TabsTrigger>
              <TabsTrigger value="description" className="rounded-[1rem] px-4 py-2 text-[13px] font-bold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm">
                الوصف
              </TabsTrigger>
              <TabsTrigger value="summary" className="rounded-[1rem] px-4 py-2 text-[13px] font-bold data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-sm">
                الملخص
              </TabsTrigger>
            </TabsList>

            <TabsContent value="specs" className="mt-6">
              {Object.keys(fallbackSpecs).length > 0 ? (
                <dl className="search-core overflow-hidden">
                  {Object.entries(fallbackSpecs).map(([key, value], i, arr) => (
                    <div
                      key={key}
                      className={cn(
                        "flex items-center justify-between gap-4 px-5 py-3.5 text-[13px]",
                        i < arr.length - 1 && "border-b border-border/40",
                      )}
                    >
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="text-end font-bold text-foreground">{decodeHtmlEntities(String(value))}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <EmptyPanel>لا توجد مواصفات تفصيلية لهذا المنتج بعد.</EmptyPanel>
              )}
            </TabsContent>

            <TabsContent value="description" className="mt-6">
              <div className="search-core p-6">
                <p className="text-[14px] leading-7 text-foreground/90">
                  {fallbackDescription || "لا يوجد وصف متاح لهذا المنتج بعد."}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="summary" className="mt-6">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryStat icon={StoreIcon} value={formatCount(offers.length)} label="عدد العروض" />
                <SummaryStat icon={Package} value={formatCount(inStockOffers.length)} label="عروض متوفرة" />
                <SummaryStat icon={TrendingDown} value={`${formatCount(savings)}%`} label="فرق السعر" />
                <SummaryStat icon={Award} value={formatCount(trustedOffers)} label="مصادر موثقة" />
              </div>
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <SiteFooter />
      <StickyBuyBar product={product} bestOffer={bestOffer} offersAnchorId="all-offers" />
    </div>
  );
}

/* ============================================================ */
/*                       Sub-components                         */
/* ============================================================ */

function SectionHeader({ kicker, title, subtitle }: { kicker: string; title: string; subtitle?: string }) {
  return (
    <div>
      <p className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-[11px] font-black tracking-[0.12em] text-primary">{kicker}</p>
      <h2 className="mt-3 font-display text-2xl font-black tracking-normal text-foreground sm:text-3xl">{title}</h2>
      {subtitle && <p className="mt-2 max-w-2xl text-[14px] font-medium leading-7 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function IconAction({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors duration-200 hover:bg-primary-soft hover:text-primary active:scale-[0.96]"
    >
      {children}
    </button>
  );
}

function TrustItem({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-card/72 px-2 py-1 text-muted-foreground ring-1 ring-border/55">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="truncate font-semibold">{label}</span>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="offer-surface px-3 py-3 text-center">
      <div className="font-numeric tabular-nums text-lg font-black text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] font-bold text-muted-foreground">{label}</div>
    </div>
  );
}

function SummaryStat({ icon: Icon, value, label }: { icon: LucideIcon; value: string; label: string }) {
  return (
    <div className="search-card-shell p-1.5">
      <div className="search-core p-4">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <div className="font-numeric tabular-nums mt-3 text-2xl font-black text-foreground">{value}</div>
        <div className="mt-1 text-[12px] font-bold text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function EmptyPanel({ children }: { children: ReactNode }) {
  return (
    <div className="search-surface mt-6 p-1.5">
      <div className="search-core p-10 text-center text-[13px] font-semibold text-muted-foreground">
        {children}
      </div>
    </div>
  );
}

function OfferRow({ offer, highlighted = false }: { offer: UnifiedOffer; highlighted?: boolean }) {
  const storeName = decodeHtmlEntities(offer.storeName);
  const official = offer.officialDealer;
  const verified = offer.verified && !official;

  return (
    <article
      className={cn(
        "group relative grid gap-4 rounded-[1.35rem] bg-white/68 px-4 py-4 ring-1 ring-border/48 transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white/86 hover:shadow-[0_22px_52px_-42px_hsl(var(--primary)/0.45)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6 sm:px-5",
        highlighted && "bg-primary-soft/48 ring-primary/20 shadow-[0_18px_52px_-44px_hsl(var(--primary)/0.55)]",
      )}
    >
      {highlighted && (
        <span aria-hidden className="absolute inset-y-4 start-0 w-1 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary)/0.28)]" />
      )}

      {/* Left: store info */}
      <div className="flex min-w-0 flex-1 items-start gap-3.5">
        {/* Store avatar — first letter as a clean monogram */}
        <Link
          to={`/shop-view/${offer.storeId}`}
          className="grid h-12 w-12 shrink-0 place-items-center rounded-[1.05rem] bg-surface-2/72 text-[15px] font-black text-foreground/84 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_12px_26px_-22px_hsl(var(--foreground)/0.28)] ring-1 ring-border/48 transition-[border-color,box-shadow,color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:text-primary hover:ring-primary/24"
        >
          {storeName.charAt(0)}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/shop-view/${offer.storeId}`}
              className="truncate text-[15px] font-black leading-tight text-foreground transition-colors hover:text-primary"
            >
              {storeName}
            </Link>
            {official && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-bold text-primary">
                <Award className="h-3 w-3" strokeWidth={1.8} />
                وكيل رسمي
              </span>
            )}
            {verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-emerald-soft px-2 py-0.5 text-[11px] font-bold text-accent-emerald">
                <ShieldCheck className="h-3 w-3" strokeWidth={1.8} />
                موثّق
              </span>
            )}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-muted-foreground">
            {offer.storeCity && <span>{offer.storeCity}</span>}
            {offer.storeRating != null && offer.storeRating > 0 && (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3 w-3 fill-foreground text-foreground" />
                <span className="tabular-nums">{offer.storeRating.toFixed(1)}</span>
              </span>
            )}
            {offer.shippingNote && (
              <span className="inline-flex items-center gap-1">
                <Truck className="h-3 w-3" />
                {offer.shippingNote}
              </span>
            )}
            {offer.freshnessLabel && <span className="text-muted-foreground/70">{offer.freshnessLabel}</span>}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {highlighted && (
              <span className="inline-flex items-center rounded-full bg-foreground px-2 py-0.5 text-[10px] font-black tracking-normal text-background">
                الأرخص
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                offer.stock === "in_stock" && "bg-accent-emerald-soft text-accent-emerald",
                offer.stock === "preorder" && "bg-primary-soft text-primary",
                offer.stock === "out_of_stock" && "bg-muted text-muted-foreground",
              )}
            >
              {offer.stock === "in_stock" && <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />}
              {offer.stock === "in_stock" ? "متوفر" : offer.stock === "preorder" ? "طلب مسبق" : "نفد"}
            </span>
          </div>
        </div>
      </div>

      {/* Right: price + CTA */}
      <div className="flex items-center justify-between gap-4 rounded-[1.1rem] bg-card/62 p-2 ring-1 ring-border/40 sm:flex-col sm:items-end sm:gap-3 sm:bg-transparent sm:p-0 sm:ring-0">
        <div className="text-end">
          <p className="font-numeric tabular-nums text-xl font-black leading-none text-foreground sm:text-[22px]">
            {formatCurrencyPrice(offer.price, offer.currency)}
          </p>
          {offer.originalPrice && (
            <p className="font-numeric tabular-nums mt-1 text-[12px] text-muted-foreground line-through">
              {formatCurrencyPrice(offer.originalPrice, offer.currency)}
            </p>
          )}
        </div>

        <a
          href={offer.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[13px] font-black shadow-border transition-[transform,background-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.96]",
            highlighted
              ? "bg-foreground text-background hover:bg-foreground/90"
              : "bg-card/88 text-foreground hover:bg-primary-soft hover:text-primary",
          )}
        >
          <span>زيارة العرض</span>
          <span className={cn(
            "grid h-7 w-7 place-items-center rounded-full transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-0.5",
            highlighted ? "bg-background/10" : "bg-primary-soft",
          )}>
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.9} />
          </span>
        </a>
      </div>
    </article>
  );
}
