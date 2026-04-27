import { Link } from "react-router-dom";
import { ALL_CATEGORIES, type Category } from "@/lib/types";
import { CATEGORY_IMAGES } from "@/lib/categoryImages";

const LABELS: Record<Category, string> = {
  Computing: "حاسبات",
  "PC Parts": "قطع PC",
  Networking: "شبكات",
  Gaming: "ألعاب",
  Cameras: "كاميرات",
  Printers: "طابعات",
  Phones: "هواتف",
  Chargers: "شواحن",
  Accessories: "إكسسوارات",
  Tablets: "تابلت",
  "Smart Devices": "أجهزة ذكية",
};

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
      {ALL_CATEGORIES.map((c) => (
        <Link
          key={c}
          to={`/results?category=${encodeURIComponent(c)}`}
          className="group ios-tap relative block aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-soft-lg"
        >
          <img
            src={CATEGORY_IMAGES[c]}
            alt={LABELS[c]}
            loading="lazy"
            width={640}
            height={480}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/15 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3 text-white">
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/80">{c}</div>
            <div className="mt-0.5 text-base font-semibold tracking-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]">
              {LABELS[c]}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
