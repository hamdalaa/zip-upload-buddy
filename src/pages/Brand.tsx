import { Link, useParams } from "react-router-dom";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { ProductCard } from "@/components/ProductCard";
import { useDataStore } from "@/lib/dataStore";
import { OFFICIAL_DEALER_BRANCHES } from "@/lib/officialDealers";
import { getBrandLogo } from "@/lib/brandLogos";
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
  const background = getBrandBackground(brand.slug);
  const initial = brand.brandName.slice(0, 1);
  const isApple = brand.slug === "apple";

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

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-background">
        {background ? (
          <>
            {/* Sharp background image */}
            <div
              className="pointer-events-none absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${background})` }}
              aria-hidden
            />
            {/* Subtle darkening for depth */}
            <div
              className="pointer-events-none absolute inset-0 bg-black/30"
              aria-hidden
            />
            {/* Directional gradient (RTL: readable side on the right) */}
            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-l from-background via-background/85 to-background/20"
              aria-hidden
            />
            {/* Bottom fade into page */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent"
              aria-hidden
            />
            {/* Premium glow accent */}
            <div className="pointer-events-none absolute -top-32 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 right-1/3 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
          </>
        ) : (
          <>
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
            <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />
          </>
        )}
        <div className="container relative py-8 md:py-10">
          <div className="flex flex-col items-start gap-5 md:flex-row md:items-center">
            {/* Logo tile */}
            <div className="relative shrink-0">
              <div className={`flex h-24 w-24 items-center justify-center rounded-3xl shadow-lg ring-4 ring-background overflow-hidden md:h-28 md:w-28 ${isApple ? "bg-foreground" : "bg-background"}`}>
                {logo ? (
                  <img
                    src={logo}
                    alt={`${brand.brandName} logo`}
                    loading="lazy"
                    className={`h-full w-full object-contain p-3 ${isApple ? "brightness-0 invert" : ""}`}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-primary font-display text-4xl font-bold text-primary-foreground md:text-5xl">
                    {initial}
                  </div>
                )}
              </div>
              {isVerified && (
                <span className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full bg-success px-2 py-0.5 text-[10px] font-bold text-success-foreground shadow ring-2 ring-background">
                  <ShieldCheck className="h-3 w-3" />
                  معتمد
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-3xl font-bold leading-tight md:text-4xl">
                  {brand.brandName}
                </h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 text-warning px-2.5 py-0.5 text-xs font-bold">
                    وكيل رسمي
                  </span>
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                الموزع: <span className="font-semibold text-foreground">{brand.dealerName}</span>
              </div>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-foreground/80">
                {brand.coverage}
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {brand.website && (
                  <Button
                    asChild
                    className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow"
                  >
                    <a href={brand.website} target="_blank" rel="noreferrer noopener">
                      <Globe className="h-4 w-4" />
                      الموقع الرسمي
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </a>
                  </Button>
                )}
                {brand.contactPhones.map((ph) => (
                  <Button key={ph} asChild variant="outline" className="gap-1.5">
                    <a href={`tel:${ph}`} dir="ltr">
                      <Phone className="h-4 w-4" />
                      {ph}
                    </a>
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Stats */}
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

          {brand.cities.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {brand.cities.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-2.5 py-0.5 text-xs backdrop-blur"
                >
                  <MapPin className="h-3 w-3 text-primary" />
                  {c}
                </span>
              ))}
            </div>
          )}
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
          <h2 className="mb-4 text-xl font-bold border-b border-border pb-3">براندات أخرى</h2>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
            {brands
              .filter((b) => b.slug !== brand.slug)
              .map((b) => {
                const bBranches = OFFICIAL_DEALER_BRANCHES.filter(
                  (x) => x.brandSlug === b.slug,
                ).length;
                const bLogo = getBrandLogo(b.slug);
                return (
                  <Link
                    key={b.slug}
                    to={`/brand/${b.slug}`}
                    className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-background/85 p-3 transition-all hover:border-primary/35 hover:shadow-soft-lg"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background overflow-hidden border border-border">
                      {bLogo ? (
                        <img
                          src={bLogo}
                          alt={b.brandName}
                          loading="lazy"
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-primary font-display text-lg font-bold text-primary-foreground">
                          {b.brandName.slice(0, 1)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1 text-sm font-semibold truncate">
                        {b.brandName}
                        {b.verificationStatus === "verified" && (
                          <ShieldCheck className="h-3 w-3 text-success shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {bBranches > 0 ? `${bBranches} فرع رسمي` : b.dealerName}
                      </div>
                    </div>
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
