import { useDataStore } from "@/lib/dataStore";
import { getPublicProductCount, getPublicStoreCount } from "@/lib/catalogCounts";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { Store, Boxes } from "lucide-react";
import { cn } from "@/lib/utils";

export function MetricsStrip() {
  const { shops, products, summary } = useDataStore();
  const { ref, revealed } = useScrollReveal<HTMLDivElement>();

  const items = [
    {
      value: getPublicStoreCount(summary.totalStores, shops.filter((s) => !s.archivedAt).length),
      label: "محل بالدليل",
      sub: "شارع الصناعة + الربيعي",
      icon: Store,
      color: "text-cyan bg-cyan-soft",
    },
    {
      value: getPublicProductCount(summary.totalProducts, products.length),
      label: "منتج مفهرس",
      sub: "بحث محلي فوري",
      icon: Boxes,
      color: "text-violet bg-violet-soft",
    },
  ];

  return (
    <div
      ref={ref}
      className={cn(
        "relative divide-y divide-border overflow-hidden rounded-[2rem] bg-card ring-1 ring-border reveal-init",
        revealed && "reveal-on",
      )}
    >
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="group flex items-baseline justify-between gap-4 px-5 py-5 text-right transition-[background-color] hover:bg-primary-soft/70"
            style={{ transitionDelay: revealed ? `${i * 80}ms` : "0ms" }}
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className={cn(
                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[transform,box-shadow] group-hover:scale-105",
                  it.color ?? "bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold text-foreground">{it.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{it.sub}</div>
              </div>
            </div>
            <div className="font-numeric text-2xl font-semibold leading-none tabular-stable text-foreground sm:text-3xl">
              {typeof it.value === "number" ? it.value.toLocaleString("en-US") : it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
