import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import baghdadPinsMap from "@/assets/baghdad-pins-map.png";
import { TopNav } from "@/components/TopNav";
import { HeroBanner } from "@/components/HeroBanner";
import { CategoryCircles } from "@/components/CategoryCircles";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";
import { MetricsStrip } from "@/components/MetricsStrip";
import { ShopCard } from "@/components/ShopCard";
import { ShopCarousel } from "@/components/ShopCarousel";
import { ShopCardSkeletonGrid } from "@/components/ShopCardSkeleton";
import { BrandCard } from "@/components/BrandCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductRail } from "@/components/ProductRail";
import { StreetShopsSection } from "@/components/StreetShopsSection";
import { useDataStore } from "@/lib/dataStore";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import { compareShopsByPopularity } from "@/lib/shopRanking";

const Index = () => {
  const { shops, brands, products } = useDataStore();
  const loading = useFakeLoading(700);

  const featured = [...shops]
    .filter((shop) => !shop.archivedAt)
    .sort(compareShopsByPopularity)
    .slice(0, 6);

  const trending = [...products]
    .sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0))
    .slice(0, 12)
    .map((product) => ({ ...product, score: 0 }));

  const deals = [...products]
    .filter((product) => product.originalPriceValue && product.priceValue && product.originalPriceValue > product.priceValue)
    .sort(
      (a, b) =>
        (b.originalPriceValue! - b.priceValue!) / b.originalPriceValue! -
        (a.originalPriceValue! - a.priceValue!) / a.originalPriceValue!,
    )
    .slice(0, 12)
    .map((product) => ({ ...product, score: 0 }));

  const newArrivals = [...products]
    .sort((a, b) => new Date(b.crawledAt).getTime() - new Date(a.crawledAt).getTime())
    .slice(0, 12)
    .map((product) => ({ ...product, score: 0 }));

  return (
    <div className="min-h-screen atlas-shell">
      <TopNav />
      <HeroBanner />

      <main className="pb-12 sm:pb-20">
        {/* Categories — soft dashboard-like band */}
        <section className="relative mt-8 sm:mt-16 md:mt-24">
          {/* Soft muted surface, very subtle */}
          <div aria-hidden className="absolute inset-0 -z-10 bg-muted/40" />
          <div aria-hidden className="absolute inset-0 -z-10 opacity-50 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,_hsl(var(--primary)/0.06),_transparent_70%)]" />
          <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
          <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />

          <div className="container py-10 sm:py-16 md:py-20">
            <SectionHeader
              kicker="الفئات"
              title="ابدأ من القسم الأقرب لحاجتك"
              seeAll="/results"
              description="بدل البحث العشوائي، اختر الفئة أولاً ثم خلِّ التصفية تكمل المشوار."
            />
            <div className="mt-5 sm:mt-8">
              <CategoryCircles />
            </div>
          </div>
        </section>

        {/* Street features — two large editorial blocks */}
        <section className="container mt-10 sm:mt-20 md:mt-28">
          {/* Editorial headline — magazine spread style */}
          <div className="relative isolate overflow-hidden rounded-[28px] border border-border/60 bg-card/40 px-6 py-10 text-right shadow-soft backdrop-blur-sm sm:px-12 sm:py-16 md:px-16 md:py-20">
            {/* Map background */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10"
              style={{
                backgroundImage: `url(${baghdadPinsMap})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.32,
                maskImage:
                  "radial-gradient(ellipse 90% 75% at 70% 50%, black 30%, transparent 88%)",
                WebkitMaskImage:
                  "radial-gradient(ellipse 90% 75% at 70% 50%, black 30%, transparent 88%)",
              }}
            />
            {/* Soft tint to blend with brand */}
            <div
              aria-hidden
              className="absolute inset-0 -z-10 bg-gradient-to-l from-card/80 via-card/40 to-transparent"
            />

            <div className="relative">
              <div className="flex items-center justify-end gap-3">
                <div className="h-px flex-1 bg-gradient-to-l from-border to-transparent" />
                <span className="atlas-kicker text-primary">شوارع السوق</span>
                <span className="size-1.5 rounded-full bg-primary" />
              </div>
              <h2 className="font-display mt-4 text-3xl font-semibold leading-[1.05] tracking-tight text-foreground sm:mt-6 sm:text-5xl md:text-6xl lg:text-7xl">
                مسارات بغداد
                <span className="block bg-gradient-to-l from-primary via-primary to-primary/60 bg-clip-text text-transparent">
                  المرجعية.
                </span>
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:mt-6 sm:text-base sm:leading-8 ms-auto">
                شارعا <span className="font-semibold text-foreground">الصناعة</span> و
                <span className="font-semibold text-foreground"> الربيعي</span> يشكلان قلب سوق الإلكترونيات في بغداد. ابدأ منهما قبل أي قرار شراء.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-5 sm:mt-12 sm:gap-8">
            <StreetShopsSection
              area="شارع الصناعة"
              title="شارع الصناعة"
              subtitle="حاسبات، قطع، شبكات وطابعات — أهم محلات الفئة في بغداد."
            />

            <StreetShopsSection
              area="شارع الربيعي"
              title="شارع الربيعي"
              subtitle="هواتف، شواحن وإكسسوارات — مدخل سريع للقراءة قبل الشراء."
            />
          </div>
        </section>

        {/* Iraq coverage CTA */}
        <section className="container mt-10 sm:mt-20 md:mt-24">
          <Link
            to="/iraq"
            className="atlas-card group block p-5 text-right sm:p-8 md:p-12"
          >
            <div className="grid gap-4 sm:gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <span className="atlas-kicker">تغطية وطنية</span>
                <h2 className="font-display mt-3 text-xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl tracking-tight">
                  نفس لغة السوق <br className="hidden sm:inline" /> في كل المحافظات.
                </h2>
                <p className="mt-2.5 max-w-3xl text-[13px] leading-6 text-muted-foreground sm:mt-4 sm:text-base sm:leading-8">
                  بغداد، أربيل، البصرة، الموصل، النجف، كربلاء، السليمانية، كركوك، بعقوبة،
                  والناصرية ضمن مسار واحد يختصر الوصول من الفكرة إلى المحل.
                </p>
              </div>

              <div className="flex items-center gap-3 border-t border-border pt-4 sm:gap-4 md:border-0 md:pt-0">
                <span className="font-display text-sm font-bold text-foreground group-hover:text-primary sm:text-xl">
                  افتح الأطلس
                </span>
                <ArrowLeft className="icon-nudge-x h-4 w-4 text-foreground group-hover:text-primary sm:h-5 sm:w-5" />
              </div>
            </div>
          </Link>
        </section>

        {/* Product rails */}
        <section className="container mt-10 space-y-5 sm:mt-20 sm:space-y-10 md:mt-28">

          <ProductRail title="أفضل التخفيضات" seeAllTo="/results" products={deals} />
          <ProductRail title="الأكثر تقييماً" seeAllTo="/results" products={trending} />
          <ProductRail title="إضافات حديثة" seeAllTo="/results" products={newArrivals} />
        </section>

        {/* Featured shops */}
        <section className="container mt-10 sm:mt-20 md:mt-28">
          <SectionHeader
            kicker="محلات مختارة"
            title="محلات تستحق أن تبدأ منها"
            seeAll="/results"
            description="قراءة أسرع للمحلات الأوثق والأكثر حضوراً داخل السوق."
          />

          <div className="mt-5 sm:mt-10">
            {loading ? (
              <ShopCardSkeletonGrid count={6} />
            ) : (
              <>
                {/* Mobile + tablet: premium carousel */}
                <ShopCarousel shops={featured} hideAbove="lg" />

                {/* Desktop: grid */}
                <div className="hidden lg:grid lg:grid-cols-3 lg:gap-6">
                  {featured.map((shop, index) => (
                    <div
                      key={shop.id}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
                    >
                      <ShopCard shop={shop} />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Brands + How it works + Metrics */}
        <section className="container mt-10 grid gap-8 sm:mt-20 sm:gap-12 md:mt-28 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <SectionHeader
              kicker="الوكلاء الرسميون"
              title="براندات بصورة أوضح"
              description="دليل أولي للوكلاء المعتمدين في العراق، مع انتقال أسرع بين البراند والفروع."
              seeAll="/brands"
            />

            <div className="mt-6 sm:mt-8">
              {loading ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <Skeleton key={index} className="h-[180px]" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {brands.slice(0, 6).map((brand, index) => (
                    <div
                      key={brand.slug}
                      className="animate-fade-in-up"
                      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
                    >
                      <BrandCard brand={brand} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-8 sm:space-y-10 lg:sticky lg:top-24">
            <HowItWorks />
            <div>
              <span className="atlas-kicker">المؤشرات</span>
              <h3 className="font-display mt-4 text-xl font-bold text-foreground sm:text-2xl">آخر قراءة للأطلس</h3>
              <div className="mt-5 sm:mt-6">
                <MetricsStrip />
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

interface SectionHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  seeAll?: string;
}

function SectionHeader({ kicker, title, description, seeAll }: SectionHeaderProps) {
  return (
    <div className="pb-5 sm:pb-6 border-b border-border">
      <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl text-right">
          <span className="atlas-kicker">{kicker}</span>
          <h2 className="font-display mt-3 text-xl font-semibold leading-tight text-foreground sm:text-3xl md:text-4xl tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm leading-7 text-muted-foreground sm:mt-3 sm:text-base sm:leading-8">{description}</p>
          )}
        </div>
        {seeAll && (
          <Link
            to={seeAll}
            className="link-underline shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:text-primary-glow"
          >
            عرض الكل ←
          </Link>
        )}
      </div>
    </div>
  );
}

export default Index;
