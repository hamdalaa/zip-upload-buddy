import { Link } from "react-router-dom";
import { ALL_CATEGORIES, type Category } from "@/lib/types";
import { CATEGORY_IMAGES } from "@/lib/mockData";

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
          className="group glass-panel relative aspect-[4/3] overflow-hidden rounded-xl transition-all hover:border-primary/40 hover:shadow-glow"
        >
          <img
            src={CATEGORY_IMAGES[c]}
            alt={LABELS[c]}
            loading="lazy"
            width={640}
            height={480}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-3">
            <div className="text-[10px] uppercase tracking-wide text-primary">{c}</div>
            <div className="text-base font-bold">{LABELS[c]}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
