import { Link, useParams } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { useDataStore } from "@/lib/dataStore";
import { OFFICIAL_DEALER_BRANCHES } from "@/lib/officialDealers";
import { getBrandLogo, getTheSvgUrl } from "@/lib/brandLogos";
import { getBrandBackground } from "@/lib/brandBackgrounds";
import {
  ChevronLeft,
  ExternalLink,
  Phone,
  Home,
  ShieldCheck,
  MapPin,
  Store,
  Globe,
  Building2,
  Package,
} from "lucide-react";

const Brand = () => {
  const { slug } = useParams<{ slug: string }>();
  const { brands, products } = useDataStore();
  const brand = brands.find((b) => b.slug === slug);

  if (!brand) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <TopNav />
        <main className="flex-1 container py-12">
          <EmptyState
            title="البراند غير موجود"
            action={
              <Button asChild variant="outline">
                <Link to="/brands">كل البراندات</Link>
              </Button>
            }
          />
        </main>
        <SiteFooter />
      </div>
    );
  }

  const related = products.filter(
    (p) => p.brand?.toLowerCase() === brand.brandName.toLowerCase(),
  );
  const branches = OFFICIAL_DEALER_BRANCHES.filter((b) => b.brandSlug === brand.slug);
  const isVerified = brand.verificationStatus === "verified";
  const logo = getBrandLogo(brand.slug);
  const cdnLogo = getTheSvgUrl(brand.slug, "default");
  const background = getBrandBackground(brand.slug);
  const initial = brand.brandName.slice(0, 1);

  return (
    <div className="min-h-screen flex flex-col bg-[linear-gradient(180deg,hsl(var(--surface))_0%,hsl(var(--background))_14%,hsl(var(--surface))_100%)]">
      <TopNav />

      {/* Breadcrumbs */}
      <div className="bg-background border-b border-border">
        <div className="container flex items-center gap-2 overflow-x-auto whitespace-nowrap py-2.5 text-xs text-muted-foreground">
          <Link to="/" className="inline-flex items-center gap-1 hover:text-primary">
            <Home className="h-3 w-3" />
            الرئيسية
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <Link to="/brands" className="hover:text-primary">
            وكلاء البراندات
          </Link>
          <ChevronLeft className="h-3 w-3" />
          <span className="text-foreground">{brand.brandName}</span>
        </div>
      </div>

      {/* HERO — split layout: image showcase + glass content card */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-40 -left-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -right-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />

        <div className="container relative py-8 md:py-12">
          <div className="grid items-stretch gap-6 lg:grid-cols-[1.1fr_1fr]">
            {/* LEFT: Premium image showcase */}
            {background ? (
              <div className="group relative order-2 overflow-hidden rounded-[2rem] border border-border/60 shadow-soft-xl lg:order-1 min-h-[280px] md:min-h-[360px]">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105"
                  style={{ backgroundImage: `url(${background})` }}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" aria-hidden />
                <div className="absolute bottom-4 left-4 z-10 inline-flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-semibold text-white backdrop-blur-md ring-1 ring-white/20">
                  <Store className="h-3.5 w-3.5" />
                  معرض رسمي
                </div>
              </div>
            ) : (
              <div className="relative order-2 overflow-hidden rounded-[2rem] border border-border/60 bg-gradient-to-br from-primary/15 via-accent/10 to-background shadow-soft-xl lg:order-1 min-h-[280px] md:min-h-[360px]">
                <div className="absolute inset-0 bg-grid opacity-30" />
                <div className="flex h-full w-full items-center justify-center">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-background shadow-soft-lg">
                    {cdnLogo ? (
                      <img src={cdnLogo} alt={brand.brandName} className="h-full w-full object-contain p-5" />
                    ) : logo ? (
                      <img src={logo} alt={brand.brandName} className="h-full w-full object-contain p-4" />
                    ) : (
                      <span className="font-display text-5xl font-bold">{initial}</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* RIGHT: Glass content card */}
            <div className="relative order-1 flex flex-col rounded-[2rem] border border-border/60 bg-card/90 p-6 shadow-soft-xl backdrop-blur-md md:p-8 lg:order-2">
              {/* Header row: logo lockup + verified pill */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-4">
                  {/* Logo tile */}
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background shadow-soft-md md:h-20 md:w-20">
                    {cdnLogo ? (
                      <img
                        src={cdnLogo}
                        alt={`${brand.brandName} logo`}
                        loading="lazy"
                        className="h-full w-full object-contain p-2.5"
                      />
                    ) : logo ? (
                      <img
                        src={logo}
                        alt={`${brand.brandName} logo`}
                        loading="lazy"
                        className="h-full w-full object-contain p-2.5"
                      />
                    ) : (
                      <span className="font-display text-2xl font-bold">{initial}</span>
                    )}
                  </div>

                  {/* Title + dealer */}
                  <div className="min-w-0">
                    <h1 className="font-display text-2xl font-bold leading-tight tracking-tight md:text-3xl lg:text-4xl">
                      {brand.brandName}
                    </h1>
                    <div className="mt-1 text-xs text-muted-foreground md:text-sm">
                      الموزع المعتمد:{" "}
                      <span className="font-semibold text-foreground">{brand.dealerName}</span>
                    </div>
                  </div>
                </div>

                {isVerified && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-success/15 px-2.5 py-1 text-[11px] font-bold text-success ring-1 ring-success/30">
                    <ShieldCheck className="h-3 w-3" />
                    موثّق
                  </span>
                )}
              </div>

              {/* Description */}
              <p className="mt-5 text-sm leading-relaxed text-foreground/80 md:text-[15px]">
                {brand.coverage}
              </p>

              {/* Actions */}
              <div className="mt-5 flex flex-wrap gap-2">
                {brand.website && (
                  <Button
                    asChild
                    size="sm"
                    className="gap-1.5 bg-primary text-primary-foreground shadow hover:bg-primary/90"
                  >
                    <a href={brand.website} target="_blank" rel="noreferrer noopener">
                      <Globe className="h-4 w-4" />
                      الموقع الرسمي
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  </Button>
                )}
                {brand.contactPhones.map((ph) => (
                  <Button key={ph} asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={`tel:${ph}`} dir="ltr">
                      <Phone className="h-4 w-4" />
                      {ph}
                    </a>
                  </Button>
                ))}
              </div>

              {/* Cities */}
              {brand.cities.length > 0 && (
                <div className="mt-5 border-t border-border/70 pt-4">
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    التغطية الجغرافية
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {brand.cities.map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-background/70 px-2.5 py-0.5 text-xs"
                      >
                        <MapPin className="h-3 w-3 text-primary" />
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats — full width below */}
          <div className="mt-6 grid grid-cols-2 gap-2.5 md:grid-cols-4">
            <StatTile icon={Building2} value={branches.length} label="فرع رسمي" />
            <StatTile icon={MapPin} value={brand.cities.length} label="مدينة" />
            <StatTile icon={Package} value={related.length} label="منتج مفهرس" />
            <StatTile
              icon={ShieldCheck}
              value={isVerified ? "✓" : "—"}
              label={isVerified ? "موثّق" : "قيد التحقق"}
              accent={isVerified}
            />
          </div>
        </div>
      </section>

      <main className="flex-1 container py-6 space-y-6 md:py-8">
        {/* OFFICIAL BRANCHES */}
        {branches.length > 0 && (
          <section className="rounded-[1.75rem] border border-border/70 bg-card/85 p-5 shadow-soft-lg backdrop-blur-sm md:p-6">
            <header className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-3">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Store className="h-5 w-5 text-primary" />
                  الفروع الرسمية
                  <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">
                    {branches.length}
                  </span>
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  وكلاء معتمدون من {brand.brandName} — مصدر القائمة: الموقع الرسمي، تحقق عبر Google Places.
                </p>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((b) => (
                <article
                  key={b.id}
                  className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-border/70 bg-background/85 transition-all duration-500 hover:-translate-y-1 hover:border-primary/35 hover:shadow-soft-xl"
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {b.mainImage ? (
                      <img
                        src={b.mainImage}
                        alt={b.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/10">
                        <Store className="h-12 w-12 text-primary/40" />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-success/90 backdrop-blur px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow">
                      <ShieldCheck className="h-3 w-3" />
                      رسمي
                    </span>
                  </div>

                  <div className="flex flex-col flex-1 p-3.5 gap-2">
                    <h3 className="font-bold text-sm leading-tight line-clamp-2">{b.name}</h3>

                    {b.address && (
                      <div className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                        <MapPin className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                        <span className="line-clamp-2">{b.address}</span>
                      </div>
                    )}

                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
                      <Link
                        to={`/shop-view/${b.id}`}
                        className="inline-flex flex-1 min-w-0 items-center justify-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-1.5 text-xs font-semibold hover:bg-primary/90 transition-colors"
                      >
                        تفاصيل المحل
                      </Link>
                      {b.googleMapsUrl && (
                        <a
                          href={b.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label="فتح الخريطة"
                          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                        </a>
                      )}
                      {b.phone && (
                        <a
                          href={`tel:${b.phone.replace(/\s+/g, "")}`}
                          aria-label="اتصال"
                          className="inline-flex items-center justify-center rounded-md border border-border bg-background px-2 py-1.5 text-xs font-medium hover:border-primary hover:text-primary transition-colors"
                        >
                          <Phone className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* PRODUCTS */}
        <section className="rounded-[1.75rem] border border-border/70 bg-card/85 p-5 shadow-soft-lg backdrop-blur-sm md:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold border-b border-border pb-3">
            <Package className="h-5 w-5 text-primary" />
            منتجات {brand.brandName} على تايه
            {related.length > 0 && (
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-bold">
                {related.length}
              </span>
            )}
          </h2>
          {related.length === 0 ? (
            <EmptyState
              title="ماكو منتجات مفهرسة لهذا البراند بعد"
              description="رح نضيف منتجات قريباً من المحلات والوكلاء الرسميين."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={{ ...p, score: 0 }} />
              ))}
            </div>
          )}
        </section>

        {/* OTHER BRANDS */}
        <section className="rounded-[1.75rem] border border-border/70 bg-card/85 p-5 shadow-soft-lg backdrop-blur-sm md:p-6">
          <header className="mb-5 flex items-end justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                <Store className="h-5 w-5 text-primary" />
                براندات أخرى
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                اكتشف المزيد من الوكلاء الرسميين على تايه
              </p>
            </div>
            <Link
              to="/brands"
              className="hidden shrink-0 items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:inline-flex"
            >
              عرض الكل
              <ChevronLeft className="h-3.5 w-3.5" />
            </Link>
          </header>

          <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-4">
            {brands
              .filter((b) => b.slug !== brand.slug)
              .map((b) => {
                const bBranches = OFFICIAL_DEALER_BRANCHES.filter(
                  (x) => x.brandSlug === b.slug,
                ).length;
                const bLogo = getBrandLogo(b.slug);
                const bCdn = getTheSvgUrl(b.slug, "default");
                const bVerified = b.verificationStatus === "verified";
                return (
                  <Link
                    key={b.slug}
                    to={`/brand/${b.slug}`}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border/70 bg-background/85 p-3 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:bg-background hover:shadow-soft-lg"
                  >
                    {/* hover gradient wash */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/[0.06] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                    {/* Logo tile */}
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background shadow-soft-sm transition-transform duration-300 group-hover:scale-105">
                      {bCdn || bLogo ? (
                        <img
                          src={bCdn ?? bLogo}
                          alt={b.brandName}
                          loading="lazy"
                          className="h-full w-full object-contain p-1.5"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-primary font-display text-lg font-bold text-primary-foreground">
                          {b.brandName.slice(0, 1)}
                        </div>
                      )}
                      {bVerified && (
                        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-success text-success-foreground ring-2 ring-background">
                          <ShieldCheck className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>

                    {/* Text */}
                    <div className="relative min-w-0 flex-1">
                      <div className="truncate text-sm font-bold leading-tight transition-colors group-hover:text-primary">
                        {b.brandName}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {bBranches > 0 ? (
                          <>
                            <Building2 className="h-3 w-3 text-primary/70" />
                            <span className="truncate">{bBranches} فرع رسمي</span>
                          </>
                        ) : (
                          <span className="truncate">{b.dealerName}</span>
                        )}
                      </div>
                    </div>

                    {/* Chevron */}
                    <ChevronLeft className="relative h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:-translate-x-0.5 group-hover:text-primary" />
                  </Link>
                );
              })}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
};

function StatTile({
  icon: Icon,
  value,
  label,
  accent = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2.5 rounded-2xl border bg-background/80 p-3 backdrop-blur transition-colors ${
        accent ? "border-success/40" : "border-border"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
          accent ? "bg-success/15 text-success" : "bg-primary/10 text-primary"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="font-display text-xl font-bold leading-none">{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground truncate">{label}</div>
      </div>
    </div>
  );
}

export default Brand;
