import { Link } from "react-router-dom";
import { useDataStore } from "@/lib/dataStore";
import { useBrandLogo } from "@/hooks/useBrandLogo";
import type { ProductIndex } from "@/lib/types";

const GLOBAL_PRODUCT_BRANDS = [
  { slug: "apple", name: "Apple" },
  { slug: "samsung", name: "Samsung" },
  { slug: "xiaomi", name: "Xiaomi" },
  { slug: "huawei", name: "Huawei" },
  { slug: "oppo", name: "OPPO" },
  { slug: "vivo", name: "vivo" },
  { slug: "honor", name: "HONOR" },
  { slug: "realme", name: "realme" },
  { slug: "sony", name: "Sony" },
  { slug: "playstation", name: "PlayStation" },
  { slug: "xbox", name: "Xbox" },
  { slug: "microsoft", name: "Microsoft" },
  { slug: "asus", name: "ASUS" },
  { slug: "acer", name: "Acer" },
  { slug: "lenovo", name: "Lenovo" },
  { slug: "hp", name: "HP" },
  { slug: "dell", name: "Dell" },
  { slug: "msi", name: "MSI" },
  { slug: "intel", name: "Intel" },
  { slug: "amd", name: "AMD" },
  { slug: "nvidia", name: "NVIDIA" },
  { slug: "logitech", name: "Logitech" },
  { slug: "razer", name: "Razer" },
  { slug: "anker", name: "Anker" },
  { slug: "ugreen", name: "UGREEN" },
  { slug: "tp-link", name: "TP-Link" },
  { slug: "jbl", name: "JBL" },
  { slug: "bose", name: "Bose" },
  { slug: "canon", name: "Canon" },
  { slug: "epson", name: "Epson" },
] as const;

const BRAND_STRIP_LIMIT = 28;

type ProductBrand = {
  slug: string;
  brandName: string;
  productCount: number;
  famousRank: number;
};

const normalizeBrandKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "");

function slugifyBrand(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function countProductBrands(products: ProductIndex[]) {
  const counts = new Map<string, { label: string; count: number }>();

  for (const product of products) {
    const label = product.brand?.trim();
    if (!label) continue;
    const key = normalizeBrandKey(label);
    if (!key) continue;
    const current = counts.get(key);
    counts.set(key, {
      label: current?.label ?? label,
      count: (current?.count ?? 0) + 1,
    });
  }

  return counts;
}

function BrandLogoChip({ brand }: { brand: ProductBrand }) {
  const logo = useBrandLogo(brand.slug, brand.brandName, "default");
  const logoClassName = brand.slug === "apple" ? "brightness-0" : "";
  const href = `/search?brands=${encodeURIComponent(brand.brandName)}`;

  return (
    <Link
      to={href}
      aria-label={brand.brandName}
      className="group flex h-20 min-w-[8.25rem] w-full shrink-0 items-center justify-center rounded-[1.25rem] bg-card px-3 py-3 text-center ring-1 ring-border transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-1 hover:bg-white hover:shadow-[0_18px_42px_-34px_rgba(23,32,23,0.42)] sm:h-24 sm:px-4"
    >
      {logo ? (
        <img
          src={logo}
          alt={`${brand.brandName} logo`}
          loading="lazy"
          decoding="async"
          className={`max-h-[68%] w-auto max-w-[84%] object-contain transition-transform duration-300 group-hover:scale-105 ${logoClassName}`}
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="font-display text-base font-bold text-muted-foreground transition-colors group-hover:text-foreground">
          {brand.brandName}
        </span>
      )}
    </Link>
  );
}

export function BrandStrip() {
  const { products } = useDataStore();
  const productBrandCounts = countProductBrands(products);
  const picked = new Map<string, ProductBrand>();

  GLOBAL_PRODUCT_BRANDS.forEach((brand, index) => {
    const count = productBrandCounts.get(normalizeBrandKey(brand.name))?.count ?? 0;
    picked.set(brand.slug, {
      slug: brand.slug,
      brandName: brand.name,
      productCount: count,
      famousRank: index,
    });
  });

  for (const [key, entry] of productBrandCounts.entries()) {
    const slug = slugifyBrand(entry.label);
    if (!slug || picked.has(slug)) continue;
    if (GLOBAL_PRODUCT_BRANDS.some((brand) => normalizeBrandKey(brand.name) === key)) continue;
    picked.set(slug, {
      slug,
      brandName: entry.label,
      productCount: entry.count,
      famousRank: Number.MAX_SAFE_INTEGER,
    });
  }

  const list = [...picked.values()]
    .sort((a, b) => {
      const aKnown = a.famousRank !== Number.MAX_SAFE_INTEGER;
      const bKnown = b.famousRank !== Number.MAX_SAFE_INTEGER;
      if (aKnown && bKnown) return a.famousRank - b.famousRank;
      if (aKnown !== bKnown) return aKnown ? -1 : 1;
      return b.productCount - a.productCount || a.brandName.localeCompare(b.brandName);
    })
    .slice(0, BRAND_STRIP_LIMIT);

  if (list.length === 0) return null;

  return (
    <section className="container mt-16 sm:mt-24 md:mt-28">
      <div className="mb-6 flex flex-col gap-4 text-right sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="atlas-kicker text-primary">الوكلاء</span>
          <h2 className="font-display mt-3 text-balance text-3xl font-black leading-tight tracking-normal text-foreground sm:text-4xl">
            البراندات اللي تثق بيها
          </h2>
        </div>
        <Link
          to="/search"
          className="group inline-flex w-fit shrink-0 items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-bold text-background transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-foreground/92 hover:shadow-[0_18px_34px_-26px_hsl(var(--foreground)/0.65)]"
        >
          كل البراندات
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1">
            ←
          </span>
        </Link>
      </div>

      <div className="rounded-[2rem] bg-border/40 p-px shadow-[0_18px_50px_-44px_rgba(23,32,23,0.36)]">
        <div className="rounded-[calc(2rem-1px)] bg-surface px-3 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] sm:px-5 sm:py-6">
          <div className="grid auto-cols-[8.5rem] grid-flow-col gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-[9.5rem] sm:gap-4 lg:grid-flow-row lg:grid-cols-5 lg:overflow-visible xl:grid-cols-7">
            {list.map((brand) => (
              <BrandLogoChip key={brand.slug} brand={brand} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
