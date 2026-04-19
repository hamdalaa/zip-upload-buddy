/**
 * SearchAutocomplete — live dropdown shown beneath the unified search bar.
 * Pure presentational: parent passes suggestions + handles selection.
 * Keyboard nav (↑↓/Enter/Esc) is owned by the parent for full control.
 */
import { Package, Store, Search, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AutocompleteSuggestion } from "@/lib/unifiedSearch";

interface Props {
  query: string;
  suggestions: AutocompleteSuggestion[];
  highlightedIndex: number;
  onHover: (idx: number) => void;
  onSelect: (s: AutocompleteSuggestion) => void;
  onSubmitQuery: () => void; // "search for X" fallback row
}

const ICONS = {
  product: Package,
  shop: Store,
  brand: Package,
  query: Search,
} as const;

export function SearchAutocomplete({
  query,
  suggestions,
  highlightedIndex,
  onHover,
  onSelect,
  onSubmitQuery,
}: Props) {
  if (!query.trim()) return null;

  return (
    <div className="absolute inset-x-0 top-full z-[60] mt-2 flex max-h-[60vh] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-soft-xl">
      {/* Suggestions list — first (scrolls within the dropdown) */}
      {suggestions.length > 0 ? (
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {suggestions.map((s, idx) => {
            const Icon = ICONS[s.type];
            const active = idx === highlightedIndex;
            return (
              <li key={`${s.type}-${s.id}`}>
                <button
                  type="button"
                  onMouseEnter={() => onHover(idx)}
                  onClick={() => onSelect(s)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-start transition-colors",
                    active ? "bg-primary/10" : "hover:bg-surface",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-md",
                        s.type === "product" && "bg-accent-cyan/15 text-accent-cyan",
                        s.type === "shop" && "bg-accent-violet/15 text-accent-violet",
                        s.type === "brand" && "bg-accent-emerald/15 text-accent-emerald",
                        s.type === "query" && "bg-muted text-muted-foreground",
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm text-foreground">{s.label}</div>
                      {s.sublabel && (
                        <div className="truncate text-[11px] text-muted-foreground">{s.sublabel}</div>
                      )}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[10px] text-muted-foreground">
                    {s.type === "product" ? "منتج" : s.type === "shop" ? "محل" : s.type === "brand" ? "براند" : "بحث"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="px-4 py-3 text-xs text-muted-foreground">
          لا توجد اقتراحات سريعة — اضغط Enter للبحث الكامل.
        </div>
      )}

      {/* Quick-search row — always pinned at the END of suggestions */}
      <button
        type="button"
        onMouseEnter={() => onHover(-1)}
        onClick={onSubmitQuery}
        className={cn(
          "flex w-full shrink-0 items-center justify-between gap-2 border-t border-border bg-background px-4 py-3 text-start transition-colors",
          highlightedIndex === -1 ? "bg-primary/10" : "hover:bg-surface",
        )}
      >
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-foreground">
              ابحث عن "<span className="text-primary">{query}</span>" في كل المنتجات
            </div>
            <div className="text-[11px] text-muted-foreground">اضغط Enter للبحث</div>
          </div>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}
