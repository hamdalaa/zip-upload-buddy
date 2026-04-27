import { useState } from "react";
import { Check, ChevronDown, Filter, PackageCheck, ShieldCheck, Sparkles, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { cn, formatCompact } from "@/lib/utils";
import type { UnifiedSearchFilters as Filters, UnifiedSearchResponse } from "@/lib/unifiedSearch";
import { formatIQD } from "@/lib/unifiedSearch";

interface Props {
  facets: UnifiedSearchResponse["facets"];
  value: Filters;
  onChange: (next: Filters) => void;
  onReset: () => void;
  className?: string;
  /** mobile drawer trigger */
  triggerLabel?: string;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/45 py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group flex min-h-11 w-full items-center justify-between rounded-[1rem] px-2 text-start text-[13px] font-black tracking-normal text-foreground/84 transition-colors hover:bg-primary-soft/55 hover:text-foreground"
      >
        {title}
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:text-foreground", open && "rotate-180")} />
      </button>
      {open && <div className="mt-4 space-y-1 animate-fade-in">{children}</div>}
    </div>
  );
}

function FacetList({
  items,
  selected,
  onToggle,
  max = 6,
}: {
  items: { key: string; label: string; count: number }[];
  selected: string[];
  onToggle: (key: string) => void;
  max?: number;
}) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? items : items.slice(0, max);
  if (!items.length) return <p className="text-xs text-muted-foreground">لا توجد خيارات</p>;
  return (
    <div className="space-y-0.5">
      {visible.map((item) => (
        <label
          key={item.key}
          className="group/item flex min-h-11 cursor-pointer items-center justify-between rounded-[1rem] px-3 py-2 transition-colors duration-200 hover:bg-primary-soft/55"
        >
          <div className="flex items-center gap-2.5">
            <Checkbox
              checked={selected.includes(item.key)}
              onCheckedChange={() => onToggle(item.key)}
            />
            <span className="text-[13px] font-semibold text-foreground/84 transition-colors group-hover/item:text-foreground">{item.label}</span>
          </div>
          <span className="font-numeric text-[11px] font-medium text-muted-foreground/70">{formatCompact(item.count)}</span>
        </label>
      ))}
      {items.length > max && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="ms-2 mt-1 text-[12px] font-semibold text-primary transition-opacity hover:opacity-70"
        >
          {showAll ? "عرض أقل" : `+${items.length - max} المزيد`}
        </button>
      )}
    </div>
  );
}

function FilterBody({ facets, value, onChange, onReset }: Omit<Props, "className" | "triggerLabel">) {
  const [priceLocal, setPriceLocal] = useState<[number, number]>([
    value.priceMin ?? facets.priceRange.min,
    value.priceMax ?? facets.priceRange.max,
  ]);

  function toggle<K extends keyof Filters>(key: K, item: string) {
    const arr = (value[key] as string[] | undefined) ?? [];
    const next = arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];
    onChange({ ...value, [key]: next.length ? next : undefined });
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between rounded-[1.2rem] bg-white/58 px-3 py-2.5 ring-1 ring-border/55">
        <h3 className="text-[15px] font-black tracking-normal text-foreground">الفلاتر</h3>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex min-h-9 items-center gap-1 rounded-full px-2 text-[12px] font-semibold text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
        >
          <X className="h-3 w-3" />
          مسح الكل
        </button>
      </div>

      <Section title="السعر (د.ع)">
        <Slider
          min={facets.priceRange.min}
          max={facets.priceRange.max}
          step={10000}
          value={priceLocal}
          onValueChange={(v) => setPriceLocal(v as [number, number])}
          onValueCommit={(v) => onChange({ ...value, priceMin: v[0], priceMax: v[1] })}
          className="mt-4"
        />
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="rounded-full border border-border/60 bg-card/82 px-2.5 py-1 font-numeric text-[11px] font-semibold text-foreground/84 shadow-soft">{formatIQD(priceLocal[0])}</span>
          <span className="h-px flex-1 bg-border/60" aria-hidden />
          <span className="rounded-full border border-border/60 bg-card/82 px-2.5 py-1 font-numeric text-[11px] font-semibold text-foreground/84 shadow-soft">{formatIQD(priceLocal[1])}</span>
        </div>
      </Section>

      <Section title="التوفر والحالة">
        <div className="flex flex-col gap-1">
          {[
            { id: "f-instock", label: "متوفر فقط", icon: PackageCheck, checked: !!value.inStockOnly, onChange: (v: boolean) => onChange({ ...value, inStockOnly: v }) },
            { id: "f-onsale", label: "عليه تخفيض", icon: Tag, checked: !!value.onSaleOnly, onChange: (v: boolean) => onChange({ ...value, onSaleOnly: v }) },
            { id: "f-verified", label: "محل موثّق", icon: ShieldCheck, checked: !!value.verifiedOnly, onChange: (v: boolean) => onChange({ ...value, verifiedOnly: v }) },
            { id: "f-official", label: "وكيل رسمي", icon: Sparkles, checked: !!value.officialDealerOnly, onChange: (v: boolean) => onChange({ ...value, officialDealerOnly: v }) },
          ].map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => opt.onChange(!opt.checked)}
                aria-pressed={opt.checked}
                className={cn(
                  "group flex min-h-11 w-full items-center gap-3 rounded-[1rem] px-3 py-2 text-right transition-colors duration-200",
                  opt.checked ? "bg-primary-soft/82 text-primary ring-1 ring-primary/18" : "hover:bg-primary-soft/55"
                )}
              >
                <span
                  className={cn(
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-200",
                    opt.checked
                      ? "border-primary bg-primary text-primary-foreground shadow-[0_2px_6px_-2px_hsl(var(--primary)/0.5)]"
                      : "border-border bg-background group-hover:border-primary/50"
                  )}
                >
                  <Check
                    className={cn(
                      "h-3 w-3 transition-opacity duration-200",
                      opt.checked ? "opacity-100" : "opacity-0"
                    )}
                    strokeWidth={3}
                  />
                </span>
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    opt.checked ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                <span
                  className={cn(
                    "flex-1 text-[13px] font-medium transition-colors",
                    opt.checked ? "text-foreground" : "text-foreground/75 group-hover:text-foreground"
                  )}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section title="البراند">
        <FacetList
          items={facets.brands}
          selected={value.brands ?? []}
          onToggle={(k) => toggle("brands", k)}
        />
      </Section>

      <Section title="الفئة">
        <FacetList
          items={facets.categories}
          selected={value.categories ?? []}
          onToggle={(k) => toggle("categories", k)}
        />
      </Section>

      <Section title="المحل">
        <FacetList
          items={facets.stores}
          selected={value.stores ?? []}
          onToggle={(k) => toggle("stores", k)}
        />
      </Section>

      <Section title="المدينة">
        <FacetList
          items={facets.cities}
          selected={value.cities ?? []}
          onToggle={(k) => toggle("cities", k)}
        />
      </Section>
    </div>
  );
}

export function UnifiedSearchFilters(props: Props) {
  const { className, triggerLabel = "الفلاتر" } = props;
  const activeCount =
    (props.value.brands?.length ?? 0) +
    (props.value.categories?.length ?? 0) +
    (props.value.stores?.length ?? 0) +
    (props.value.cities?.length ?? 0) +
    (props.value.inStockOnly ? 1 : 0) +
    (props.value.onSaleOnly ? 1 : 0) +
    (props.value.verifiedOnly ? 1 : 0) +
    (props.value.officialDealerOnly ? 1 : 0);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className={cn("hidden lg:block", className)}>
        <div className="search-surface sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto p-1.5">
          <div className="search-core p-4">
            <FilterBody {...props} />
          </div>
        </div>
      </aside>

      {/* Mobile sheet trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="h-11 shrink-0 rounded-full border-border/70 bg-card/82 px-4 font-bold shadow-soft hover:bg-primary-soft hover:text-primary lg:hidden">
            <Filter className="me-2 h-4 w-4" />
            {triggerLabel}
            {activeCount > 0 && (
              <Badge className="ms-2 h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px]">{activeCount}</Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="page-shell w-[92vw] max-w-md overflow-y-auto p-0">
          <SheetHeader className="border-b border-border/60 bg-card/86 p-4">
            <SheetTitle className="text-[15px] font-black">الفلاتر</SheetTitle>
          </SheetHeader>
          <div className="p-4 pb-24">
            <div className="search-surface p-1.5">
              <div className="search-core p-4">
                <FilterBody {...props} />
              </div>
            </div>
          </div>
          <SheetFooter className="sticky bottom-0 border-t border-border/60 bg-card/92 p-4">
            <Button onClick={props.onReset} variant="outline" className="h-11 flex-1 rounded-full border-border/70 bg-background/80 font-bold">
              إعادة ضبط
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
