import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BadgeCheck, MapPin, Route, Search, Store, TrendingDown } from "lucide-react";
import baghdadPinsMap from "@/assets/baghdad-pins-map.webp";
import iraqCitiesPano from "@/assets/iraq-cities-pano.webp";
import { BrandStrip } from "@/components/BrandStrip";
import { CategoryCircles } from "@/components/CategoryCircles";
import { ContactStrip } from "@/components/ContactStrip";
import { HowItWorks } from "@/components/HowItWorks";
import { MetricsStrip } from "@/components/MetricsStrip";
import { ProductRail } from "@/components/ProductRail";
import { ShopCard } from "@/components/ShopCard";
import { ShopCarousel } from "@/components/ShopCarousel";
import { ShopCardSkeletonGrid } from "@/components/ShopCardSkeleton";
import { SiteFooter } from "@/components/SiteFooter";
import { StreetShopsSection } from "@/components/StreetShopsSection";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import { useDataStore } from "@/lib/dataStore";
import { useCatalogBootstrapLiteQuery } from "@/lib/catalogQueries";
import { compareCatalogShopsByPriority } from "@/lib/shopRanking";
import { getShopImage, preloadShopImages } from "@/lib/shopImages";
import { hasComparableDiscount } from "@/lib/prices";
import type { ScoredProduct } from "@/lib/search";
import type { ProductIndex, Shop } from "@/lib/types";

interface SectionHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  seeAll?: string;
}

function scoreProducts(products: ProductIndex[], baseScore: number): ScoredProduct[] {
  return products.slice(0, 12).map((product, index) => ({
    ...product,
    score: baseScore - index,
  }));
}

function SectionHeader({ kicker, title, description, seeAll }: SectionHeaderProps) {
  return (
    <div className="flex min-w-0 max-w-full flex-col gap-4 overflow-hidden border-b border-border pb-5 text-right sm:gap-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0 max-w-3xl">
        <span className="atlas-kicker text-primary">{kicker}</span>
        <h2 className="font-display mt-3 max-w-full text-balance break-words text-[clamp(1.9rem,7.4vw,2.6rem)] font-black leading-[1.08] tracking-normal text-foreground sm:text-4xl sm:leading-[1.02] lg:text-5xl">
          {title}
        </h2>
        {description && (
          <p className="mt-3 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
            {description}
          </p>
        )}
      </div>
      {seeAll && (
        <Link
          to={seeAll}
          className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background transition-[transform,background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-foreground/92 hover:shadow-[0_18px_34px_-26px_hsl(var(--foreground)/0.65)]"
        >
          عرض الكل
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
        </Link>
      )}
    </div>
  );
}

function DestinationCard({
  to,
  image,
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  to: string;
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  icon: typeof MapPin;
}) {
  return (
    <Link
      to={to}
      className="group relative block overflow-hidden rounded-[2rem] bg-border/40 p-px shadow-[0_18px_50px_-44px_rgba(23,32,23,0.36)] transition-[transform,box-shadow] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:shadow-[0_28px_76px_-54px_rgba(23,32,23,0.5)]"
    >
      <article className="relative isolate min-h-[300px] overflow-hidden rounded-[calc(2rem-1px)] bg-foreground p-5 text-right text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-7">
        <img
          src={image}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 -z-20 h-full w-full object-cover opacity-70 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.04]"
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(23,32,23,0.86),rgba(23,32,23,0.44),rgba(23,32,23,0.16))]" />
        <div className="flex min-h-[250px] flex-col justify-between">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-[11px] font-bold text-white ring-1 ring-white/16">
            <Icon className="h-3.5 w-3.5" strokeWidth={1.9} />
            {eyebrow}
          </div>
          <div>
            <h3 className="font-display text-4xl font-black leading-none tracking-normal sm:text-5xl">
              {title}
            </h3>
            <p className="mt-4 max-w-xl text-sm font-medium leading-7 text-white/82 sm:text-base sm:leading-8">
              {description}
            </p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white">
              افتح المسار
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/12 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1">
                <ArrowLeft className="h-4 w-4" />
              </span>
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function TrustBand() {
  const items = [
    {
      icon: Search,
      title: "بحث قبل اللف",
      body: "النية تبدأ من المنتج أو الفئة، بعدها تظهر المحلات والطرق الأقرب للقرار.",
    },
    {
      icon: BadgeCheck,
      title: "إشارات ثقة واضحة",
      body: "التقييم، عدد المراجعات، الصور، وروابط التواصل تظهر قبل الدخول في التفاصيل.",
    },
    {
      icon: Route,
      title: "سوق محلي مفهوم",
      body: "الشوارع والمحافظات ليست زخرفة؛ هي طريقة ترتيب تساعد المتسوق العراقي يقرأ السوق بسرعة.",
    },
  ];

  return (
    <section className="container mt-16 sm:mt-24 md:mt-28">
      <div className="grid gap-8 rounded-[2.4rem] bg-border/40 p-px shadow-[0_18px_50px_-44px_rgba(23,32,23,0.36)] lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[1.95rem] bg-foreground p-6 text-right text-white sm:p-8">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/72 ring-1 ring-white/14">
            الثقة
          </span>
          <h2 className="font-display mt-5 text-4xl font-black leading-[1.02] tracking-normal sm:text-5xl">
            حاير يختصر القراءة، مو يكثر الضجيج.
          </h2>
          <p className="mt-5 max-w-xl text-sm leading-7 text-white/72 sm:text-base sm:leading-8">
            التصميم الجديد يخدم قرار الشراء: بحث واضح، أسواق محلية مرتبة، وبطاقات تقرأ بسرعة على الموبايل.
          </p>
        </div>
        <div className="grid gap-3 p-2 sm:grid-cols-3 lg:p-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="rounded-[1.5rem] bg-card p-5 text-right ring-1 ring-border">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </span>
                <h3 className="mt-5 font-display text-2xl font-black leading-tight tracking-normal text-foreground">
                  {item.title}
                </h3>
                <p className="mt-3 text-[13px] leading-7 text-muted-foreground">{item.body}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function IndexDeferredSections() {
  const { shops, products, home } = useDataStore();
  const bootstrapLiteQuery = useCatalogBootstrapLiteQuery();
  const loading = useFakeLoading(700);
  const [, setShopImagesVersion] = useState(0);

  const featuredFallback = [...shops]
    .filter((shop) => !shop.archivedAt)
    .filter((shop) => (shop.productCount ?? 0) > 0 || Boolean(shop.website) || Boolean(shop.featured))
    .sort(compareCatalogShopsByPriority)
    .slice(0, 6);

  const featured = featuredFallback;
  const featuredShops = bootstrapLiteQuery.data?.featuredShops?.length
    ? bootstrapLiteQuery.data.featuredShops
    : featured;

  const activeShops = shops.filter((shop) => !shop.archivedAt);
  const ratedShops = activeShops.filter(
    (shop) => typeof shop.rating === "number" && (shop.rating ?? 0) > 0,
  );
  const topRatedSource = ratedShops.length > 0 ? ratedShops : activeShops;
  const topRated = [...topRatedSource]
    .sort((a, b) => {
      const ratingDiff = (b.rating ?? 0) - (a.rating ?? 0);
      if (ratingDiff !== 0) return ratingDiff;
      const reviewDiff = (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      if (reviewDiff !== 0) return reviewDiff;
      return compareCatalogShopsByPriority(a, b);
    })
    .slice(0, 6);
  const topRatedShops = bootstrapLiteQuery.data?.topRatedShops?.length
    ? bootstrapLiteQuery.data.topRatedShops
    : topRated;

  const shopsToEnrich = useMemo(
    () =>
      [...featuredShops, ...topRatedShops]
        .filter((shop) => !getShopImage(shop))
        .slice(0, 24),
    [featuredShops, topRatedShops],
  );

  useEffect(() => {
    let cancelled = false;
    if (shopsToEnrich.length === 0) return;

    preloadShopImages(shopsToEnrich).then(() => {
      if (!cancelled) {
        setShopImagesVersion((version) => version + 1);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [shopsToEnrich]);

  const comparableDeals = (home.deals.length ? home.deals : products).filter((product) =>
    hasComparableDiscount(product.priceValue, product.originalPriceValue),
  );
  const dealProducts = scoreProducts(comparableDeals, 90);
  const trendingProducts = scoreProducts(home.trending.length ? home.trending : products.slice(6), 80);
  const latestProducts = scoreProducts(home.latest.length ? home.latest : products.slice(12), 70);

  return (
    <>
      <main className="pb-14 sm:pb-24">
        <section id="categories" className="relative mt-12 scroll-mt-24 sm:mt-16 md:mt-20">
          <div className="container">
            <CategoryCircles />
          </div>
        </section>

        <section className="container mt-16 sm:mt-24 md:mt-28">
          <SectionHeader
            kicker="وجهات"
            title="ابدأ من السوق اللي يناسبك"
            description="الصفحة الرئيسية تفتح على اختيارات حقيقية: محافظة، شارع، أو فئة، بدل ما تخليك تدور من الصفر."
            seeAll="/iraq"
          />

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <DestinationCard
              to="/iraq"
              image={iraqCitiesPano}
              eyebrow="كل العراق"
              title="الأطلس العراقي"
              description="محافظات رئيسية، متاجر موثقة، وقراءة أسرع لحركة السوق خارج بغداد وداخلها."
              icon={MapPin}
            />
            <DestinationCard
              to="/sinaa"
              image={baghdadPinsMap}
              eyebrow="بغداد"
              title="مسارات الشوارع"
              description="شارع الصناعة للحاسبات والقطع، وشارع الربيعي للهواتف والإكسسوارات."
              icon={Route}
            />
          </div>

          <div className="mt-8 grid gap-6 sm:mt-10">
            <StreetShopsSection
              area="شارع الصناعة"
              title="شارع الصناعة"
              subtitle="حاسبات، قطع، شبكات وطابعات — قراءة مرتبة لأهم محلات الفئة في بغداد."
            />
            <StreetShopsSection
              area="شارع الربيعي"
              title="شارع الربيعي"
              subtitle="هواتف، شواحن وإكسسوارات — مدخل سريع للمقارنة قبل الشراء."
            />
          </div>
        </section>

        {(dealProducts.length > 0 || trendingProducts.length > 0 || latestProducts.length > 0) && (
          <section id="products" className="container mt-16 scroll-mt-24 sm:mt-24 md:mt-28">
            <SectionHeader
              kicker="منتجات"
              title="رفوف مختارة للقرار السريع"
              description="منتجات من الفهرس الحالي تساعدك تقارن السعر والتوفر بدون ما تدخل في صفحة بحث فارغة."
              seeAll="/search"
            />
            <div className="mt-8 grid gap-5">
              {dealProducts.length > 0 && (
                <ProductRail title="أسعار تستحق المقارنة" seeAllTo="/search?sort=price_asc" products={dealProducts} />
              )}
              {trendingProducts.length > 0 && (
                <ProductRail title="الأكثر حضوراً في الفهرس" seeAllTo="/search?sort=offers_desc" products={trendingProducts} />
              )}
              {latestProducts.length > 0 && (
                <ProductRail title="آخر المنتجات المفهرسة" seeAllTo="/search?sort=freshness_desc" products={latestProducts} />
              )}
            </div>
          </section>
        )}

        <BrandStrip />

        <section className="relative mt-16 sm:mt-24 md:mt-28">
          <div className="container">
            <SectionHeader
              kicker="محلات مختارة"
              title="متاجر تبدأ منها بثقة"
              seeAll="/search"
              description="بطاقات مختصرة للمتاجر الأعلى حضوراً: صورة، تقييم، منطقة، وروابط مباشرة."
            />

            <div className="mt-8">
              {loading ? (
                <ShopCardSkeletonGrid count={6} />
              ) : (
                <>
                  <ShopCarousel shops={featuredShops} hideAbove="xl" />
                  <div className="hidden xl:grid xl:grid-cols-3 xl:gap-6">
                    {featuredShops.map((shop, index) => (
                      <div
                        key={shop.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 70}ms`, animationFillMode: "backwards" }}
                      >
                        <ShopCard shop={shop} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="relative mt-16 sm:mt-24 md:mt-28">
          <div className="container">
            <SectionHeader
              kicker="الأعلى تقييماً"
              title="متاجر يثق بها الزبائن"
              description="الترتيب يعتمد على التقييم وعدد المراجعات ثم أولوية الفهرس، حتى تبقى القراءة عملية."
              seeAll="/search?sort=rating"
            />

            <div className="mt-8">
              {loading ? (
                <ShopCardSkeletonGrid count={6} />
              ) : topRatedShops.length === 0 ? null : (
                <>
                  <ShopCarousel shops={topRatedShops} hideAbove="xl" />
                  <div className="hidden xl:grid xl:grid-cols-3 xl:gap-6">
                    {topRatedShops.map((shop, index) => (
                      <div
                        key={shop.id}
                        className="animate-fade-in-up"
                        style={{ animationDelay: `${index * 70}ms`, animationFillMode: "backwards" }}
                      >
                        <ShopCard shop={shop} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <TrustBand />

        <section className="container mt-16 grid gap-8 sm:mt-24 sm:gap-10 md:mt-28 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.72fr)] xl:items-start">
          <HowItWorks />
          <div>
            <span className="atlas-kicker text-primary">المؤشرات</span>
            <h3 className="font-display mt-4 text-3xl font-black leading-tight tracking-normal text-foreground sm:text-4xl">
              آخر قراءة للأطلس
            </h3>
            <div className="mt-6">
              <MetricsStrip />
            </div>
          </div>
        </section>

        <ContactStrip />
      </main>

      <SiteFooter />
    </>
  );
}
