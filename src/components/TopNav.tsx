import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Compass,
  Heart,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  Menu,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ALL_CATEGORIES, type Category } from "@/lib/types";
import { useUserPrefs } from "@/lib/userPrefs";
import { useDataStore } from "@/lib/dataStore";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { CITIES } from "@/lib/cityData";
import { cn } from "@/lib/utils";

const CITY_STORAGE_KEY = "teh:selectedCity";
const DEFAULT_CITY = { slug: "baghdad", cityAr: "بغداد" };

function loadSelectedCity(): { slug: string; cityAr: string } {
  try {
    const raw = localStorage.getItem(CITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.slug && parsed?.cityAr) return parsed;
    }
  } catch {
    // ignore storage issues
  }

  return DEFAULT_CITY;
}

const CAT_LABELS: Record<Category, string> = {
  Computing: "حاسبات",
  "PC Parts": "قطع PC",
  Networking: "شبكات",
  Gaming: "ألعاب",
  Cameras: "كاميرات",
  Printers: "طابعات",
  Phones: "هواتف",
  Chargers: "شواحن",
  Accessories: "إكسسوارات",
  Tablets: "تابلت",
  "Smart Devices": "أجهزة ذكية",
};

const primaryLinks = [
  { to: "/", label: "الرئيسية" },
  { to: "/results", label: "المنتجات" },
  { to: "/brands", label: "الوكلاء" },
  { to: "/iraq", label: "المحافظات" },
];

const utilityLinks = [
  { to: "/results?category=PC%20Parts", label: "قطع PC" },
  { to: "/results?category=Phones", label: "الهواتف" },
  { to: "/results?category=Networking", label: "الشبكات" },
  { to: "/sinaa", label: "شارع الصناعة" },
  { to: "/rubaie", label: "شارع الربيعي" },
];

export function TopNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(() => loadSelectedCity());
  const { favorites, toggleFavorite, openTour } = useUserPrefs();
  const { products } = useDataStore();

  const favItems = products.filter((product) => favorites.has(product.id));

  function pickCity(slug: string, cityAr: string, navigateTo?: string) {
    const next = { slug, cityAr };
    setSelectedCity(next);

    try {
      localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage issues
    }

    if (navigateTo) nav(navigateTo);
  }

  useEffect(() => {
    const match = loc.pathname.match(/^\/city\/([^/]+)/);
    if (!match) return;

    const slug = match[1];
    if (slug === selectedCity.slug) return;

    const found = CITIES.find((city) => city.slug === slug);
    if (!found) return;

    const next = { slug: found.slug, cityAr: found.cityAr };
    setSelectedCity(next);

    try {
      localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage issues
    }
  }, [loc.pathname, selectedCity.slug]);

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const nextCategory = params.get("category");
    setQ(params.get("q") ?? "");
    setCat(nextCategory && ALL_CATEGORIES.includes(nextCategory as Category) ? (nextCategory as Category) : "all");
  }, [loc.search]);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }, [loc.pathname]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cat !== "all") params.set("category", cat);
    nav(`/results?${params.toString()}`);
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-[hsl(var(--background)_/_0.9)] backdrop-blur-xl">
      <div className="container py-3 md:py-4">
        <div className="flex items-start gap-3 md:items-center md:gap-5">
          <Link to="/" className="group flex shrink-0 items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground shadow-soft-lg transition-transform duration-300 group-hover:-translate-y-0.5">
              <Compass className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <div className="text-right">
              <div className="font-display text-2xl font-bold leading-none text-foreground">تايه</div>
              <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Market Atlas
              </div>
            </div>
          </Link>

          <nav className="hidden lg:flex lg:items-center lg:gap-1">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "rounded-full px-3 py-2 text-sm font-semibold transition-colors",
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-foreground/72 hover:bg-secondary/8 hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden items-center gap-2 rounded-full border border-border/75 bg-card/80 px-3 py-2 text-right text-sm font-semibold text-foreground transition-colors hover:border-secondary/30 hover:bg-card md:flex">
                <MapPin className="h-4 w-4 text-accent" />
                <span>{selectedCity.cityAr}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="max-h-[70vh] w-72 overflow-y-auto">
                <DropdownMenuLabel>المحافظات</DropdownMenuLabel>
                {CITIES.slice().sort((a, b) => b.count - a.count).map((city) => {
                  const active = city.slug === selectedCity.slug;
                  return (
                    <DropdownMenuItem
                      key={city.slug}
                      onClick={() => pickCity(city.slug, city.cityAr, `/city/${city.slug}`)}
                      className="flex cursor-pointer items-center justify-between"
                    >
                      <span className="flex items-center gap-2">
                        {active ? <Check className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-accent" />}
                        {city.cityAr}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{city.count.toLocaleString("ar")}</span>
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => nav("/iraq")} className="cursor-pointer font-semibold text-primary">
                  كل محلات العراق
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={openTour}
              className="hidden h-10 w-10 items-center justify-center rounded-full border border-border/75 bg-card/80 text-foreground/75 transition-colors hover:border-secondary/30 hover:text-foreground md:flex"
              aria-label="دليل الاستخدام"
            >
              <HelpCircle className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={() => setFavOpen(true)}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border/75 bg-card/80 text-foreground/75 transition-colors hover:border-secondary/30 hover:text-foreground"
              aria-label="المفضلة"
            >
              <Heart className={cn("h-4.5 w-4.5", favItems.length > 0 && "fill-primary text-primary")} />
              {favItems.length > 0 && (
                <span className="absolute -end-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {favItems.length}
                </span>
              )}
            </button>

            <Link
              to="/dashboard"
              className="hidden items-center gap-2 rounded-full border border-border/75 bg-card/80 px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:border-secondary/30 hover:bg-card md:flex"
            >
              <LayoutDashboard className="h-4 w-4 text-accent" />
              لوحة الإدارة
            </Link>

            <button
              onClick={() => {
                setMobileSearchOpen(false);
                setMobileOpen((value) => !value);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border/75 bg-card/80 text-foreground transition-colors hover:border-secondary/30 lg:hidden"
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        <div className="mt-3 md:hidden">
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              setMobileSearchOpen((value) => !value);
            }}
            className="flex w-full items-center justify-between gap-3 rounded-[1.25rem] border border-border/75 bg-card/88 px-4 py-3 text-right shadow-soft"
            aria-expanded={mobileSearchOpen}
            aria-controls="mobile-market-search"
          >
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              <Search className="h-4 w-4 text-accent" />
              {mobileSearchOpen ? "إخفاء البحث" : "ابحث في السوق"}
            </span>
            <span className="line-clamp-1 text-xs text-muted-foreground">
              {q.trim() ? q : cat === "all" ? "كل الفئات" : CAT_LABELS[cat]}
            </span>
          </button>
        </div>

        <div className={cn("mt-3 md:mt-4", !mobileSearchOpen && "hidden md:block")}>
          <form
            id="mobile-market-search"
            onSubmit={submit}
            className="grid gap-2 rounded-[1.5rem] border border-border/75 bg-card/85 p-2.5 shadow-soft-lg md:grid-cols-[minmax(0,1fr)_180px_auto] md:rounded-[1.75rem] md:p-2"
          >
            <div className="relative">
              <Search className="pointer-events-none absolute end-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="دوّر على منتج، موديل، أو اسم محل"
                className="h-12 w-full rounded-[1.2rem] border border-border/70 bg-background px-4 pe-11 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/75 focus:border-secondary/35"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute start-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="مسح البحث"
                >
                  <XCircle className="h-4 w-4" />
                </button>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger className="flex h-12 items-center justify-between rounded-[1.2rem] border border-border/70 bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-secondary/35">
                <span>{cat === "all" ? "كل الفئات" : CAT_LABELS[cat]}</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="max-h-[65vh] w-60 overflow-y-auto">
                <DropdownMenuItem onClick={() => setCat("all")}>كل الفئات</DropdownMenuItem>
                {ALL_CATEGORIES.map((entry) => (
                  <DropdownMenuItem key={entry} onClick={() => setCat(entry)}>
                    {CAT_LABELS[entry]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="submit"
              className="flex h-12 items-center justify-center gap-2 rounded-[1.2rem] bg-secondary px-5 text-sm font-bold text-secondary-foreground transition-transform duration-300 hover:-translate-y-0.5"
            >
              <Search className="h-4 w-4" />
              ابحث بكل السوق
            </button>
          </form>
        </div>

        {mobileOpen && (
          <div className="mt-4 grid gap-3 rounded-[1.75rem] border border-border/75 bg-card/88 p-4 shadow-soft-lg lg:hidden">
            <div className="grid gap-2 sm:grid-cols-2">
              {primaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[1rem] border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:border-secondary/30"
                >
                  {link.label}
                </Link>
              ))}
              {utilityLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-[1rem] border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-foreground/85 transition-colors hover:border-secondary/30"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="rounded-[1.25rem] border border-border/70 bg-background px-4 py-3">
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">المدينة المختارة</div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  <MapPin className="h-4 w-4 text-accent" />
                  {selectedCity.cityAr}
                </span>
                <Link
                  to={`/city/${selectedCity.slug}`}
                  onClick={() => setMobileOpen(false)}
                  className="text-xs font-semibold text-accent"
                >
                  افتح صفحة المدينة
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  openTour();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-[1rem] border border-border/70 bg-background px-4 py-3 text-sm font-semibold text-foreground"
              >
                <HelpCircle className="h-4 w-4 text-accent" />
                دليل الاستخدام
              </button>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex flex-1 items-center justify-center gap-2 rounded-[1rem] bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground"
              >
                <LayoutDashboard className="h-4 w-4" />
                لوحة الإدارة
              </Link>
            </div>
          </div>
        )}
      </div>

      <Sheet open={favOpen} onOpenChange={setFavOpen}>
        <SheetContent side="left" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="inline-flex items-center gap-2 text-right">
              <Heart className="h-5 w-5 fill-primary text-primary" />
              المفضلة ({favItems.length})
            </SheetTitle>
            <SheetDescription className="text-right">
              العناصر المحفوظة تبقى بهذا المتصفح حتى لو سكّرت الصفحة.
            </SheetDescription>
          </SheetHeader>

          {favItems.length === 0 ? (
            <div className="mt-12 rounded-[1.75rem] border border-dashed border-border bg-background/85 px-6 py-12 text-center">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground/35" />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                ما عندك عناصر محفوظة بعد. احفظ أي منتج من النتائج حتى يظهر هنا.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {favItems.map((product) => (
                <div
                  key={product.id}
                  className="flex gap-3 rounded-[1.25rem] border border-border/75 bg-background/92 p-3"
                >
                  <Link to={`/shop-view/${product.shopId}`} onClick={() => setFavOpen(false)} className="shrink-0">
                    <img
                      src={
                        optimizeImageUrl(product.imageUrl ?? CATEGORY_IMAGES[product.category], { width: 160, height: 160 }) ??
                        product.imageUrl ??
                        CATEGORY_IMAGES[product.category]
                      }
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                      className="h-16 w-16 rounded-[1rem] object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/shop-view/${product.shopId}`}
                      onClick={() => setFavOpen(false)}
                      className="line-clamp-2 text-sm font-semibold text-foreground hover:text-accent"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-1 text-xs text-muted-foreground">{product.shopName}</div>
                    {product.priceText && (
                      <div className="mt-2 font-display text-lg font-bold text-foreground">{product.priceText}</div>
                    )}
                  </div>

                  <button
                    onClick={() => toggleFavorite(product.id)}
                    className="self-start rounded-full p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}
