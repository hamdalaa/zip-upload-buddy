import { useDeferredValue, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Search, Tag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALL_AREAS, ALL_CATEGORIES, type Area, type Category } from "@/lib/types";
import { SearchAutocomplete } from "@/components/SearchAutocomplete";
import { buildAutocomplete, type AutocompleteSuggestion } from "@/lib/unifiedSearch";
import { useDataStore } from "@/lib/dataStore";

interface Props {
  initialQ?: string;
  initialArea?: Area | "all";
  initialCategory?: Category | "all";
  variant?: "hero" | "compact";
}

const AUTOCOMPLETE_PRODUCT_POOL_LIMIT = 1500;

const CATEGORY_LABELS: Record<Category, string> = {
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

export function HeroSearch({
  initialQ = "",
  initialArea = "all",
  initialCategory = "all",
}: Props) {
  const nav = useNavigate();
  const { shops, products } = useDataStore();
  const [q, setQ] = useState(initialQ);
  const [area, setArea] = useState<Area | "all">(initialArea);
  const [category, setCategory] = useState<Category | "all">(initialCategory);
  const [acOpen, setAcOpen] = useState(false);
  const [acIndex, setAcIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const categoryTriggerRef = useRef<HTMLButtonElement>(null);
  const areaTriggerRef = useRef<HTMLButtonElement>(null);
  const lastFocusedFilter = useRef<"category" | "area" | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);
  const deferredQuery = useDeferredValue(q);

  const autocompleteProducts = useMemo(
    () => (products.length > AUTOCOMPLETE_PRODUCT_POOL_LIMIT
      ? products.slice(0, AUTOCOMPLETE_PRODUCT_POOL_LIMIT)
      : products),
    [products],
  );
  const suggestions: AutocompleteSuggestion[] = useMemo(
    () => buildAutocomplete(deferredQuery, shops, autocompleteProducts, 8),
    [deferredQuery, shops, autocompleteProducts],
  );

  function handleAcSelect(s: AutocompleteSuggestion) {
    setAcOpen(false);
    nav(s.href);
  }

  function restoreFilterFocus() {
    const target =
      lastFocusedFilter.current === "category"
        ? categoryTriggerRef.current
        : lastFocusedFilter.current === "area"
          ? areaTriggerRef.current
          : null;
    if (target) target.focus();
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setAcOpen(false);
      restoreFilterFocus();
      return;
    }
    if (!acOpen || !suggestions.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAcIndex((index) => Math.min(index + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAcIndex((index) => Math.max(index - 1, -1));
    } else if (e.key === "Enter" && acIndex >= 0) {
      e.preventDefault();
      handleAcSelect(suggestions[acIndex]);
    }
  }

  function onFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Escape") return;
    if (!categoryOpen && !areaOpen && !acOpen) return;
    e.preventDefault();
    setCategoryOpen(false);
    setAreaOpen(false);
    setAcOpen(false);
    if (lastFocusedFilter.current) restoreFilterFocus();
    else inputRef.current?.focus();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (area !== "all") params.set("area", area);
    if (category !== "all") params.set("category", category);
    nav(`/search?${params.toString()}`);
  }

  return (
    <div className="mx-auto w-full min-w-0 max-w-[20rem] sm:max-w-none">
      <form
        onSubmit={submit}
        onKeyDown={onFormKeyDown}
        className="group/search relative mx-auto w-full min-w-0 overflow-visible rounded-[1.8rem] bg-surface-2/64 p-1.5 shadow-[0_24px_72px_-48px_hsl(var(--primary)/0.3),inset_0_0_0_1px_hsl(var(--border)/0.32),inset_0_1px_0_rgba(255,255,255,0.74)] transition-[box-shadow,transform,background-color] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-primary-soft/86 focus-within:shadow-[0_30px_82px_-44px_hsl(var(--primary)/0.46),inset_0_0_0_1px_hsl(var(--primary)/0.22),inset_0_1px_0_rgba(255,255,255,0.86)] sm:rounded-[2.35rem] sm:p-2"
      >
        <div className="grid w-full min-w-0 grid-cols-1 gap-2 rounded-[1.45rem] bg-card/94 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] sm:grid-cols-2 sm:rounded-[1.9rem] sm:p-2.5 xl:min-h-[88px] xl:grid-cols-[minmax(0,1fr)_minmax(144px,184px)_minmax(144px,184px)_minmax(136px,176px)] xl:items-stretch xl:gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-[1.15rem] bg-white/74 px-3.5 shadow-[inset_0_0_0_1px_hsl(var(--border)/0.36)] transition-[background-color,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] focus-within:bg-white focus-within:shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.28),0_10px_28px_-24px_hsl(var(--primary)/0.35)] sm:col-span-2 sm:gap-4 sm:rounded-[1.25rem] sm:px-5 xl:col-span-1 xl:rounded-[1.45rem] xl:px-6">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground sm:h-6 sm:w-6" strokeWidth={1.9} />
            <input
              ref={inputRef}
              aria-label="ابحث عن منتج، براند أو محل"
              value={q}
              onChange={(event) => {
                setQ(event.target.value);
                setAcOpen(true);
                setAcIndex(-1);
              }}
              onFocus={() => {
                setAcOpen(true);
              }}
              onBlur={() => setTimeout(() => setAcOpen(false), 150)}
              onKeyDown={onInputKeyDown}
              placeholder="اكتب iPhone 15، PlayStation 5، أو اسم محل"
              className="h-[54px] min-w-0 flex-1 bg-transparent text-[0.92rem] font-semibold tracking-normal text-foreground outline-none placeholder:text-muted-foreground/62 sm:h-[68px] sm:text-[1.12rem] xl:h-full xl:text-[1.14rem]"
              style={{ letterSpacing: 0 }}
              autoComplete="off"
            />
            {!q && (
              <span className="hidden shrink-0 rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-bold text-muted-foreground ring-1 ring-border sm:inline-flex">
                بحث حي
              </span>
            )}
          </div>

          <Select
            value={category}
            onValueChange={(value) => setCategory(value as Category | "all")}
            open={categoryOpen}
            onOpenChange={(open) => {
              setCategoryOpen(open);
              if (open) lastFocusedFilter.current = "category";
            }}
          >
            <SelectTrigger
              ref={categoryTriggerRef}
              aria-label="اختر الفئة"
              onFocus={() => { lastFocusedFilter.current = "category"; }}
              className="h-[54px] min-h-[54px] w-full min-w-0 rounded-[1.15rem] border-0 bg-white/70 px-3 text-[0.9rem] font-bold tracking-normal text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.36)] ring-0 transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white hover:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.5),0_10px_26px_-24px_rgba(23,32,23,0.35)] focus-visible:ring-2 focus-visible:ring-primary/24 sm:h-[68px] sm:min-h-[56px] sm:rounded-[1.25rem] sm:px-4 sm:text-[1rem] xl:h-auto xl:w-full xl:rounded-[1.45rem]"
              style={{ letterSpacing: 0 }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <Tag className="h-[1.125rem] w-[1.125rem] shrink-0 text-warning" strokeWidth={1.9} />
                <span className="truncate"><SelectValue placeholder="كل الفئات" /></span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-card shadow-[0_24px_70px_-36px_rgba(23,32,23,0.34)]">
              <SelectItem value="all">كل الفئات</SelectItem>
              {ALL_CATEGORIES.map((entry) => (
                <SelectItem key={entry} value={entry}>{CATEGORY_LABELS[entry]}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={area}
            onValueChange={(value) => setArea(value as Area | "all")}
            open={areaOpen}
            onOpenChange={(open) => {
              setAreaOpen(open);
              if (open) lastFocusedFilter.current = "area";
            }}
          >
            <SelectTrigger
              ref={areaTriggerRef}
              aria-label="اختر المنطقة"
              onFocus={() => { lastFocusedFilter.current = "area"; }}
              className="h-[54px] min-h-[54px] w-full min-w-0 rounded-[1.15rem] border-0 bg-white/70 px-3 text-[0.9rem] font-bold tracking-normal text-foreground shadow-[inset_0_0_0_1px_hsl(var(--border)/0.36)] ring-0 transition-[background-color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white hover:shadow-[inset_0_0_0_1px_hsl(var(--border)/0.5),0_10px_26px_-24px_rgba(23,32,23,0.35)] focus-visible:ring-2 focus-visible:ring-primary/24 sm:h-[68px] sm:min-h-[56px] sm:rounded-[1.25rem] sm:px-4 sm:text-[1rem] xl:h-auto xl:w-full xl:rounded-[1.45rem]"
              style={{ letterSpacing: 0 }}
            >
              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                <MapPin className="h-[1.125rem] w-[1.125rem] shrink-0 text-primary" strokeWidth={1.9} />
                <span className="truncate"><SelectValue placeholder="كل المناطق" /></span>
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-2xl border-border bg-card shadow-[0_24px_70px_-36px_rgba(23,32,23,0.34)]">
              <SelectItem value="all">كل المناطق</SelectItem>
              {ALL_AREAS.map((entry) => (
                <SelectItem key={entry} value={entry}>{entry}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <button
            type="submit"
            className="group/submit inline-flex h-[58px] w-full shrink-0 items-center justify-center gap-3 rounded-[1.18rem] bg-foreground px-6 text-[1.02rem] font-black tracking-normal text-background shadow-[0_18px_38px_-24px_rgba(23,32,23,0.85)] transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-y-0.5 hover:bg-foreground/90 hover:shadow-[0_24px_48px_-26px_rgba(23,32,23,0.95)] active:scale-[0.96] sm:col-span-2 sm:h-[72px] sm:rounded-[1.28rem] sm:text-[1.12rem] xl:col-span-1 xl:h-auto xl:w-full xl:rounded-[1.45rem]"
            style={{ letterSpacing: 0 }}
          >
            <span>بحث</span>
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 transition-[transform,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover/submit:-translate-x-1 group-hover/submit:bg-white/16">
              <ArrowLeft className="h-4 w-4" strokeWidth={2} />
            </span>
          </button>
        </div>

        {acOpen && (
          <SearchAutocomplete
            query={q}
            suggestions={suggestions}
            highlightedIndex={acIndex}
            onHover={setAcIndex}
            onSelect={handleAcSelect}
            onSubmitQuery={() => { setAcOpen(false); submit(new Event("submit") as unknown as FormEvent); }}
            pending={q !== deferredQuery}
          />
        )}
      </form>
    </div>
  );
}
