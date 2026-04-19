import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Store, Tag, MapPin, Building2, Compass, Clock, Sparkles } from "lucide-react";
import { useDataStore } from "@/lib/dataStore";
import { CITIES } from "@/lib/cityData";

const RECENT_KEY = "atlas:recent-searches";
const MAX_RECENT = 5;

function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(q: string) {
  if (!q.trim()) return;
  const cur = getRecent().filter((s) => s !== q);
  cur.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const nav = useNavigate();
  const { shops, brands } = useDataStore();
  const recent = useMemo(() => (open ? getRecent() : []), [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const topShops = useMemo(() => shops.slice(0, 8), [shops]);
  const topBrands = useMemo(() => brands.slice(0, 8), [brands]);

  function go(path: string, search?: string) {
    if (search) pushRecent(search);
    setOpen(false);
    setQuery("");
    nav(path);
  }

  function searchSubmit() {
    if (!query.trim()) return;
    pushRecent(query);
    setOpen(false);
    nav(`/search?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="ابحث عن محل، براند، محافظة، أو منتج… (⌘K)"
        value={query}
        onValueChange={setQuery}
        onKeyDown={(e) => {
          if (e.key === "Enter" && query.trim()) {
            e.preventDefault();
            searchSubmit();
          }
        }}
      />
      <CommandList>
        <CommandEmpty>لا توجد نتائج. اضغط Enter للبحث في كل المنتجات.</CommandEmpty>

        {query.trim() && (
          <>
            <CommandGroup heading="بحث سريع">
              <CommandItem onSelect={searchSubmit}>
                <Sparkles className="me-2 h-4 w-4 text-primary" />
                ابحث عن "{query}" في كل المنتجات
              </CommandItem>
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        {!query.trim() && recent.length > 0 && (
          <>
            <CommandGroup heading="آخر بحثاتك">
              {recent.map((r) => (
                <CommandItem key={r} value={`recent-${r}`} onSelect={() => go(`/search?q=${encodeURIComponent(r)}`, r)}>
                  <Clock className="me-2 h-4 w-4 text-muted-foreground" />
                  {r}
                </CommandItem>
              ))}
            </CommandGroup>
            <CommandSeparator />
          </>
        )}

        <CommandGroup heading="صفحات سريعة">
          <CommandItem onSelect={() => go("/")}>
            <Compass className="me-2 h-4 w-4 text-primary" />
            الرئيسية
          </CommandItem>
          <CommandItem onSelect={() => go("/sinaa")}>
            <MapPin className="me-2 h-4 w-4 text-cyan" />
            شارع الصناعة
          </CommandItem>
          <CommandItem onSelect={() => go("/rubaie")}>
            <MapPin className="me-2 h-4 w-4 text-rose" />
            شارع الربيعي
          </CommandItem>
          <CommandItem onSelect={() => go("/iraq")}>
            <Building2 className="me-2 h-4 w-4 text-violet" />
            كل المحافظات
          </CommandItem>
          <CommandItem onSelect={() => go("/brands")}>
            <Tag className="me-2 h-4 w-4 text-emerald" />
            الوكلاء الرسميون
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="محافظات">
          {CITIES.slice(0, 8).map((c) => (
            <CommandItem key={c.slug} value={`city-${c.cityAr}`} onSelect={() => go(`/city/${c.slug}`)}>
              <Building2 className="me-2 h-4 w-4 text-muted-foreground" />
              {c.cityAr}
              <span className="ms-auto text-[10px] text-muted-foreground">{c.count?.toLocaleString("ar") ?? 0} محل</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="محلات">
          {topShops.map((s) => (
            <CommandItem key={s.id} value={`shop-${s.name}`} onSelect={() => go(`/shop-view/${s.id}`)}>
              <Store className="me-2 h-4 w-4 text-primary" />
              {s.name}
              <span className="ms-auto text-[10px] text-muted-foreground">{s.area}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="براندات">
          {topBrands.map((b) => (
            <CommandItem key={b.slug} value={`brand-${b.brandName}`} onSelect={() => go(`/brand/${b.slug}`)}>
              <Tag className="me-2 h-4 w-4 text-violet" />
              {b.brandName}
              <span className="ms-auto text-[10px] text-muted-foreground">{b.dealerName}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
