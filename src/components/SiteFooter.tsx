import { Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";

const columns = [
  {
    title: "استكشاف",
    links: [
      { to: "/", label: "الرئيسية" },
      { to: "/results", label: "كل المنتجات" },
      { to: "/brands", label: "الوكلاء" },
      { to: "/iraq", label: "المحافظات" },
    ],
  },
  {
    title: "الشوارع",
    links: [
      { to: "/sinaa", label: "شارع الصناعة" },
      { to: "/rubaie", label: "شارع الربيعي" },
      { to: "/results?category=PC%20Parts", label: "قطع PC" },
      { to: "/results?category=Networking", label: "الشبكات" },
    ],
  },
  {
    title: "المنصة",
    links: [
      { to: "/dashboard", label: "لوحة الإدارة" },
      { to: "/results?category=Phones", label: "الهواتف" },
      { to: "/results?category=Chargers", label: "الشواحن" },
      { to: "/brand/apple", label: "Apple" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative mt-24 border-t-2 border-foreground bg-background">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="رجوع للأعلى"
        className="press fixed bottom-5 right-3 z-40 flex h-11 w-11 items-center justify-center border border-foreground bg-background text-foreground transition-colors hover:bg-foreground hover:text-background md:bottom-6 md:right-6 md:h-12 md:w-12"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      <div className="container py-14 md:py-20">
        {/* Masthead block */}
        <div className="grid gap-10 border-b border-border pb-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="text-right">
            <Link to="/" className="inline-block">
              <div className="font-display text-5xl font-bold leading-none text-foreground md:text-6xl">تايه</div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-[0.32em] text-muted-foreground">
                Tayeh — Iraqi Electronics Atlas
              </div>
            </Link>

            <p className="mt-6 max-w-[48rem] text-sm leading-8 text-muted-foreground">
              تايه مو متجر، بل طبقة توجيه أوضح فوق سوق الإلكترونيات العراقي: محلات،
              منتجات، محافظات، ووكلاء رسميون ضمن تجربة واحدة تركّز على القرار السريع
              والثقة قبل الخروج من البيت.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                to="/results"
                className="border-b-2 border-primary py-2 text-sm font-bold uppercase tracking-[0.2em] text-foreground hover:text-primary"
              >
                ابدأ البحث →
              </Link>
              <Link
                to="/iraq"
                className="border-b-2 border-transparent py-2 text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground hover:border-foreground hover:text-foreground"
              >
                المحافظات →
              </Link>
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title} className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-muted-foreground">
                  {column.title}
                </div>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-foreground/80 transition-colors hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-center md:flex-row md:items-center md:justify-between md:text-right">
          <p className="text-xs leading-6 text-muted-foreground">
            البيانات مبنية على آخر فهرسة متاحة وليست تحديثاً لحظياً.
          </p>
          <p className="font-numeric text-xs text-muted-foreground">© {new Date().getFullYear()} Tayeh</p>
        </div>
      </div>
    </footer>
  );
}
