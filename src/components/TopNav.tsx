import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
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
    // ignore
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
  { to: "/sinaa", label: "الشوارع" },
  { to: "/iraq", label: "المحافظات" },
  { to: "/brands", label: "الوكلاء" },
  { to: "/results", label: "البحث" },
];

export function TopNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState(() => loadSelectedCity());
  const { favorites, openTour } = useUserPrefs();
  const { products } = useDataStore();

  const favItems = products.filter((product) => favorites.has(product.id));
  const today = new Intl.DateTimeFormat("ar-IQ", { day: "2-digit", month: "long", year: "numeric" }).format(new Date());

  function pickCity(slug: string, cityAr: string, navigateTo?: string) {
    const next = { slug, cityAr };
    setSelectedCity(next);
    try { localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(next)); } catch { /* */ }
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
    try { localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(next)); } catch { /* */ }
  }, [loc.pathname, selectedCity.slug]);

  useEffect(() => {
    const params = new URLSearchParams(loc.search);
    const nextCategory = params.get("category");
    setQ(params.get("q") ?? "");
    setCat(nextCategory && ALL_CATEGORIES.includes(nextCategory as Category) ? (nextCategory as Category) : "all");
  }, [loc.search]);

  useEffect(() => {
    setMobileOpen(false);
  }, [loc.pathname]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (cat !== "all") params.set("category", cat);
    nav(`/results?${params.toString()}`);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/92 backdrop-blur-md">
      {/* Editorial date strip */}
      <div className="hidden border-b border-border/60 md:block">
        <div className="container flex items-center justify-between gap-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          <span>تايه · أطلس الإلكترونيات العراقي</span>
          <span className="font-numeric tracking-[0.18em]">{today}</span>
        </div>
      </div>

      <div className="container py-3 md:py-4">
        <div className="flex items-center gap-4 md:gap-6">
          {/* Wordmark */}
          <Link to="/" className="group flex shrink-0 items-baseline gap-3">
            <div className="text-right">
              <div className="font-display text-3xl font-bold leading-none text-foreground">تايه</div>
              <div className="mt-1 hidden text-[9px] font-bold uppercase tracking-[0.32em] text-muted-foreground sm:block">
                Tayeh — Atlas
              </div>
            </div>
          </Link>

          <div className="hidden h-8 w-px bg-border lg:block" />

          {/* Primary nav — minimal, editorial */}
          <nav className="hidden items-center gap-6 lg:flex">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "relative py-1 text-sm font-semibold transition-colors",
                    isActive
                      ? "text-foreground after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:bg-primary"
                      : "text-foreground/65 hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-2">
            {/* City */}
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden items-center gap-2 border-b border-transparent py-1 text-sm font-semibold text-foreground transition-colors hover:border-foreground md:flex">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{selectedCity.cityAr}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
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
                        {active ? <Check className="h-4 w-4 text-primary" /> : <MapPin className="h-4 w-4 text-muted-foreground" />}
                        {city.cityAr}
                      </span>
                      <span className="font-numeric text-[10px] text-muted-foreground">{city.count.toLocaleString("ar")}</span>
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
              className="hidden h-9 w-9 items-center justify-center rounded-full text-foreground/65 transition-colors hover:text-foreground md:flex"
              aria-label="دليل الاستخدام"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            <button
              onClick={() => setFavOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-foreground/65 transition-colors hover:text-foreground"
              aria-label="المفضلة"
            >
              <Heart className={cn("h-4 w-4", favItems.length > 0 && "fill-primary text-primary")} />
              {favItems.length > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 font-numeric text-[9px] font-bold text-primary-foreground">
                  {favItems.length}
                </span>
              )}
            </button>

            <Link
              to="/dashboard"
              className="hidden h-9 w-9 items-center justify-center rounded-full text-foreground/65 transition-colors hover:text-foreground md:flex"
              aria-label="لوحة الإدارة"
            >
              <LayoutDashboard className="h-4 w-4" />
            </Link>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted lg:hidden"
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        {mobileOpen && (
          <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:hidden">
            <form onSubmit={submit} className="flex items-center gap-2 border border-border bg-card px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="ابحث في الأطلس"
                className="h-9 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
              />
              {q && (
                <button type="button" onClick={() => setQ("")} aria-label="مسح">
                  <XCircle className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </form>

            <div className="grid grid-cols-2 gap-px bg-border">
              {primaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="bg-background px-4 py-3 text-sm font-semibold text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-3">
              <button
                onClick={() => { setMobileOpen(false); openTour(); }}
                className="inline-flex items-center gap-2 text-xs font-semibold text-foreground"
              >
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                دليل الاستخدام
              </button>
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="inline-flex items-center gap-2 text-xs font-semibold text-foreground"
              >
                <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                لوحة الإدارة
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Favorites sheet */}
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
            <div className="mt-12 border border-dashed border-border bg-card px-6 py-12 text-center">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground/35" />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                ما عندك عناصر محفوظة بعد. احفظ أي منتج من النتائج حتى يظهر هنا.
              </p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {favItems.map((p) => (
                <li key={p.id} className="flex items-start gap-3 border border-border bg-card p-3 text-right">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{p.shopName}</div>
                  </div>
                  <button
                    onClick={() => { /* keep */ }}
                    aria-label="إزالة"
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>
    </header>
  );
}
