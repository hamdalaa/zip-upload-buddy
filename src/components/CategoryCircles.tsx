import { Link } from "react-router-dom";
import { ALL_CATEGORIES, type Category } from "@/lib/types";
import { CATEGORY_REAL_IMAGES } from "@/lib/categoryImages";

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

/** Editorial circular category shortcuts.
 *  Mobile: horizontal scroll. Desktop: even grid for 11 items in lg+. */
export function CategoryCircles() {
  return (
    <>
      {/* Mobile */}
      <div className="md:hidden -mx-3 px-3 overflow-x-auto">
        <div className="flex gap-4 pb-2 w-max">
          {ALL_CATEGORIES.map((c) => (
            <Link
              key={c}
              to={`/results?category=${encodeURIComponent(c)}`}
              className="group press flex w-[68px] flex-col items-center gap-2 text-center shrink-0"
            >
              <div className="relative h-[68px] w-[68px] overflow-hidden rounded-full ring-1 ring-border group-hover:ring-2 group-hover:ring-primary transition-all duration-500 ease-out shadow-soft group-hover:shadow-soft-lg">
                <img
                  src={CATEGORY_REAL_IMAGES[c]}
                  alt={LABELS[c]}
                  loading="lazy"
                  className="smooth-img h-full w-full object-cover"
                />
              </div>
              <span className="text-[11px] font-medium text-foreground/85 group-hover:text-primary transition-colors line-clamp-1 tracking-tight">
                {LABELS[c]}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:grid gap-4 grid-cols-6 lg:grid-cols-11">
        {ALL_CATEGORIES.map((c) => (
          <Link
            key={c}
            to={`/results?category=${encodeURIComponent(c)}`}
            className="group press flex flex-col items-center gap-2.5 text-center"
          >
            <div className="relative h-16 w-16 lg:h-[88px] lg:w-[88px] overflow-hidden rounded-full ring-1 ring-border group-hover:ring-2 group-hover:ring-primary transition-all duration-500 ease-out shadow-soft group-hover:shadow-soft-lg">
              <img
                src={CATEGORY_REAL_IMAGES[c]}
                alt={LABELS[c]}
                loading="lazy"
                className="smooth-img h-full w-full object-cover"
              />
            </div>
            <span className="text-xs font-medium text-foreground/85 group-hover:text-primary transition-colors line-clamp-1 tracking-tight">
              {LABELS[c]}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
