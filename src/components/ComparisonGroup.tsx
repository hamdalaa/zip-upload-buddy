import { Layers, Award } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import type { ScoredProduct } from "@/lib/search";
import type { Shop } from "@/lib/types";

export function ComparisonGroup({
  representativeName,
  brand,
  items,
  shopsById,
}: {
  representativeName: string;
  brand?: string;
  items: ScoredProduct[];
  shopsById: Record<string, Shop>;
}) {
  const prices = items.map((i) => i.priceValue).filter((v): v is number => typeof v === "number");
  const min = prices.length ? Math.min(...prices) : undefined;
  const max = prices.length ? Math.max(...prices) : undefined;
  const fmt = (n: number) => `${n.toLocaleString("en-US")} IQD`;
  const savings = min !== undefined && max !== undefined && max > min ? max - min : 0;
  const heroImg = items[0].imageUrl ?? CATEGORY_IMAGES[items[0].category];

  return (
    <section className="atlas-panel">
      <header className="atlas-separator flex flex-wrap items-center gap-4 p-5">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-[1.1rem] bg-surface-2">
          <img src={heroImg} alt="" loading="lazy" width={96} height={96} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            <Layers className="h-3 w-3" />
            مجموعة مقارنة
          </div>
          <h3 className="mt-3 truncate font-display text-3xl font-bold leading-none text-foreground">
            {brand ? `${brand} ${representativeName}` : representativeName}
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">{items.length.toLocaleString("ar")} محلات ضمن نفس المقارنة</p>
        </div>
        {min !== undefined && (
          <div className="rounded-[1.2rem] border border-border/75 bg-background px-4 py-3 text-right">
            <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">المدى السعري</div>
            <div className="mt-2 font-display text-lg font-bold">
              <span className="text-muted-foreground">من </span>
              <span className="text-success">{fmt(min)}</span>
              {max !== undefined && max !== min && (
                <>
                  <span className="text-muted-foreground"> إلى </span>
                  <span>{fmt(max)}</span>
                </>
              )}
            </div>
            {savings > 0 && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-bold text-success">
                <Award className="h-3 w-3" />
                وفّر حتى {fmt(savings)}
              </div>
            )}
          </div>
        )}
      </header>

      <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <ProductCard
            key={it.id}
            product={it}
            shopGoogleMapsUrl={shopsById[it.shopId]?.googleMapsUrl}
            bestPrice={it.priceValue !== undefined && it.priceValue === min}
            layout="grid"
          />
        ))}
      </div>
    </section>
  );
}
