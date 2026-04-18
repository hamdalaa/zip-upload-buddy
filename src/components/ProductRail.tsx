import { useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard } from "./ProductCard";
import { ProductRailSkeleton } from "./ProductRailSkeleton";
import { useFakeLoading } from "@/hooks/useFakeLoading";
import type { ScoredProduct } from "@/lib/search";

interface Props {
  title: string;
  seeAllTo?: string;
  products: ScoredProduct[];
}

export function ProductRail({ title, seeAllTo, products }: Props) {
  const railRef = useRef<HTMLDivElement>(null);
  const loading = useFakeLoading(600);

  if (loading) return <ProductRailSkeleton />;
  if (products.length === 0) return null;

  const scroll = (direction: 1 | -1) => {
    const element = railRef.current;
    if (!element) return;
    element.scrollBy({ left: direction * element.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className="atlas-panel py-5">
      <div className="flex items-center justify-between gap-3 px-5 md:px-6">
        <div className="text-right">
          <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">رف مختار</div>
          <h2 className="font-display mt-2 text-3xl font-bold leading-none text-foreground">{title}</h2>
        </div>
        {seeAllTo && (
          <Link to={seeAllTo} className="link-underline text-sm font-semibold text-accent whitespace-nowrap">
            شوف الكل
          </Link>
        )}
      </div>

      <div className="relative mt-5 group/rail">
        <div
          ref={railRef}
          className="flex gap-4 overflow-x-auto px-5 pb-2 pt-1 snap-x snap-mandatory scroll-smooth md:px-6"
          style={{ scrollbarWidth: "none" }}
        >
          {products.map((product) => (
            <div key={product.id} className="w-[210px] shrink-0 snap-start sm:w-[230px] md:w-[250px]">
              <ProductCard product={product} />
            </div>
          ))}
        </div>

        <button
          onClick={() => scroll(1)}
          aria-label="السابق"
          className="press hidden md:flex absolute left-3 top-1/2 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/75 bg-background/95 shadow-soft-md opacity-0 transition-opacity group-hover/rail:opacity-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => scroll(-1)}
          aria-label="التالي"
          className="press hidden md:flex absolute right-3 top-1/2 h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border/75 bg-background/95 shadow-soft-md opacity-0 transition-opacity group-hover/rail:opacity-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </section>
  );
}
