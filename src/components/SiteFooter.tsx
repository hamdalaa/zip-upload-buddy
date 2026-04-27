import { Link, useLocation } from "react-router-dom";
import { ArrowUp } from "lucide-react";

const columns = [
  {
    title: "استكشاف",
    links: [
      { to: "/", label: "الرئيسية" },
      { to: "/search", label: "كل المنتجات" },
      { to: "/brands", label: "الوكلاء" },
      { to: "/iraq", label: "المحافظات" },
      { to: "/answers", label: "إجابات AI" },
    ],
  },
  {
    title: "الشوارع",
    links: [
      { to: "/sinaa", label: "شارع الصناعة" },
      { to: "/rubaie", label: "شارع الربيعي" },
      { to: "/search?category=PC%20Parts", label: "قطع PC" },
      { to: "/search?category=Networking", label: "الشبكات" },
    ],
  },
  {
    title: "الفئات",
    links: [
      { to: "/search?category=Phones", label: "الهواتف" },
      { to: "/search?category=Chargers", label: "الشواحن" },
      { to: "/search?category=Gaming", label: "الألعاب" },
      { to: "/search?category=Cameras", label: "الكاميرات" },
    ],
  },
  {
    title: "المنصة",
    links: [
      { to: "/about", label: "عن حاير" },
      { to: "/brand/apple", label: "Apple" },
      { to: "/brand/samsung", label: "Samsung" },
    ],
  },
];

export function SiteFooter() {
  const location = useLocation();

  return (
    <footer className="relative mt-24 bg-surface-2 text-foreground">
      <div aria-hidden className="h-px w-full bg-surface-2" />
      {location.pathname !== "/" && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="رجوع للأعلى"
          className="ios-tap fixed bottom-24 right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-card/88 text-muted-foreground shadow-[0_16px_38px_-26px_rgba(23,32,23,0.45)] ring-1 ring-border backdrop-blur-md transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] hover:-translate-y-0.5 hover:text-foreground md:bottom-6 md:right-6 md:h-11 md:w-11"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}

      <div className="container py-14 md:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
          <div className="text-right">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-foreground text-background shadow-[0_16px_34px_-26px_rgba(23,32,23,0.7)]">
                <span className="font-sans text-lg font-extrabold leading-none">ح</span>
              </div>
              <div className="font-display text-3xl font-bold leading-none tracking-normal text-foreground">حـايـر</div>
            </Link>

            <p className="mt-5 max-w-sm text-[13px] leading-7 text-muted-foreground">
              طبقة توجيه أوضح فوق سوق الإلكترونيات العراقي — محلات، منتجات، محافظات، ووكلاء رسميون.
            </p>
          </div>

          {/* Columns — clean grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-4">
            {columns.map((column) => (
              <div key={column.title} className="min-w-0 text-right">
                <h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                  {column.title}
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {column.links.map((link) => (
                    <li key={link.to} className="min-w-0">
                      <Link
                        to={link.to}
                        className="inline-block text-[13px] text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span className="truncate">{link.label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-12 flex flex-col gap-2 border-t border-border pt-6 text-center md:flex-row md:items-center md:justify-between md:text-right">
          <p className="text-[11px] leading-5 text-muted-foreground">
            البيانات مبنية على آخر فهرسة متاحة وليست تحديثاً لحظياً.
          </p>
          <p className="font-numeric text-[11px] text-muted-foreground tabular-stable">
            © {new Date().getFullYear()} Hayer
          </p>
        </div>
      </div>
    </footer>
  );
}
