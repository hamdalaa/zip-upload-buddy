import { useDataStore } from "@/lib/dataStore";
import { relativeArabicTime } from "@/lib/search";
import { CountUp } from "@/components/CountUp";
import { Store, Boxes, RefreshCw } from "lucide-react";

export function MetricsStrip() {
  const { shops, products, shopSources } = useDataStore();
  const activeShops = shops.filter((s) => !s.archivedAt);
  const lastCrawl = shopSources
    .filter((s) => s.lastCrawledAt)
    .sort((a, b) => new Date(b.lastCrawledAt!).getTime() - new Date(a.lastCrawledAt!).getTime())[0];

  const items = [
    {
      value: activeShops.length,
      label: "محل بالدليل",
      sub: "شارع الصناعة + الربيعي",
      icon: Store,
      color: "text-cyan bg-cyan-soft",
      animated: true,
    },
    {
      value: products.length,
      label: "منتج مفهرس",
      sub: "بحث محلي فوري",
      icon: Boxes,
      color: "text-violet bg-violet-soft",
      animated: true,
    },
    {
      value: lastCrawl ? relativeArabicTime(lastCrawl.lastCrawledAt!) : "—",
      label: "آخر تحديث",
      sub: "خرائط Google",
      icon: RefreshCw,
      color: "text-emerald bg-emerald-soft",
      animated: false,
    },
  ];

  return (
    <div className="atlas-panel relative divide-y divide-border overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 mesh-bg opacity-70" />
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div
            key={it.label}
            className="group flex items-baseline justify-between gap-4 px-5 py-4 text-right transition-colors hover:bg-primary-soft/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${it.color} transition-transform group-hover:scale-110`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">{it.label}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">{it.sub}</div>
              </div>
            </div>
            <div className="font-numeric text-2xl sm:text-3xl font-semibold leading-none text-rainbow">
              {it.animated && typeof it.value === "number" ? <CountUp value={it.value} /> : it.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
