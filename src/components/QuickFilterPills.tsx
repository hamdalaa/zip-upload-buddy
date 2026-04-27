import { useNavigate } from "react-router-dom";
import { Clock, Star, Truck, ShieldCheck } from "lucide-react";

const FILTERS = [
  { id: "open", label: "مفتوح الآن", icon: Clock, params: { open: "1" } },
  { id: "rated", label: "بـ ٥ نجوم", icon: Star, params: { minRating: "4.5" } },
  { id: "delivery", label: "يوصّل", icon: Truck, params: { delivery: "1" } },
  { id: "official", label: "وكيل رسمي", icon: ShieldCheck, params: { official: "1" } },
];

export function QuickFilterPills() {
  const nav = useNavigate();

  function go(params: Record<string, string>) {
    const sp = new URLSearchParams(params);
    nav(`/search?${sp.toString()}`);
  }

  return (
    <div className="relative w-full min-w-0">
      {/* Edge fade — hints there's more to scroll on mobile */}
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-background to-transparent sm:hidden" />
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-background to-transparent sm:hidden" />
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:flex-wrap sm:overflow-visible sm:gap-2">
        {FILTERS.map((f) => {
          const Icon = f.icon;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => go(f.params)}
              className="filter-pill ios-tap shrink-0"
            >
              <Icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
