import { useDataStore } from "@/lib/dataStore";
import { relativeArabicTime } from "@/lib/search";

export function MetricsStrip() {
  const { shops, products, shopSources } = useDataStore();
  const activeShops = shops.filter((s) => !s.archivedAt);
  const lastCrawl = shopSources
    .filter((s) => s.lastCrawledAt)
    .sort((a, b) => new Date(b.lastCrawledAt!).getTime() - new Date(a.lastCrawledAt!).getTime())[0];

  const items = [
    { value: `${activeShops.length}`, label: "محل بالدليل", sub: "شارع الصناعة + الربيعي" },
    { value: `${products.length}`, label: "منتج مفهرس", sub: "بحث محلي فوري" },
    { value: lastCrawl ? relativeArabicTime(lastCrawl.lastCrawledAt!) : "—", label: "آخر تحديث", sub: "خرائط Google" },
  ];

  return (
    <div className="atlas-panel divide-y divide-border overflow-hidden">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-baseline justify-between gap-4 px-5 py-4 text-right"
        >
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground">{it.label}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{it.sub}</div>
          </div>
          <div className="font-numeric text-2xl sm:text-3xl font-semibold leading-none text-gradient">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
