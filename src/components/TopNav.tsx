import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  ChevronLeft,
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
  const [, setCat] = useState<Category | "all">("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [selectedCity, setSelectedCity] = useState(() => loadSelectedCity());
  const { favorites, openTour } = useUserPrefs();
  const { products } = useDataStore();

  const favItems = products.filter((product) => favorites.has(product.id));

  function pickCity(slug: string, cityAr: string, navigateTo?: string) {
    const next = { slug, cityAr };
    setSelectedCity(next);
    try { localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(next)); } catch { /* */ }
    if (navigateTo) nav(navigateTo);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
    nav(`/results?${params.toString()}`);
    setMobileOpen(false);
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-all duration-300",
        scrolled
          ? "glass-panel border-b border-border/60 shadow-soft-md"
          : "border-b border-transparent bg-background",
      )}
    >
      <div className="container py-3 md:py-4">
        <div className="flex items-center gap-3 md:gap-6">
          {/* Wordmark */}
          <Link to="/" className="group flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <span className="font-display text-lg font-bold leading-none text-primary-foreground">ت</span>
            </div>
            <div className="text-right">
              <div className="font-display text-xl font-semibold leading-none text-foreground">تايه</div>
              <div className="mt-0.5 hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:block">
                Tayeh
              </div>
            </div>
          </Link>

          {/* Primary nav — premium minimal */}
          <nav className="hidden items-center gap-1 lg:flex ms-4">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "relative rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-surface hover:text-foreground",
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1 sm:gap-2">
            {/* City */}
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary-soft md:flex">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{selectedCity.cityAr}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="max-h-[78vh] w-80 overflow-hidden rounded-2xl border-border/60 bg-card/95 p-0 shadow-soft-xl backdrop-blur-xl"
              >
                <div className="relative overflow-hidden border-b border-border/60 bg-gradient-to-br from-primary/12 via-primary/5 to-transparent px-4 py-3">
                  <div className="pointer-events-none absolute -top-10 -right-8 h-24 w-24 rounded-full bg-primary/15 blur-2xl" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">المحافظات</div>
                      <div className="mt-0.5 text-sm font-semibold text-foreground">اختر مدينتك</div>
                    </div>
                    <div className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">
                      {CITIES.length.toLocaleString("ar")} محافظة
                    </div>
                  </div>
                </div>

                <div className="max-h-[52vh] overflow-y-auto px-1.5 py-1.5">
                  {CITIES.slice()
                    .sort((a, b) => b.count - a.count)
                    .map((city) => {
                      const active = city.slug === selectedCity.slug;
                      return (
                        <DropdownMenuItem
                          key={city.slug}
                          onClick={() => pickCity(city.slug, city.cityAr, `/city/${city.slug}`)}
                          className={cn(
                            "group/item flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm transition-all",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-muted/70",
                          )}
                        >
                          <span className="flex items-center gap-2.5">
                            <span
                              className={cn(
                                "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                active
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground group-hover/item:bg-primary/10 group-hover/item:text-primary",
                              )}
                            >
                              {active ? <Check className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                            </span>
                            <span className={cn("font-semibold", active && "text-primary")}>{city.cityAr}</span>
                          </span>
                          <span
                            className={cn(
                              "font-numeric rounded-full px-2 py-0.5 text-[10px] font-bold transition-colors",
                              active
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground group-hover/item:bg-background",
                            )}
                          >
                            {city.count.toLocaleString("ar")}
                          </span>
                        </DropdownMenuItem>
                      );
                    })}
                </div>

                <div className="border-t border-border/60 bg-muted/30 p-2">
                  <DropdownMenuItem
                    onClick={() => nav("/iraq")}
                    className="group/all cursor-pointer rounded-xl bg-gradient-to-r from-primary to-primary/85 px-3 py-2.5 text-center text-sm font-bold text-primary-foreground transition-all hover:shadow-soft-md focus:bg-primary"
                  >
                    <span className="flex w-full items-center justify-center gap-1.5">
                      كل محلات العراق
                      <ChevronLeft className="h-3.5 w-3.5 transition-transform group-hover/all:-translate-x-0.5" />
                    </span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={openTour}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground md:flex"
              aria-label="دليل الاستخدام"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            <button
              onClick={() => setFavOpen(true)}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground"
              aria-label="المفضلة"
            >
              <Heart className={cn("h-4 w-4", favItems.length > 0 && "fill-primary text-primary")} />
              {favItems.length > 0 && (
                <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 font-numeric text-[9px] font-bold text-accent-foreground">
                  {favItems.length}
                </span>
              )}
            </button>

            <Link
              to="/dashboard"
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface hover:text-foreground md:flex"
              aria-label="لوحة الإدارة"
            >
              <LayoutDashboard className="h-4 w-4" />
            </Link>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-surface lg:hidden"
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        {mobileOpen && (
          <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:hidden animate-fade-in">
            <form onSubmit={submit} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 focus-within:border-primary focus-within:bg-card transition-colors">
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

            <div className="grid grid-cols-2 gap-2">
              {primaryLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-primary-soft hover:border-primary/40 hover:text-primary"
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
            <div className="mt-12 rounded-2xl border border-dashed border-border bg-surface px-6 py-12 text-center">
              <Heart className="mx-auto h-12 w-12 text-muted-foreground/35" />
              <p className="mt-4 text-sm leading-7 text-muted-foreground">
                ما عندك عناصر محفوظة بعد. احفظ أي منتج من النتائج حتى يظهر هنا.
              </p>
            </div>
          ) : (
            <ul className="mt-6 space-y-3">
              {favItems.map((p) => (
                <li key={p.id} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-right shadow-soft">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">{p.name}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{p.shopName}</div>
                  </div>
                  <button
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
