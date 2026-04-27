import { useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft } from "lucide-react";
import type { Category } from "@/lib/types";
import { CATEGORY_REAL_IMAGES } from "@/lib/categoryImages";
import { useDataStore } from "@/lib/dataStore";

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

type CategoryCard = {
  category: Category;
  title: string;
  subtitle: string;
  fallbackCount: number;
  imageCategory?: Category;
  imageClassName?: string;
  imageWellClassName?: string;
  titleClassName?: string;
};

const FEATURED_CATEGORIES: CategoryCard[] = [
  {
    category: "Phones",
    title: "الهواتف",
    subtitle: "آيفون، سامسونج، شاومي",
    fallbackCount: 12540,
    imageClassName: "scale-[1.03] object-[50%_52%]",
    imageWellClassName: "bg-foreground",
  },
  {
    category: "Computing",
    title: "اللابتوبات",
    subtitle: "ماك، لينوفو، أسوس",
    fallbackCount: 8230,
    imageClassName: "scale-[0.98] object-[50%_53%]",
    imageWellClassName: "bg-foreground",
  },
  {
    category: "PC Parts",
    title: "قطع PC",
    subtitle: "كروت شاشة، SSD، RAM",
    fallbackCount: 5320,
    imageClassName: "scale-[1.01] object-center",
    imageWellClassName: "bg-white/90",
  },
  {
    category: "Accessories",
    title: "الإكسسوارات",
    subtitle: "شواحن، سماعات، حمايات",
    fallbackCount: 24115,
    imageClassName: "scale-[1.04] object-[54%_50%]",
    imageWellClassName: "bg-white/90",
    titleClassName: "text-[1.08rem] sm:text-[1.28rem] md:text-[1.44rem]",
  },
  {
    category: "Gaming",
    title: "الألعاب",
    subtitle: "بلايستيشن، إكس بوكس",
    fallbackCount: 3890,
    imageClassName: "scale-[1.02] object-center",
    imageWellClassName: "bg-foreground",
  },
  {
    category: "Smart Devices",
    title: "الأجهزة الذكية",
    subtitle: "ساعات، أجهزة منزلية",
    fallbackCount: 6712,
    imageClassName: "scale-[0.98] object-center",
    imageWellClassName: "bg-white/90",
    titleClassName: "text-[1.06rem] sm:text-[1.24rem] md:text-[1.4rem]",
  },
];

function formatArabicCount(value: number) {
  return `${value.toLocaleString("en-US")} منتج`;
}

export function CategoryCircles() {
  const { products } = useDataStore();
  const railRef = useRef<HTMLDivElement>(null);
  const counts = useMemo(() => {
    const next = new Map<Category, number>();
    for (const product of products) {
      next.set(product.category, (next.get(product.category) ?? 0) + 1);
    }
    return next;
  }, [products]);

  function scrollRail() {
    railRef.current?.scrollBy({
      left: -Math.min(railRef.current.clientWidth * 0.78, 760),
      behavior: "smooth",
    });
  }

  return (
    <section id="categories" className="reveal-init reveal-on scroll-mt-24">
      <div className="mb-4 flex items-end justify-between gap-3 text-right sm:mb-8">
        <div className="min-w-0">
          <span className="atlas-kicker text-primary">الفئات</span>
          <h2 className="font-display mt-2 text-[clamp(1.35rem,5.4vw,2.05rem)] font-black leading-[1.1] tracking-normal text-foreground sm:mt-3 sm:text-4xl">
            تسوق حسب الحاجة
          </h2>
        </div>
        <Link
          to="/search"
          className="group inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[12px] font-bold text-background shadow-[0_16px_34px_-26px_hsl(var(--foreground)/0.65)] transition-[transform,box-shadow,background-color] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.98] hover:-translate-y-0.5 hover:bg-foreground/92 hover:shadow-[0_22px_42px_-28px_hsl(var(--foreground)/0.75)] sm:min-h-11 sm:gap-2 sm:px-4 sm:py-2 sm:text-sm md:mb-1"
        >
          كل الأقسام
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background/10 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1">
            <ArrowLeft className="h-3.5 w-3.5" />
          </span>
        </Link>
      </div>

      <div className="relative isolate -mx-4 overflow-hidden px-4 py-2 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(90deg,hsl(var(--primary)/0.045)_1px,transparent_1px),linear-gradient(180deg,hsl(var(--primary)/0.035)_1px,transparent_1px)] bg-[size:72px_72px] opacity-45 md:opacity-70"
        />
        <button
          type="button"
          onClick={scrollRail}
          className="ios-tap absolute left-4 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-card text-muted-foreground shadow-[0_20px_44px_-30px_rgba(23,32,23,0.5)] ring-1 ring-primary/15 transition-[background-color,color,box-shadow,transform] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:-translate-x-[calc(50%+2px)] hover:bg-white hover:text-foreground hover:shadow-[0_24px_52px_-34px_rgba(23,32,23,0.52)] md:flex"
          aria-label="تمرير الفئات"
        >
          <ChevronLeft className="h-5 w-5" strokeWidth={1.9} />
        </button>

        <div
          ref={railRef}
          className="-mx-4 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6 md:-mx-2 md:px-2"
        >
          <div className="flex w-max snap-x snap-mandatory gap-3 sm:gap-4 md:gap-5">
            {FEATURED_CATEGORIES.map((item, index) => {
              const imageKey = item.imageCategory ?? item.category;
              const count = counts.get(item.category) ?? 0;
              return (
                <Link
                  key={`${item.title}-${index}`}
                  to={`/search?category=${encodeURIComponent(item.category)}`}
                  className="group relative flex h-[178px] w-[72vw] max-w-[292px] shrink-0 snap-center overflow-hidden rounded-[1.55rem] bg-[linear-gradient(145deg,hsl(var(--border)/0.95),hsl(var(--primary)/0.12),hsl(var(--border)/0.45))] p-px text-right shadow-[0_18px_48px_-42px_rgba(23,32,23,0.38)] transition-[transform,box-shadow,background-color] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] active:scale-[0.985] hover:-translate-y-1 hover:shadow-[0_32px_70px_-50px_rgba(23,32,23,0.5)] sm:h-[190px] sm:w-[46vw] md:h-[164px] md:w-[320px] md:snap-start md:rounded-[1.8rem]"
                >
                  <article className="relative flex h-full w-full flex-col overflow-hidden rounded-[calc(1.55rem-1px)] bg-card/96 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.94)] md:rounded-[calc(1.8rem-1px)] md:p-4 md:pl-[7.9rem]">
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,hsl(var(--primary-soft)/0.36),transparent_46%)] md:bg-[radial-gradient(circle_at_18%_20%,hsl(var(--primary)/0.1),transparent_34%),linear-gradient(180deg,hsl(var(--card)/0.08),transparent)]"
                    />
                    <div
                      className={`relative z-10 mb-2.5 flex h-[72px] w-full shrink-0 items-center justify-center overflow-hidden rounded-[1.05rem] ring-1 ring-black/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.62)] sm:h-[80px] md:absolute md:inset-y-4 md:left-4 md:mb-0 md:h-auto md:w-[6.5rem] md:rounded-[1.15rem] ${item.imageWellClassName ?? "bg-white/86"}`}
                    >
                      <div aria-hidden className="absolute inset-0 bg-white/10" />
                      <div className="relative z-10 h-full w-full transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.035]">
                        <img
                          src={CATEGORY_REAL_IMAGES[imageKey]}
                          alt={item.title}
                          loading="lazy"
                          decoding="async"
                          className={`smooth-img h-full w-full object-contain p-1.5 drop-shadow-[0_14px_22px_rgba(23,32,23,0.16)] md:p-0 ${item.imageClassName ?? ""}`}
                        />
                      </div>
                    </div>
                    <div className="relative z-10 flex min-w-0 flex-1 flex-col justify-between">
                      <div>
                        <div className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-[10px] font-bold text-muted-foreground ring-1 ring-primary/14 md:inline-flex">
                          {LABELS[item.category]}
                        </div>
                        <h3
                          className={`line-clamp-2 max-w-full break-words font-display text-[1.18rem] font-black leading-[1.05] tracking-normal text-foreground sm:text-[1.38rem] md:mt-2.5 md:line-clamp-1 md:whitespace-nowrap ${item.titleClassName ?? "md:text-[1.62rem]"}`}
                        >
                          {item.title}
                        </h3>
                        <p className="mt-1 line-clamp-1 text-[12px] font-semibold leading-4 text-muted-foreground md:mt-2 md:text-[12.5px]">{item.subtitle}</p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-numeric text-[11px] font-bold text-primary md:text-[13px]">
                          {formatArabicCount(count > 0 ? count : item.fallbackCount)}
                        </div>
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:-translate-x-1 md:h-8 md:w-8">
                          <ArrowLeft className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
