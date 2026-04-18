import { Database, Zap, Clock } from "lucide-react";
import { useDataStore } from "@/lib/dataStore";
import { relativeArabicTime } from "@/lib/search";

export function MetricsStrip() {
  const { shops, products, shopSources } = useDataStore();
  const activeShops = shops.filter((s) => !s.archivedAt);
  const lastCrawl = shopSources
    .filter((s) => s.lastCrawledAt)
    .sort((a, b) => new Date(b.lastCrawledAt!).getTime() - new Date(a.lastCrawledAt!).getTime())[0];

  const items = [
    {
      icon: Database,
      value: `${activeShops.length}`,
      label: "محلات بالدليل (MVP: شارعين فقط)",
      sub: "شارع الصناعة + شارع الربيعي",
    },
    {
      icon: Zap,
      value: `${products.length}`,
      label: "منتجات مفهرسة محلياً",
      sub: "بحث محلي، بدون scraping وقت البحث",
    },
    {
      icon: Clock,
      value: lastCrawl ? relativeArabicTime(lastCrawl.lastCrawledAt!) : "—",
      label: "آخر تحديث للفهرس",
      sub: "خرائط Google + روابط المحلات",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4">
      {items.map((it) => (
        <div
          key={it.label}
          className="flex items-start gap-4 rounded-[1.5rem] border border-border/70 bg-card/82 p-5 shadow-soft-lg backdrop-blur-sm"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <it.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-3xl font-bold leading-none tracking-tight">{it.value}</div>
            <div className="mt-2 text-sm font-semibold tracking-tight">{it.label}</div>
            <div className="mt-1 text-xs leading-6 text-muted-foreground">{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
