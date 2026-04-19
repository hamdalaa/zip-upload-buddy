import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  HelpCircle,
  LayoutDashboard,
  MapPin,
  Menu,
  Search,
  Store,
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
  { to: "/sinaa", label: "الشوارع", icon: Store },
  { to: "/iraq", label: "المحافظات", icon: Building2 },
  { to: "/brands", label: "البراندات", icon: Heart },
  { to: "/results", label: "البحث", icon: Search },
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
          ? "border-b border-border/40 bg-background/80 shadow-[0_1px_0_0_hsl(var(--border)/0.4),0_8px_24px_-12px_hsl(var(--foreground)/0.08)] backdrop-blur-xl"
          : "border-b border-transparent bg-background",
      )}
    >
      <div className="container py-2.5 md:py-3">
        <div className="flex items-center gap-2 md:gap-5">
          {/* Wordmark */}
          <Link to="/" className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-primary shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]">
              <span className="font-display text-lg font-bold leading-none text-primary-foreground">ت</span>
              <div className="pointer-events-none absolute inset-0 rounded-[10px] bg-gradient-to-b from-white/20 to-transparent" />
            </div>
            <div className="text-right leading-none">
              <div className="font-display text-[19px] font-semibold tracking-tight text-foreground">حاير</div>
              <div className="mt-1 hidden text-[8.5px] font-semibold uppercase tracking-[0.24em] text-muted-foreground/70 sm:block">
                Hayer
              </div>
            </div>
          </Link>

          {/* Primary nav — premium minimal */}
          <nav className="hidden items-center gap-0.5 lg:flex ms-3">
            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all duration-200",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    "after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary after:transition-all after:duration-300",
                    "after:scale-x-0 after:opacity-0",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1 sm:gap-1.5">
            {/* City */}
            <DropdownMenu>
              <DropdownMenuTrigger className="group/city hidden items-center gap-1.5 rounded-full border border-border/60 bg-surface/60 px-3 py-1.5 text-[13px] font-medium text-foreground transition-all hover:border-primary/30 hover:bg-primary-soft hover:shadow-soft md:flex">
                <MapPin className="h-3.5 w-3.5 text-primary transition-transform group-hover/city:scale-110" />
                <span>{selectedCity.cityAr}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]/city:rotate-180" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                collisionPadding={12}
                className="max-h-[78vh] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-border/60 bg-card/95 p-0 shadow-soft-xl backdrop-blur-xl"
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
                            "group/item flex cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm transition-all focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary",
                            active
                              ? "bg-primary/10 text-primary"
                              : "text-foreground hover:bg-primary/10 hover:text-primary",
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
                    className="group/all cursor-pointer rounded-xl bg-gradient-to-r from-primary to-primary/85 px-3 py-2.5 text-center text-sm font-bold !text-primary-foreground transition-all hover:from-primary hover:to-primary hover:shadow-soft-md focus:bg-primary focus:!text-primary-foreground data-[highlighted]:from-primary data-[highlighted]:to-primary data-[highlighted]:!text-primary-foreground"
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
              className="hidden h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-surface hover:text-foreground md:flex"
              aria-label="دليل الاستخدام"
            >
              <HelpCircle className="h-4 w-4" />
            </button>


            <Link
              to="/about"
              className="group/dev hidden h-8 items-center gap-1.5 rounded-full border border-violet/25 bg-gradient-to-r from-violet/10 via-violet/5 to-rose/10 px-3 text-[11px] font-bold text-violet transition-all hover:-translate-y-0.5 hover:border-violet/50 hover:shadow-[0_4px_12px_-4px_hsl(var(--violet)/0.4)] md:inline-flex"
              aria-label="المطوّر"
            >
              <Heart className="h-3 w-3 fill-current transition-transform group-hover/dev:scale-110" />
              <span>المطوّر</span>
            </Link>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-all hover:bg-surface lg:hidden"
              aria-label="القائمة"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile sheet */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="right"
            className="w-[88vw] max-w-sm overflow-y-auto border-l border-border/60 bg-background p-0"
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/50 px-5 pb-4 pt-5">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-[12px] bg-gradient-primary shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]">
                <span className="font-display text-xl font-bold leading-none text-primary-foreground">ت</span>
                <div className="pointer-events-none absolute inset-0 rounded-[12px] bg-gradient-to-b from-white/20 to-transparent" />
              </div>
              <div className="text-right leading-tight">
                <SheetTitle className="font-display text-lg font-semibold tracking-tight">حاير</SheetTitle>
                <SheetDescription className="text-[11px] text-muted-foreground">
                  دليل التقنية بالعراق
                </SheetDescription>
              </div>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <form
                onSubmit={submit}
                className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 transition-colors focus-within:border-primary focus-within:bg-card"
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="ابحث في الأطلس"
                  className="h-8 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/70"
                />
                {q && (
                  <button type="button" onClick={() => setQ("")} aria-label="مسح">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </form>
            </div>

            {/* Primary nav */}
            <nav className="px-3 pt-5">
              <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                التصفّح
              </div>
              <ul className="space-y-1">
                {primaryLinks.map((link) => {
                  const Icon = link.icon;
                  const active = loc.pathname === link.to;
                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
                          active
                            ? "bg-primary-soft text-primary"
                            : "text-foreground hover:bg-surface",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            active
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-right">{link.label}</span>
                        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Utility links */}
            <div className="mt-5 border-t border-border/50 px-3 py-3">
              <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground/70">
                المزيد
              </div>
              <ul className="space-y-1">
                <li>
                  <button
                    onClick={() => { setMobileOpen(false); openTour(); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-right">دليل الاستخدام</span>
                  </button>
                </li>
                <li>
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <LayoutDashboard className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-right">لوحة الإدارة</span>
                  </Link>
                </li>
              </ul>
            </div>

            {/* Developer pill */}
            <div className="px-5 pb-6 pt-2">
              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="group/dev flex items-center justify-center gap-2 rounded-full border border-violet/25 bg-gradient-to-r from-violet/10 via-violet/5 to-rose/10 px-4 py-3 text-sm font-bold text-violet transition-all hover:border-violet/50 hover:shadow-[0_4px_14px_-4px_hsl(var(--violet)/0.4)]"
              >
                <Heart className="h-4 w-4 fill-current transition-transform group-hover/dev:scale-110" />
                <span>المطوّر</span>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
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
