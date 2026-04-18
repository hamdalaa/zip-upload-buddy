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
        <section className="container relative z-10 -mt-10 md:-mt-16">
          <div className="atlas-panel p-6 md:p-8">
            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-center">
              <div className="text-right">
                <span className="eyebrow">مدخل الفئات</span>
                <h2 className="font-display mt-4 text-3xl font-bold leading-none text-foreground sm:text-4xl md:text-5xl">
                  ابدأ من القسم الأقرب لحاجتك
                </h2>
                <p className="mt-4 text-sm leading-8 text-muted-foreground">
                  بدل البحث العشوائي، اختَر الفئة أولاً ثم خلّ التصفية تكمل المشوار. هذا المسار يخلي صفحة النتائج أضيق
                  وأوضح من أول ضغطة.
                </p>
                <Link to="/results" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent">
                  كل النتائج والفئات
                  <ArrowLeft className="icon-nudge-x h-4 w-4" />
                </Link>
              </div>

              <CategoryCircles />
            </div>
          </div>
        </section>

        <section className="container mt-12 space-y-8 md:mt-16">
          <StreetShopsSection
            area="شارع الصناعة"
            title="مسار شارع الصناعة"
            subtitle="واجهة أوضح لأهم محلات الحاسبات والقطع والشبكات، مرتبة كمسار تنقل لا كقائمة مبعثرة."
          />

          <StreetShopsSection
            area="شارع الربيعي"
            title="مسار شارع الربيعي"
            subtitle="مدخل سريع للهواتف والشواحن والإكسسوارات، مع قراءة أنظف للمحلات قبل فتح التفاصيل."
          />

          <Link
            to="/iraq"
            className="atlas-panel group block overflow-hidden px-6 py-7 transition-transform duration-300 hover:-translate-y-1 md:px-8"
          >
            <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
              <div className="text-right">
                <span className="atlas-kicker">تغطية وطنية</span>
                <h2 className="font-display mt-4 text-3xl font-bold leading-none text-foreground sm:text-4xl md:text-5xl">
                  نفس لغة السوق في كل المحافظات
                </h2>
                <p className="mt-4 max-w-3xl text-sm leading-8 text-muted-foreground">
                  بغداد، أربيل، البصرة، الموصل، النجف، كربلاء، السليمانية، كركوك، بعقوبة، والناصرية ضمن مسار واحد
                  يختصر الوصول من الفكرة إلى المحل.
                </p>
              </div>

              <div className="flex items-center justify-between rounded-[1.5rem] border border-border/75 bg-background px-5 py-4 text-right">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">كل العراق</div>
                  <div className="mt-2 text-sm font-semibold text-foreground">افتح المحافظات</div>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>
            </div>
          </Link>
        </section>

        <section className="container mt-16 space-y-6 md:mt-20">
          <div className="max-w-3xl text-right">
            <span className="eyebrow">رفوف جاهزة</span>
            <h2 className="font-display mt-4 text-3xl font-bold leading-none text-foreground sm:text-4xl md:text-5xl">
              مسارات تصفح جاهزة بدل البداية من الصفر
            </h2>
            <p className="mt-4 text-sm leading-8 text-muted-foreground">
              رفوف تجمع أكثر نوايا التصفح تكراراً: التخفيضات الأعلى، المنتجات الأكثر تقييماً، وما دخل الفهرس أخيراً.
            </p>
          </div>

          <ProductRail title="أفضل التخفيضات" seeAllTo="/results" products={deals} />
          <ProductRail title="الأكثر تقييماً" seeAllTo="/results" products={trending} />
          <ProductRail title="إضافات حديثة" seeAllTo="/results" products={newArrivals} />
        </section>

        <section className="container mt-16 md:mt-20">
          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl text-right">
              <span className="eyebrow">محلات مختارة</span>
              <h2 className="font-display mt-4 text-3xl font-bold leading-none text-foreground sm:text-4xl md:text-5xl">
                محلات تستحق أن تبدأ منها
              </h2>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                قراءة أسرع للمحلات الأوثق أو الأكثر حضوراً داخل السوق، مع إبقاء التصفح مفتوحاً على بقية النتائج.
              </p>
            </div>

            <Link to="/results" className="link-underline text-sm font-semibold text-accent md:mb-2">
              كل المحلات
            </Link>
          </div>

          {loading ? (
            <ShopCardSkeletonGrid count={6} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        </section>

        <section className="container mt-16 grid gap-8 md:mt-20 lg:grid-cols-[minmax(0,1.08fr)_360px] lg:items-start">
          <div>
            <div className="mb-6 max-w-2xl text-right">
              <span className="eyebrow">الوكلاء</span>
              <h2 className="font-display mt-4 text-3xl font-bold leading-none text-foreground sm:text-4xl md:text-5xl">
                براندات ووكلاء بصورة أوضح
              </h2>
              <p className="mt-4 text-sm leading-8 text-muted-foreground">
                دليل أولي للوكلاء الرسميين في العراق، مع انتقال أسرع بين البراند، الموزع، والفروع المعتمدة.
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Skeleton key={index} className="h-[140px] rounded-[1.8rem]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {brands.map((brand, index) => (
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

          <div className="space-y-6">
            <HowItWorks />
            <MetricsStrip />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Index;
