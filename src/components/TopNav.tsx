import { useEffect, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Building2,
  Check,
  ChevronDown,
  ChevronLeft,
  Heart,
  HelpCircle,
  MapPin,
  Menu,
  Search,
  Store,
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
import { WishlistDrawer } from "@/components/WishlistDrawer";
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
      if (parsed?.slug && parsed?.cityAr) {
        const path = window.location.pathname;
        const isExplicitErbilRoute = path === "/city/erbil" || path.startsWith("/city/erbil/");
        if (parsed.slug === "erbil" && !isExplicitErbilRoute) return DEFAULT_CITY;
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_CITY;
}

const primaryLinks = [
  { to: "/iraq", label: "المحافظات", icon: Building2 },
  { to: "/brands", label: "البراندات", icon: Heart },
  { to: "/search", label: "البحث", icon: Search },
];

const streetLinks = [
  { to: "/sinaa", label: "شارع الصناعة", description: "حاسبات · قطع · شبكات" },
  { to: "/rubaie", label: "شارع الربيعي", description: "هواتف · شواحن · إكسسوارات" },
];

export function TopNav() {
  const nav = useNavigate();
  const loc = useLocation();
  const [q, setQ] = useState("");
  const [, setCat] = useState<Category | "all">("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [favOpen, setFavOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
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
    let lastY = window.scrollY;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        setScrolled(y > 8);
        const delta = y - lastY;
        if (y < 40) {
          setHidden(false);
        } else if (Math.abs(delta) > 6) {
          setHidden(delta > 0 && y > 260);
        }
        lastY = y;
        ticking = false;
      });
    };
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

  useEffect(() => {
    const openFavorites = () => setFavOpen(true);
    window.addEventListener("open-favorites", openFavorites);
    return () => window.removeEventListener("open-favorites", openFavorites);
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    nav(`/search?${params.toString()}`);
    setMobileOpen(false);
  }

  if (loc.pathname === "/") {
    return (
      <>
        <header className="absolute inset-x-0 top-0 z-40 px-3 pt-4 sm:px-6 sm:pt-6">
          <div className="mx-auto w-full max-w-[min(1320px,calc(100vw-1.5rem))] rounded-[1.9rem] bg-white/46 p-1.5 shadow-[0_28px_80px_-50px_rgba(16,45,62,0.46)] backdrop-blur-2xl">
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-[1.45rem] bg-card/92 px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_0_0_1px_hsl(var(--border)/0.42)] sm:gap-3">
            <Link
              to="/"
              className="group flex min-h-12 shrink-0 items-center gap-2 rounded-[1.35rem] bg-[#07111f] p-1 ps-3 text-white shadow-[0_18px_42px_-26px_rgba(4,18,32,0.85),inset_0_1px_0_rgba(255,255,255,0.16)] ring-1 ring-white/60 transition-[box-shadow,transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-[#0c1b31] hover:shadow-[0_24px_54px_-28px_rgba(4,18,32,0.92),inset_0_1px_0_rgba(255,255,255,0.2)] sm:gap-2.5 sm:ps-4"
              aria-label="حاير"
            >
              <span className="font-display text-[1.65rem] font-black leading-none tracking-normal text-white sm:text-[1.9rem]">
                حاير
              </span>
              <span className="inline-flex h-7 items-center rounded-full bg-cyan-300/12 px-2.5 text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100 ring-1 ring-cyan-100/25">
                Beta
              </span>
            </Link>

            <nav className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
              <div className="flex min-w-0 items-center gap-1 rounded-full bg-surface/72 p-1 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.36)]">
                {[...streetLinks, ...primaryLinks].map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    className={({ isActive }) =>
                      cn(
                        "inline-flex min-h-10 items-center justify-center whitespace-nowrap rounded-full px-3.5 text-[13px] font-bold transition-[background-color,box-shadow,color,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-white hover:text-foreground hover:shadow-[0_12px_28px_-24px_rgba(23,32,23,0.5)] xl:px-4",
                        isActive
                          ? "bg-white text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.32),0_12px_28px_-24px_rgba(23,32,23,0.5)]"
                          : "text-muted-foreground",
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </nav>

            <div dir="ltr" className="flex shrink-0 items-center gap-1 rounded-full bg-surface/72 p-1 text-muted-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.36)]">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="group/city hidden h-10 items-center gap-2 rounded-full bg-white px-3.5 text-[0.86rem] font-bold tracking-normal text-foreground shadow-[0_10px_24px_-22px_rgba(23,32,23,0.55),inset_0_0_0_1px_hsl(var(--border)/0.38)] transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-25px_rgba(23,32,23,0.55),inset_0_0_0_1px_hsl(var(--border)/0.48)] md:flex"
                  style={{ letterSpacing: 0 }}
                >
                  <MapPin className="h-4 w-4 text-primary" strokeWidth={1.9} />
                  <span dir="rtl">{selectedCity.cityAr}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]/city:rotate-180" strokeWidth={2} />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={10}
                  collisionPadding={12}
                  className="max-h-[78vh] w-[min(20rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border-border bg-card/96 p-0 shadow-[0_28px_70px_-34px_rgba(23,32,23,0.32)] backdrop-blur-2xl"
                >
                  <div className="border-b border-border px-4 py-3 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">المحافظات</div>
                    <div className="mt-0.5 text-sm font-semibold text-foreground">اختر مدينتك</div>
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
                              "group/item flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm transition-[background-color,color] focus:bg-primary-soft data-[highlighted]:bg-primary-soft",
                              active ? "bg-primary-soft text-primary" : "text-foreground",
                            )}
                          >
                            <span className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
                                  active ? "bg-primary text-white" : "bg-white text-muted-foreground",
                                )}
                              >
                                {active ? <Check className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                              </span>
                              <span className="font-semibold">{city.cityAr}</span>
                            </span>
                            <span className="font-numeric rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                              {city.count.toLocaleString("ar")}
                            </span>
                          </DropdownMenuItem>
                        );
                      })}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                onClick={() => setMobileOpen((value) => !value)}
                className="ios-tap flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] hover:bg-white hover:text-foreground lg:hidden"
                aria-label="القائمة"
              >
                <span className="icon-swap relative h-5 w-5" data-active={mobileOpen ? "true" : "false"}>
                  <span className="icon-primary"><Menu className="h-5 w-5" strokeWidth={1.9} /></span>
                  <span className="icon-secondary"><X className="h-5 w-5" strokeWidth={1.9} /></span>
                </span>
              </button>

              <button
                onClick={() => setFavOpen(true)}
                className="ios-tap relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] hover:bg-white hover:text-foreground"
                aria-label={`المفضلة (${favItems.length})`}
              >
                <Heart
                  className={cn("h-5 w-5", favItems.length > 0 && "fill-warning text-warning")}
                  strokeWidth={1.9}
                />
                {favItems.length > 0 && (
                  <span className="absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[9px] font-bold leading-none text-white">
                    {favItems.length > 9 ? "9+" : favItems.length}
                  </span>
                )}
              </button>

              <button
                onClick={openTour}
                className="ios-tap hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] hover:bg-white hover:text-foreground sm:flex"
                aria-label="دليل الاستخدام"
              >
                <HelpCircle className="h-5 w-5" strokeWidth={1.9} />
              </button>
            </div>
          </div>
          </div>
        </header>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="right"
            className="w-[88vw] max-w-sm overflow-y-auto border-l border-border bg-card p-0"
          >
            <SheetHeader className="border-b border-border px-5 pb-4 pt-5 text-right">
              <SheetTitle className="font-display text-2xl text-foreground">حاير</SheetTitle>
              <SheetDescription className="text-muted-foreground">دليل الإلكترونيات في العراق</SheetDescription>
            </SheetHeader>
            <nav className="space-y-1 px-3 py-4">
              {[...streetLinks, ...primaryLinks].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className="ios-tap flex min-h-12 items-center justify-between rounded-xl px-3 text-sm font-semibold text-foreground transition-[background-color,color,transform] hover:bg-primary-soft"
                >
                  <span>{link.label}</span>
                  <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>

        <WishlistDrawer open={favOpen} onOpenChange={setFavOpen} />
      </>
    );
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-[transform,background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)]",
        hidden ? "-translate-y-full" : "translate-y-0",
        "border-b border-transparent bg-transparent",
      )}
    >
      <div className="container py-2.5 md:py-3">
        <div
          className={cn(
            "flex items-center gap-2 rounded-2xl px-2.5 py-1.5 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 md:gap-5 md:px-3",
            scrolled
              ? "border border-border/70 bg-card/88 shadow-soft-lg backdrop-blur-2xl"
              : "border border-transparent bg-background/72 backdrop-blur-sm",
          )}
        >
          {/* Wordmark */}
          <Link to="/" className="group flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90">
            <div className="text-right leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[22px] font-bold leading-none text-foreground">حـايـر</span>
                <span className="rounded-full border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">
                  Beta
                </span>
              </div>
            </div>
          </Link>

          {/* Primary nav — premium minimal */}
          <nav className="hidden items-center gap-0.5 lg:flex ms-3">
            {/* Streets dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  "group/streets relative inline-flex min-h-10 items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-[color,transform] duration-200",
                  loc.pathname === "/sinaa" || loc.pathname === "/rubaie"
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                الشوارع
                <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-data-[state=open]/streets:rotate-180" />
                {(loc.pathname === "/sinaa" || loc.pathname === "/rubaie") && (
                  <span className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-primary" />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                sideOffset={8}
                className="w-72 overflow-hidden rounded-xl border border-border/70 bg-card p-1.5 shadow-soft-lg"
              >
                <DropdownMenuLabel className="px-3 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                  بغداد
                </DropdownMenuLabel>
                {streetLinks.map((street) => {
                  const active = loc.pathname === street.to;
                  return (
                    <DropdownMenuItem
                      key={street.to}
                      onSelect={() => nav(street.to)}
                      className={cn(
                        "group/street flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors focus:bg-muted/60 data-[highlighted]:bg-muted/60",
                        active && "bg-muted/40",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
                          active
                            ? "border-primary/30 bg-primary/10 text-primary"
                            : "border-border/60 bg-muted/40 text-muted-foreground group-hover/street:border-primary/20 group-hover/street:text-primary",
                        )}
                      >
                        <Store className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 text-right">
                        <div className="text-[13px] font-semibold leading-tight text-foreground">{street.label}</div>
                        <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{street.description}</div>
                      </div>
                      {active && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            {primaryLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex min-h-10 items-center rounded-lg px-3 py-1.5 text-[13px] font-medium transition-[color,transform] duration-200",
                    isActive
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                    "after:absolute after:inset-x-3 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary after:transition-[transform,opacity] after:duration-300",
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
              <DropdownMenuTrigger className="group/city hidden min-h-10 items-center gap-1.5 rounded-full border border-border/60 bg-surface/60 px-3 py-1.5 text-[13px] font-medium text-foreground transition-[background-color,border-color,box-shadow,color] hover:border-primary/30 hover:bg-primary-soft hover:shadow-soft md:flex">
                <MapPin className="h-3.5 w-3.5 -translate-y-px text-primary transition-transform group-hover/city:scale-110" />
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
                            "group/item flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm transition-[background-color,color,transform] focus:bg-primary/10 focus:text-primary data-[highlighted]:bg-primary/10 data-[highlighted]:text-primary",
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
                    className="group/all cursor-pointer rounded-xl bg-gradient-to-r from-primary to-primary/85 px-3 py-2.5 text-center text-sm font-bold !text-primary-foreground transition-[transform,box-shadow,filter] hover:shadow-soft-md focus:bg-primary focus:!text-primary-foreground data-[highlighted]:!text-primary-foreground"
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
              className="ios-tap hidden h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color] hover:bg-surface hover:text-foreground md:flex"
              aria-label="دليل الاستخدام"
            >
              <HelpCircle className="h-4 w-4" />
            </button>

            {/* Wishlist drawer trigger with count badge */}
            <button
              onClick={() => setFavOpen(true)}
              className="ios-tap relative flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-[background-color,color] hover:bg-rose/10 hover:text-rose"
              aria-label={`المفضلة (${favItems.length})`}
              title="المفضلة"
            >
              <Heart
                className={cn(
                  "h-4 w-4 transition-[transform,fill] duration-200",
                  favItems.length > 0 && "fill-rose text-rose",
                )}
              />
              {favItems.length > 0 && (
                <span
                  className="absolute -end-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose px-1 text-[9px] font-bold leading-none text-white shadow-soft"
                  aria-hidden
                >
                  {favItems.length > 9 ? "9+" : favItems.length}
                </span>
              )}
            </button>

            <Link
              to="/about"
              className="group/dev ios-tap hidden min-h-10 items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-3 text-[11px] font-bold text-foreground transition-[transform,box-shadow,border-color,background-color,color] hover:-translate-y-0.5 hover:border-primary/30 hover:bg-primary-soft hover:text-primary hover:shadow-soft-md md:inline-flex"
              aria-label="المطوّر"
            >
              <Heart className="h-3 w-3 transition-transform group-hover/dev:scale-110" />
              <span>المطوّر</span>
            </Link>

            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="ios-tap hidden h-10 w-10 items-center justify-center rounded-full text-foreground transition-[background-color,color] hover:bg-surface md:flex lg:hidden"
              aria-label="القائمة"
            >
              <span className="icon-swap h-4 w-4" data-active={mobileOpen ? "true" : "false"}>
                <span className="icon-primary"><Menu className="h-4 w-4" /></span>
                <span className="icon-secondary"><X className="h-4 w-4" /></span>
              </span>
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
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary shadow-[0_4px_14px_-4px_hsl(var(--primary)/0.5)]">
                <span className="font-display text-xl font-black leading-none text-primary-foreground">ح</span>
                <div className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-b from-white/20 to-transparent" />
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
                  <button
                    type="button"
                    onClick={() => setQ("")}
                    aria-label="مسح"
                    className="ios-tap hit-target inline-flex items-center justify-center rounded-full text-muted-foreground transition-[background-color,color,transform] hover:bg-muted/70 hover:text-foreground"
                  >
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
                {streetLinks.map((street) => {
                  const active = loc.pathname === street.to;
                  return (
                    <li key={street.to}>
                      <Link
                        to={street.to}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "ios-tap flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-[background-color,color,transform]",
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
                          <Store className="h-4 w-4" />
                        </span>
                        <span className="flex-1 text-right">{street.label}</span>
                        <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground/60" />
                      </Link>
                    </li>
                  );
                })}
                {primaryLinks.map((link) => {
                  const Icon = link.icon;
                  const active = loc.pathname === link.to;
                  return (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "ios-tap flex min-h-10 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-[background-color,color,transform]",
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
                    className="ios-tap flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-foreground transition-[background-color,color,transform] hover:bg-surface"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <HelpCircle className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-right">دليل الاستخدام</span>
                  </button>
                </li>
              </ul>
            </div>

            {/* Developer pill */}
            <div className="px-5 pb-6 pt-2">
              <Link
                to="/about"
                onClick={() => setMobileOpen(false)}
                className="group/dev ios-tap flex items-center justify-center gap-2 rounded-full border border-border/70 bg-card px-4 py-3 text-sm font-bold text-foreground transition-[transform,box-shadow,border-color,background-color,color] hover:border-primary/30 hover:bg-primary-soft hover:text-primary"
              >
                <Heart className="h-4 w-4 transition-transform group-hover/dev:scale-110" />
                <span>المطوّر</span>
              </Link>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Favorites sheet */}
      <WishlistDrawer open={favOpen} onOpenChange={setFavOpen} />
    </header>
  );
}
