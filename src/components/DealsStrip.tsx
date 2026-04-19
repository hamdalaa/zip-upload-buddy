import { Flame } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { useDataStore } from "@/lib/dataStore";

export function DealsStrip() {
  const { products } = useDataStore();
  const deals = products
    .filter((p) => p.originalPriceValue && p.priceValue && p.originalPriceValue > p.priceValue)
    .map((p) => ({
      ...p,
      score: 0,
      _savings: ((p.originalPriceValue! - p.priceValue!) / p.originalPriceValue!) * 100,
    }))
    .sort((a, b) => b._savings - a._savings)
    .slice(0, 6);

  if (deals.length === 0) return null;

  return (
    <section>
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-3 py-1 text-[11px] font-semibold text-destructive">
            <Flame className="h-3 w-3" />
            عروض نشطة
          </div>
          <h2 className="font-display mt-3 text-2xl font-bold tracking-tight md:text-3xl">أبرز التخفيضات</h2>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">أعلى نسب الخصم بفهرس حاير — مبنية على آخر فهرسة.</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {deals.map((d) => (
          <ProductCard key={d.id} product={d} />
        ))}
      </div>
    </section>
  );
}
