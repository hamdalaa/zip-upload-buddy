import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { CATEGORY_REAL_IMAGES } from "@/lib/categoryImages";
import { useDataStore } from "@/lib/dataStore";

interface Tile {
  to: string;
  title: string;
  subtitle: string;
  img: string;
  category: string;
  tint: string;
}

const TILES: Tile[] = [
  {
    to: "/results?category=Phones",
    title: "الهواتف",
    subtitle: "آيفون · سامسونج · شاومي",
    img: CATEGORY_REAL_IMAGES.Phones,
    category: "Phones",
    tint: "from-primary/15 to-primary/5",
  },
  {
    to: "/results?category=Computing",
    title: "اللابتوبات",
    subtitle: "ماك · لينوفو · أسوس",
    img: CATEGORY_REAL_IMAGES.Computing,
    category: "Computing",
    tint: "from-cyan/15 to-cyan/5",
  },
  {
    to: "/results?category=Gaming",
    title: "الألعاب",
    subtitle: "بلايستيشن · إكس بوكس",
    img: CATEGORY_REAL_IMAGES.Gaming,
    category: "Gaming",
    tint: "from-violet/15 to-violet/5",
  },
  {
    to: "/results?category=Accessories",
    title: "الإكسسوارات",
    subtitle: "شواحن · سماعات · حمايات",
    img: CATEGORY_REAL_IMAGES.Accessories,
    category: "Accessories",
    tint: "from-emerald/15 to-emerald/5",
  },
];

export function HeroCategoryTiles() {
  const { products } = useDataStore();

  const countFor = (cat: string) =>
    products.filter((p) => p.category === cat).length;

  return (
    <section className="container mt-10 sm:mt-16 md:mt-20">
      <div className="mb-5 flex items-end justify-between gap-4 sm:mb-7">
        <div>
          <span className="atlas-kicker">تسوّق حسب الفئة</span>
          <h2 className="font-display mt-2 text-balance text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-2xl md:text-3xl">
            ابدأ من القسم اللي يهمك
          </h2>
        </div>
        <Link
          to="/results"
          className="link-underline hidden shrink-0 items-center text-xs font-semibold uppercase tracking-[0.16em] text-primary hover:text-primary-glow sm:inline-flex"
        >
          كل الفئات ←
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 md:gap-5">
        {TILES.map((tile, index) => {
          const count = countFor(tile.category);
          return (
            <Link
              key={tile.to}
              to={tile.to}
              className="group press animate-fade-in-up relative isolate flex aspect-[4/5] flex-col overflow-hidden rounded-3xl border border-border/60 bg-card shadow-soft-md transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-primary/20 hover:shadow-soft-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: "backwards" }}
            >
              {/* Gradient tint base */}
              <div className={`absolute inset-0 -z-20 bg-gradient-to-b ${tile.tint}`} />

              {/* Image — centered, fills lower 2/3 */}
              <div className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
                <img
                  src={tile.img}
                  alt={tile.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-110"
                />
              </div>

              {/* Footer label */}
              <div className="relative flex items-center justify-between gap-2 border-t border-border/50 bg-card/80 px-3 py-2.5 backdrop-blur-md sm:px-4 sm:py-3">
                <div className="min-w-0 text-right">
                  <div className="font-display truncate text-sm font-semibold text-foreground sm:text-base">
                    {tile.title}
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground sm:text-[11px]">
                    {count > 0 ? `${count}+ منتج` : tile.subtitle}
                  </div>
                </div>
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground sm:h-8 sm:w-8">
                  <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
