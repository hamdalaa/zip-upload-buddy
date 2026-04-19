import { useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
    <div className="border-b border-border py-4 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-start text-sm font-semibold text-foreground"
      >
        {title}
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
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
    <div className="space-y-1.5">
      {visible.map((item) => (
        <label
          key={item.key}
          className="flex cursor-pointer items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-surface"
        >
          <div className="flex items-center gap-2">
            <Checkbox
              checked={selected.includes(item.key)}
              onCheckedChange={() => onToggle(item.key)}
            />
            <span className="text-sm text-foreground">{item.label}</span>
          </div>
          <span className="text-xs text-muted-foreground">{formatCompact(item.count)}</span>
        </label>
      ))}
      {items.length > max && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="text-xs font-medium text-primary hover:underline"
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
      <div className="flex items-center justify-between pb-3">
        <h3 className="text-base font-bold text-foreground">الفلاتر</h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="h-8 text-xs">
          <X className="me-1 h-3 w-3" />
          مسح الكل
        </Button>
      </div>

      <Section title="السعر (د.ع)">
        <Slider
          min={facets.priceRange.min}
          max={facets.priceRange.max}
          step={10000}
          value={priceLocal}
          onValueChange={(v) => setPriceLocal(v as [number, number])}
          onValueCommit={(v) => onChange({ ...value, priceMin: v[0], priceMax: v[1] })}
          className="mt-2"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{formatIQD(priceLocal[0])}</span>
          <span>{formatIQD(priceLocal[1])}</span>
        </div>
      </Section>

      <Section title="التوفر والحالة">
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
          <Label htmlFor="f-instock" className="text-sm">متوفر فقط</Label>
          <Switch
            id="f-instock"
            checked={!!value.inStockOnly}
            onCheckedChange={(v) => onChange({ ...value, inStockOnly: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
          <Label htmlFor="f-onsale" className="text-sm">عليه تخفيض</Label>
          <Switch
            id="f-onsale"
            checked={!!value.onSaleOnly}
            onCheckedChange={(v) => onChange({ ...value, onSaleOnly: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
          <Label htmlFor="f-verified" className="text-sm">محل موثّق</Label>
          <Switch
            id="f-verified"
            checked={!!value.verifiedOnly}
            onCheckedChange={(v) => onChange({ ...value, verifiedOnly: v })}
          />
        </div>
        <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
          <Label htmlFor="f-official" className="text-sm">وكيل رسمي</Label>
          <Switch
            id="f-official"
            checked={!!value.officialDealerOnly}
            onCheckedChange={(v) => onChange({ ...value, officialDealerOnly: v })}
          />
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
        <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-soft-sm">
          <FilterBody {...props} />
        </div>
      </aside>

      {/* Mobile sheet trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="hidden">
            <Filter className="me-2 h-4 w-4" />
            {triggerLabel}
            {activeCount > 0 && (
              <Badge className="ms-2 h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px]">{activeCount}</Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-[88vw] max-w-md overflow-y-auto p-0">
          <SheetHeader className="border-b border-border p-4">
            <SheetTitle>الفلاتر</SheetTitle>
          </SheetHeader>
          <div className="p-4 pb-24">
            <FilterBody {...props} />
          </div>
          <SheetFooter className="sticky bottom-0 border-t border-border bg-background p-4">
            <Button onClick={props.onReset} variant="outline" className="flex-1">إعادة ضبط</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
