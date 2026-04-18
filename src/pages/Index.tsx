import { Link } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { HeroBanner } from "@/components/HeroBanner";
import { CategoryCircles } from "@/components/CategoryCircles";
import { HowItWorks } from "@/components/HowItWorks";
import { SiteFooter } from "@/components/SiteFooter";
import { MetricsStrip } from "@/components/MetricsStrip";
import { ShopCard } from "@/components/ShopCard";
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

      <main className="pb-20">
        {/* Categories — editorial inline strip */}
        <section className="container mt-16 md:mt-24">
          <SectionHeader
            kicker="الفئات"
            title="ابدأ من القسم الأقرب لحاجتك"
            seeAll="/results"
            description="بدل البحث العشوائي، اختر الفئة أولاً ثم خلِّ التصفية تكمل المشوار."
          />
          <div className="mt-8">
            <CategoryCircles />
          </div>
        </section>

        {/* Street features — two large editorial blocks */}
        <section className="container mt-20 md:mt-28">
          <SectionHeader
            kicker="شوارع السوق"
            title="مسارات بغداد المرجعية"
            description="شارعا الصناعة والربيعي يشكلان قلب سوق الإلكترونيات. ابدأ منهما."
          />

          <div className="mt-10 grid gap-8">
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
        <section className="container mt-20 md:mt-24">
          <Link
            to="/iraq"
            className="atlas-card group block p-8 text-right md:p-12"
          >
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div>
                <span className="atlas-kicker">تغطية وطنية</span>
                <h2 className="font-display mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl md:text-5xl tracking-tight">
                  نفس لغة السوق <br /> في كل المحافظات.
                </h2>
                <p className="mt-4 max-w-3xl text-base leading-8 text-muted-foreground">
                  بغداد، أربيل، البصرة، الموصل، النجف، كربلاء، السليمانية، كركوك، بعقوبة،
                  والناصرية ضمن مسار واحد يختصر الوصول من الفكرة إلى المحل.
                </p>
              </div>

              <div className="flex items-center gap-4 border-t border-border pt-4 md:border-0 md:pt-0">
                <span className="font-display text-xl font-bold text-foreground group-hover:text-primary">
                  افتح الأطلس
                </span>
                <ArrowLeft className="icon-nudge-x h-5 w-5 text-foreground group-hover:text-primary" />
              </div>
            </div>
          </Link>
        </section>

        {/* Product rails */}
        <section className="container mt-20 space-y-10 md:mt-28">
          <SectionHeader
            kicker="رفوف جاهزة"
            title="مسارات تصفح بدل البداية من الصفر"
            description="رفوف تجمع أكثر نوايا التصفح تكراراً: التخفيضات، الأكثر تقييماً، وما دخل أخيراً."
          />

          <ProductRail title="أفضل التخفيضات" seeAllTo="/results" products={deals} />
          <ProductRail title="الأكثر تقييماً" seeAllTo="/results" products={trending} />
          <ProductRail title="إضافات حديثة" seeAllTo="/results" products={newArrivals} />
        </section>

        {/* Featured shops */}
        <section className="container mt-20 md:mt-28">
          <SectionHeader
            kicker="محلات مختارة"
            title="محلات تستحق أن تبدأ منها"
            seeAll="/results"
            description="قراءة أسرع للمحلات الأوثق والأكثر حضوراً داخل السوق."
          />

          <div className="mt-10">
            {loading ? (
              <ShopCardSkeletonGrid count={6} />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
            )}
          </div>
        </section>

        {/* Brands + How it works + Metrics */}
        <section className="container mt-20 grid gap-12 md:mt-28 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:items-start">
          <div>
            <SectionHeader
              kicker="الوكلاء الرسميون"
              title="براندات بصورة أوضح"
              description="دليل أولي للوكلاء المعتمدين في العراق، مع انتقال أسرع بين البراند والفروع."
              seeAll="/brands"
            />

            <div className="mt-8">
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

          <div className="space-y-10 lg:sticky lg:top-24">
            <HowItWorks />
            <div>
              <span className="atlas-kicker">المؤشرات</span>
              <h3 className="font-display mt-4 text-2xl font-bold text-foreground">آخر قراءة للأطلس</h3>
              <div className="mt-6">
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
    <div className="pb-6 border-b border-border">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="max-w-3xl text-right">
          <span className="atlas-kicker">{kicker}</span>
          <h2 className="font-display mt-3 text-2xl font-semibold leading-tight text-foreground sm:text-3xl md:text-4xl tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="mt-3 text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">{description}</p>
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
