import { type ReactNode, useMemo } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Home, MapPin, Search, Sparkles, ShieldCheck, Store } from "lucide-react";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Seo } from "@/components/Seo";
import { BrandLogoTile } from "@/components/BrandLogoTile";
import { CITIES } from "@/lib/cityData";
import { useDataStore } from "@/lib/dataStore";
import { OFFICIAL_DEALER_BRANCHES } from "@/lib/officialDealers";
import type { BrandDealer } from "@/lib/types";
import { itemListJsonLd } from "@/lib/seo";

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

const GLOBAL_BRAND_NAMES: Record<(typeof GLOBAL_BRAND_PRIORITY)[number], string> = {
  apple: "Apple",
  samsung: "Samsung",
  honor: "HONOR",
  huawei: "Huawei",
  xiaomi: "Xiaomi",
  oppo: "OPPO",
  vivo: "vivo",
  realme: "realme",
  oneplus: "OnePlus",
  motorola: "Motorola",
  nokia: "Nokia",
  google: "Google",
  sony: "Sony",
  lg: "LG",
  asus: "ASUS",
  acer: "Acer",
  lenovo: "Lenovo",
  hp: "HP",
  dell: "Dell",
  msi: "MSI",
  intel: "Intel",
  amd: "AMD",
  nvidia: "NVIDIA",
  gigabyte: "Gigabyte",
  corsair: "Corsair",
  "cooler-master": "Cooler Master",
  deepcool: "DeepCool",
  thermaltake: "Thermaltake",
  logitech: "Logitech",
  razer: "Razer",
  anker: "Anker",
  ugreen: "UGREEN",
  jbl: "JBL",
  bose: "Bose",
  beats: "Beats",
  canon: "Canon",
  nikon: "Nikon",
  epson: "Epson",
  "tp-link": "TP-Link",
  sandisk: "SanDisk",
};

const ADDITIONAL_DEVICE_BRANDS = [
  { slug: "nintendo", brandName: "Nintendo" },
  { slug: "playstation", brandName: "PlayStation" },
  { slug: "xbox", brandName: "Xbox" },
  { slug: "amazon-kindle", brandName: "Kindle" },
  { slug: "meta", brandName: "Meta" },
  { slug: "htc-vive", brandName: "HTC Vive" },
] as const;

const normalizeBrandKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");
const normalizeTextValue = (value: string) => value.toLowerCase().trim();

const isDisplayableBrand = (brand: EnrichedBrand) =>
  brand.productCount > 0 ||
  brand.storeCount > 0 ||
  brand.branchCount > 0 ||
  brand.cityCount > 0;

function makeSyntheticBrand(slug: string, brandName: string): EnrichedBrand {
  return {
    slug,
    brandName,
    dealerName: "",
    contactPhones: [],
    cities: [],
    coverage: "",
    verificationStatus: "unverified",
    createdAt: "",
    updatedAt: "",
    branchCount: 0,
    cityCount: 0,
    storeCount: 0,
    productCount: 0,
  };
}

function hasBrandData(brand: EnrichedBrand | BrandDealer) {
  const enriched = brand as Partial<EnrichedBrand>;
  return Boolean(
    (enriched.productCount ?? 0) > 0 ||
    (enriched.storeCount ?? 0) > 0 ||
    (enriched.branchCount ?? 0) > 0 ||
    (enriched.cityCount ?? 0) > 0,
  );
}

const CITY_ALIASES = [
  ...CITIES.map((city) => ({ key: normalizeTextValue(city.city), label: city.cityAr || city.city })),
  { key: "babil", label: "بابل" },
  { key: "babylon", label: "بابل" },
] as const;

function extractCityLabel(address?: string) {
  const normalized = normalizeTextValue(address ?? "");
  if (!normalized) return undefined;

  const match = CITY_ALIASES.find((entry) => normalized.includes(entry.key));
  return match?.label;
}

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

  const topGlobalBrands = useMemo<EnrichedBrand[]>(() => {
    const picked = new Map<string, EnrichedBrand>();

    for (const preferred of GLOBAL_BRAND_PRIORITY) {
      const preferredKey = normalizeBrandKey(preferred);
      const match = enrichedBrands.find((brand) => {
        const slugKey = normalizeBrandKey(brand.slug);
        const nameKey = normalizeBrandKey(brand.brandName);
        return slugKey === preferredKey || nameKey === preferredKey;
      });
      picked.set(match?.slug ?? preferred, match && isDisplayableBrand(match)
        ? match
        : makeSyntheticBrand(preferred, GLOBAL_BRAND_NAMES[preferred]));
    }

    return [...picked.values()].slice(0, 40);
  }, [enrichedBrands]);

  const supplementalDeviceBrands = useMemo<BrandDealer[]>(() => {
    const existingKeys = new Set(
      enrichedBrands.flatMap((brand) => [normalizeBrandKey(brand.slug), normalizeBrandKey(brand.brandName)]),
    );

    return ADDITIONAL_DEVICE_BRANDS
      .filter((brand) => !existingKeys.has(normalizeBrandKey(brand.slug)) && !existingKeys.has(normalizeBrandKey(brand.brandName)))
      .map((brand) => ({
        slug: brand.slug,
        brandName: brand.brandName,
        dealerName: "",
        contactPhones: [],
        cities: [],
        coverage: "",
        verificationStatus: "unverified" as const,
        createdAt: "",
        updatedAt: "",
        storeCount: 0,
        productCount: 0,
      }));
  }, [enrichedBrands]);

  const visibleBrandSlugs = useMemo(
    () => new Set(topGlobalBrands.map((brand) => brand.slug)),
    [topGlobalBrands],
  );

  const displayedBrandCount = topGlobalBrands.length + supplementalDeviceBrands.length;

  const displayedBranchCount = useMemo(
    () => OFFICIAL_DEALER_BRANCHES.filter((branch) => visibleBrandSlugs.has(branch.brandSlug)).length,
    [visibleBrandSlugs],
  );

  const displayedCityCount = useMemo(() => {
    const cityLabels = new Set<string>();

    topGlobalBrands.forEach((brand) => {
      brand.cities.forEach((city) => {
        if (city) cityLabels.add(city);
      });
    });

    OFFICIAL_DEALER_BRANCHES
      .filter((branch) => visibleBrandSlugs.has(branch.brandSlug))
      .forEach((branch) => {
        const label = extractCityLabel(branch.address);
        if (label) cityLabels.add(label);
      });

    return cityLabels.size;
  }, [topGlobalBrands, visibleBrandSlugs]);

  return (
    <div className="min-h-screen flex flex-col atlas-shell">
      <Seo
        title="براندات الإلكترونيات في العراق — وكلاء ومنتجات"
        description="استكشف أشهر براندات الإلكترونيات في العراق، من Apple وSamsung إلى ASUS وAnker وHP، مع منتجات ومتاجر وفروع موثوقة داخل حاير."
        path="/brands"
        structuredData={itemListJsonLd(
          topGlobalBrands.slice(0, 20).map((brand) => ({
            name: brand.brandName,
            path: `/brand/${encodeURIComponent(brand.slug)}`,
            description: `${formatCount(brand.productCount)} منتج • ${formatCount(brand.storeCount + brand.branchCount)} متجر أو فرع`,
          })),
        )}
      />
      <TopNav />

      <div className="border-b border-border bg-background">
        <div className="container flex items-center gap-2 overflow-x-auto whitespace-nowrap py-2.5 text-xs text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1 transition-colors hover:text-primary">
            <Home className="h-3 w-3" />
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="font-semibold text-foreground">وكلاء البراندات</span>
        </div>
      </div>

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden border-b border-border/60 bg-gradient-to-b from-primary/5 via-background to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]"
        />
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-24 -right-12 h-72 w-72 rounded-full bg-accent-cyan/10 blur-3xl" />

        <div className="container relative py-10 sm:py-14 md:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] font-semibold text-primary">
              <Sparkles className="h-3 w-3" />
              الوكلاء الرسميون في العراق
            </span>
            <h1 className="font-display mt-4 text-balance text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl md:text-5xl">
              اشترِ من <span className="text-primary">المصدر الموثوق</span>
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
              وكلاء معتمدون رسمياً مع تغطية واضحة للفروع والمدن.
            </p>
          </div>

          <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-2 sm:gap-3">
            <HeroStat value={formatCount(displayedBrandCount)} label="براند" icon={<ShieldCheck className="h-3.5 w-3.5 text-primary" />} />
            <HeroStat value={formatCount(displayedBranchCount)} label="فرع رسمي" icon={<Store className="h-3.5 w-3.5 text-primary" />} />
            <HeroStat value={formatCount(displayedCityCount)} label="مدن" icon={<MapPin className="h-3.5 w-3.5 text-primary" />} />
          </div>
        </div>
      </section>

      <main className="container flex-1 py-6 md:py-10">
        {/* ===== ALL BRANDS — logo-first dense grid ===== */}
        {enrichedBrands.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-[2rem] border border-border/56 bg-card/88 p-4 shadow-[0_24px_80px_-58px_rgba(23,32,23,0.35),inset_0_1px_0_rgba(255,255,255,0.78)] backdrop-blur-xl sm:p-6">
            <div className="rounded-[1.6rem] bg-surface/72 px-5 py-8 text-center shadow-[inset_0_0_0_1px_hsl(var(--border)/0.34)] sm:px-8 sm:py-10">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-primary-soft text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
                <ShieldCheck className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h2 className="mt-5 text-xl font-black text-foreground">البراندات قيد التحديث</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted-foreground">
                تقدر تكمل البحث بالمنتجات والمتاجر حالياً، ونربط الوكلاء الرسميين أول ما توصل بياناتهم.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
                <Link
                  to="/search"
                  className="ios-tap inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-sm font-bold text-background shadow-[0_16px_34px_-26px_rgba(15,23,42,0.7)]"
                >
                  <Search className="h-4 w-4" />
                  افتح البحث
                </Link>
                <Link
                  to="/"
                  className="ios-tap inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-bold text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.42)]"
                >
                  رجوع للرئيسية
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <SectionHeader
              title="كل البراندات"
              subtitle="اختَر أي براند حتى تشوف الفروع والمنتجات المرتبطة بيه."
              count={topGlobalBrands.length}
            />
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
              {topGlobalBrands.map((brand, idx) => (
                <BrandLogoTile
                  key={brand.slug}
                  brand={brand}
                  branchCount={brand.branchCount}
                  eager={idx < 12}
                  to={hasBrandData(brand) ? `/brand/${brand.slug}` : `/search?q=${encodeURIComponent(brand.brandName)}`}
                />
              ))}
            </div>

            {supplementalDeviceBrands.length > 0 && (
              <section className="mt-12 sm:mt-16">
                <SectionHeader
                  title="براندات أجهزة إضافية"
                  subtitle="براندات أجهزة مشهورة مو ظاهرة بالبيانات الحالية — الضغط يفتح البحث عنها."
                  count={supplementalDeviceBrands.length}
                />
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8">
                  {supplementalDeviceBrands.map((brand, idx) => (
                    <BrandLogoTile
                      key={`extra-${brand.slug}`}
                      brand={brand}
                      eager={idx < 8}
                      to={`/search?q=${encodeURIComponent(brand.brandName)}`}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  meta,
  count,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  count?: number;
}) {
  return (
    <div className="mb-5 flex flex-col gap-2 border-b border-border/60 pb-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
          {title}
          {typeof count === "number" && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold tabular-nums text-primary">
              {formatCount(count)}
            </span>
          )}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {meta && (
        <div className="text-xs font-medium text-muted-foreground">{meta}</div>
      )}
    </div>
  );
}

function HeroStat({
  value,
  label,
  icon,
}: {
  value: string;
  label: string;
  icon: ReactNode;
}) {
  return (
    <div className="min-w-[84px] rounded-[1.35rem] border border-white/70 bg-white/85 px-3 py-3 text-center shadow-soft-sm backdrop-blur-md">
      <div className="mb-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary-soft">
        {icon}
      </div>
      <div className="text-base font-bold tabular-nums text-foreground">{value}</div>
      <div className="mt-0.5 text-[11px] font-medium text-muted-foreground">{label}</div>
    </div>
  );
}
