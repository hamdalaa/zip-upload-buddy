import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Home, MapPin, ShieldCheck, Store } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { useDataStore } from "@/lib/dataStore";
import { OFFICIAL_DEALER_BRANCHES } from "@/lib/officialDealers";
import { useBrandLogo } from "@/hooks/useBrandLogo";
import type { BrandDealer } from "@/lib/types";

const arabicNumber = new Intl.NumberFormat("ar");
const formatCount = (value: number) => arabicNumber.format(value);

interface EnrichedBrand extends BrandDealer {
  branchCount: number;
  cityCount: number;
  storeCount: number;
  productCount: number;
}

function toCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

const PC_PARTS_PRIORITY = [
  "asus",
  "adata",
  "lenovo",
  "hp",
  "msi",
  "gigabyte",
  "logitech",
  "razer",
  "corsair",
  "xpg",
  "wd",
  "seagate",
  "amd",
  "cooler-master",
  "deepcool",
] as const;

const PC_PARTS_KEYWORDS = [
  /asus/i,
  /adata/i,
  /lenovo/i,
  /\bhp\b/i,
  /msi/i,
  /gigabyte/i,
  /logitech/i,
  /razer/i,
  /corsair/i,
  /\bxpg\b/i,
  /\bwd\b|western digital/i,
  /seagate/i,
  /\bamd\b/i,
  /cooler master/i,
  /deepcool/i,
  /a4tech/i,
  /redragon/i,
  /thermaltake/i,
  /arctic/i,
  /\bpny\b/i,
  /lexar/i,
  /hyperx/i,
  /dell/i,
];

const GLOBAL_BRAND_PRIORITY = [
  "apple",
  "samsung",
  "honor",
  "huawei",
  "xiaomi",
  "oppo",
  "vivo",
  "realme",
  "oneplus",
  "motorola",
  "nokia",
  "google",
  "sony",
  "lg",
  "asus",
  "acer",
  "lenovo",
  "hp",
  "dell",
  "msi",
  "intel",
  "amd",
  "nvidia",
  "gigabyte",
  "corsair",
  "cooler-master",
  "deepcool",
  "thermaltake",
  "logitech",
  "razer",
  "anker",
  "ugreen",
  "jbl",
  "bose",
  "beats",
  "canon",
  "nikon",
  "epson",
  "tp-link",
  "sandisk",
] as const;

const normalizeBrandKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

const isDisplayableBrand = (brand: EnrichedBrand) =>
  brand.productCount > 0 ||
  brand.storeCount > 0 ||
  brand.branchCount > 0 ||
  brand.cityCount > 0;

export default function Brands() {
  const { brands } = useDataStore();

  const enrichedBrands = useMemo<EnrichedBrand[]>(
    () =>
      brands
        .map((brand) => ({
          ...brand,
          branchCount: OFFICIAL_DEALER_BRANCHES.filter((entry) => entry.brandSlug === brand.slug).length,
          cityCount: brand.cities.length,
          storeCount: toCount((brand as BrandDealer & { storeCount?: number }).storeCount),
          productCount: toCount((brand as BrandDealer & { productCount?: number }).productCount),
        }))
        .sort((a, b) => {
          if (b.branchCount !== a.branchCount) return b.branchCount - a.branchCount;
          if (b.cityCount !== a.cityCount) return b.cityCount - a.cityCount;
          return a.brandName.localeCompare(b.brandName);
        }),
    [brands],
  );

  const curatedBrands = useMemo<EnrichedBrand[]>(() => {
    const picked = new Map<string, EnrichedBrand>();

    for (const preferred of PC_PARTS_PRIORITY) {
      const match = enrichedBrands.find(
        (brand) => brand.slug === preferred || brand.brandName.toLowerCase() === preferred,
      );
      if (match) picked.set(match.slug, match);
    }

    const secondary = enrichedBrands
      .filter((brand) => !picked.has(brand.slug))
      .filter((brand) =>
        PC_PARTS_KEYWORDS.some((pattern) => pattern.test(brand.brandName) || pattern.test(brand.slug)),
      )
      .sort((a, b) => b.productCount - a.productCount || b.storeCount - a.storeCount || a.brandName.localeCompare(b.brandName));

    for (const brand of secondary) {
      if (picked.size >= 15) break;
      picked.set(brand.slug, brand);
    }

    return [...picked.values()].slice(0, 15);
  }, [enrichedBrands]);

  const totalProducts = useMemo(
    () => curatedBrands.reduce((sum, brand) => sum + brand.productCount, 0),
    [curatedBrands],
  );

  const totalStores = useMemo(
    () => curatedBrands.reduce((sum, brand) => sum + brand.storeCount, 0),
    [curatedBrands],
  );

  const totalOfficialBranches = useMemo(
    () => curatedBrands.reduce((sum, brand) => sum + brand.branchCount, 0),
    [curatedBrands],
  );

  const topGlobalBrands = useMemo<EnrichedBrand[]>(() => {
    const picked = new Map<string, EnrichedBrand>();

    for (const preferred of GLOBAL_BRAND_PRIORITY) {
      const match = enrichedBrands.find((brand) => {
        const slugKey = normalizeBrandKey(brand.slug);
        const nameKey = normalizeBrandKey(brand.brandName);
        const preferredKey = normalizeBrandKey(preferred);
        return slugKey === preferredKey || nameKey === preferredKey;
      });
      if (match && isDisplayableBrand(match)) picked.set(match.slug, match);
    }

    const secondary = enrichedBrands
      .filter((brand) => !picked.has(brand.slug))
      .filter(isDisplayableBrand)
      .sort(
        (a, b) =>
          b.productCount - a.productCount ||
          b.storeCount - a.storeCount ||
          b.branchCount - a.branchCount ||
          a.brandName.localeCompare(b.brandName),
      );

    for (const brand of secondary) {
      if (picked.size >= 40) break;
      picked.set(brand.slug, brand);
    }

    return [...picked.values()].slice(0, 40);
  }, [enrichedBrands]);

  const totalBranches = useMemo(
    () => enrichedBrands.reduce((sum, brand) => sum + brand.branchCount, 0),
    [enrichedBrands],
  );

  const totalCities = useMemo(
    () => new Set(enrichedBrands.flatMap((brand) => brand.cities)).size,
    [enrichedBrands],
  );

  return (
    <div className="min-h-screen flex flex-col atlas-shell">
      <TopNav />

      {/* Breadcrumb */}
      <div className="bg-background border-b border-border">
        <div className="container py-2.5 flex items-center gap-2 text-xs text-muted-foreground overflow-x-auto whitespace-nowrap">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary transition-colors">
            <Home className="h-3 w-3" />
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground font-semibold">وكلاء البراندات</span>
        </div>
      </div>

      {/* Hero — same structure as /iraq */}
      <section className="border-b border-border/70 bg-gradient-to-b from-background to-muted/20">
        <div className="container py-8 md:py-10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
              دليل البراندات الرسمية
            </p>

            <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
              وكلاء البراندات
            </h1>

            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              تصفح البراندات، افتح صفحة الوكيل مباشرة، وشوف الفروع الرسمية والتغطية داخل العراق.
            </p>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-primary" />
                {formatCount(enrichedBrands.length)} براند
              </span>
              <span className="hidden text-border sm:inline">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Store className="h-4 w-4 text-primary" />
                {formatCount(totalBranches)} فرع
              </span>
              <span className="hidden text-border sm:inline">•</span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-primary" />
                {formatCount(totalCities)} مدن
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="flex-1 container py-6 md:py-10">
        {curatedBrands.length > 0 && (
          <section className="mb-10">
            <div className="mb-5 flex items-end justify-between gap-3 border-b border-border/70 pb-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">براندات قطع الحاسبات</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  اختيار سريع لـ 15 براند مرتبطة أكثر بالهاردوير وملحقات البيسي.
                </p>
              </div>
              <div className="hidden items-center gap-2 text-xs font-medium text-muted-foreground sm:inline-flex">
                <span>{formatCount(curatedBrands.length)} براند</span>
                <span>•</span>
                <span>{formatCount(totalProducts)} منتج</span>
                <span>•</span>
                <span>{formatCount(totalStores)} متجر</span>
                <span>•</span>
                <span>{formatCount(totalOfficialBranches)} فرع رسمي</span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {curatedBrands.map((brand, idx) => (
                <BrandTile key={`pc-${brand.slug}`} brand={brand} idx={idx} />
              ))}
            </div>
          </section>
        )}

        {enrichedBrands.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">ماكو براندات حالياً.</p>
          </div>
        ) : (
          <>
            <div className="mb-5 flex items-end justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">كل البراندات</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  أشهر 40 براند فقط لتخفيف الحمل وتسريع التصفح.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
              {topGlobalBrands.map((brand, idx) => (
                <BrandTile key={brand.slug} brand={brand} idx={idx} />
              ))}
            </div>
          </>
        )}

        <p className="mt-10 text-center text-xs text-muted-foreground">
          * قسم "كل البراندات" صار يعرض أشهر 40 براند فقط، بينما بقي قسم قطع الحاسبات كما هو.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}

function BrandTile({ brand, idx }: { brand: EnrichedBrand; idx: number }) {
  const logo = useBrandLogo(brand.slug, brand.brandName, "default");
  const dealerCount = brand.branchCount > 0 ? brand.branchCount : brand.storeCount;

  return (
    <Link
      to={`/brand/${brand.slug}`}
      className="group block rounded-[24px] border border-border/70 bg-card p-4 shadow-[0_10px_24px_-24px_rgba(15,23,42,0.28)] transition-colors duration-200 hover:border-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-5"
      aria-label={`عرض ${brand.brandName} — ${formatCount(dealerCount)} وكيل و${formatCount(brand.productCount)} منتج`}
    >
      <div className="rounded-[20px] border border-border/60 bg-muted/20 px-4 py-8 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[24px] border border-border/70 bg-white p-4 shadow-[0_8px_18px_-16px_rgba(15,23,42,0.28)]">
          {logo ? (
            <img
              src={logo}
              alt={`${brand.brandName} logo`}
              loading={idx < 6 ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-full object-contain"
            />
          ) : (
            <span className="font-display text-3xl font-bold text-foreground">
              {brand.brandName.slice(0, 1)}
            </span>
          )}
        </div>

        <h3 className="mt-4 truncate text-lg font-bold tracking-tight text-foreground">
          {brand.brandName}
        </h3>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <MetricBox value={formatCount(dealerCount)} label="وكلاء" />
        <MetricBox value={formatCount(brand.productCount)} label="منتجات" />
      </div>
    </Link>
  );
}

function MetricBox({
  value,
  label,
}: {
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-[18px] border border-border/60 bg-background px-3 py-3 text-center">
      <div className="text-lg font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-1 text-xs font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
