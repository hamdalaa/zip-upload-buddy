/**
 * SortPillsBar — quick horizontal sort chips + result count + active-filter
 * pills. Renders above the product grid on /search and other listing pages.
 */
import { ArrowDownAZ, ArrowUpDown, Sparkles, TrendingDown, X } from "lucide-react";
import type { SortKey } from "@/lib/unifiedSearch";
import { cn } from "@/lib/utils";

const arabicNumber = new Intl.NumberFormat("ar");

export interface SortOption {
  value: SortKey;
  label: string;
  icon?: typeof Sparkles;
}

const DEFAULT_OPTIONS: SortOption[] = [
  { value: "relevance", label: "الأقرب للبحث", icon: Sparkles },
  { value: "price_asc", label: "الأرخص", icon: TrendingDown },
  { value: "price_desc", label: "الأغلى", icon: ArrowUpDown },
  { value: "freshness_desc", label: "الأحدث", icon: ArrowDownAZ },
];

interface ActiveChip {
  label: string;
  clear: () => void;
}

interface Props {
  sort: SortKey;
  onSortChange: (next: SortKey) => void;
  totalResults?: number;
  options?: SortOption[];
  activeChips?: ActiveChip[];
  onClearAll?: () => void;
  className?: string;
}

export function SortPillsBar({
  sort,
  onSortChange,
  totalResults,
  options = DEFAULT_OPTIONS,
  activeChips = [],
  onClearAll,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "search-surface min-w-0 flex flex-col gap-3 p-2.5 sm:p-3.5",
        className,
      )}
    >
      {/* Row 1: count + pills */}
      <div className="flex min-w-0 items-center gap-2">
        {typeof totalResults === "number" && (
          <span className="search-chip me-1 shrink-0 bg-card/82 text-foreground/80">
            <span className="font-numeric text-foreground">
              {arabicNumber.format(totalResults)}
            </span>
            <span className="text-muted-foreground">نتيجة</span>
          </span>
        )}
        <div
          className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5"
          role="tablist"
          aria-label="ترتيب النتائج"
        >
          {options.map((opt) => {
            const active = sort === opt.value;
            const Icon = opt.icon;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSortChange(opt.value)}
                className={cn(
                  "ios-tap inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] font-bold transition-[background-color,color,border-color,transform,box-shadow]",
                  active
                    ? "border-foreground bg-foreground text-background shadow-[0_12px_26px_-20px_hsl(var(--foreground)/0.72)]"
                    : "border-border/70 bg-card/70 text-muted-foreground hover:border-primary/35 hover:bg-primary-soft hover:text-primary",
                )}
              >
                {Icon && <Icon className="h-3 w-3" />}
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Row 2: active filter chips */}
      {activeChips.length > 0 && (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-t border-border/40 pt-3">
          <span className="me-1 text-[10px] font-bold tracking-normal text-muted-foreground">
            فلاتر فعّالة
          </span>
          {activeChips.map((chip, i) => (
            <button
              key={`${chip.label}-${i}`}
              type="button"
              onClick={chip.clear}
              className="search-chip group min-h-0 bg-primary-soft py-1 text-[11px] text-primary"
            >
              {chip.label}
              <X className="h-3 w-3 transition-transform group-hover:rotate-90" />
            </button>
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="ms-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-destructive"
            >
              مسح الكل
            </button>
          )}
        </div>
      )}
    </div>
  );
}
