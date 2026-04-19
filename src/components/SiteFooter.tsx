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
    <footer className="relative mt-20 bg-secondary text-secondary-foreground">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="رجوع للأعلى"
        className="press fixed bottom-5 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-glow transition-transform hover:scale-105 md:bottom-6 md:right-6 md:h-12 md:w-12"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      <div className="container py-14 md:py-20">
        {/* Masthead block */}
        <div className="grid gap-10 border-b border-secondary-foreground/10 pb-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="text-right">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
                <span className="font-display text-2xl font-bold leading-none text-primary-foreground">ت</span>
              </div>
              <div>
                <div className="font-display text-3xl font-semibold leading-none text-secondary-foreground md:text-4xl">حاير</div>
                <div className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-secondary-foreground/55">
                  Hayer — Iraqi Electronics Atlas
                </div>
              </div>
            </Link>

            <p className="mt-6 max-w-[48rem] text-sm leading-7 text-secondary-foreground/70">
              حاير مو متجر، بل طبقة توجيه أوضح فوق سوق الإلكترونيات العراقي: محلات،
              منتجات، محافظات، ووكلاء رسميون ضمن تجربة واحدة تركّز على القرار السريع
              والثقة قبل الخروج من البيت.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/results"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary-glow transition-colors shadow-glow"
              >
                ابدأ البحث ←
              </Link>
              <Link
                to="/iraq"
                className="inline-flex items-center gap-2 rounded-full border border-secondary-foreground/20 px-5 py-2.5 text-sm font-medium text-secondary-foreground/80 hover:border-secondary-foreground/40 hover:text-secondary-foreground transition-colors"
              >
                المحافظات ←
              </Link>
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title} className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-secondary-foreground/50">
                  {column.title}
                </div>
                <ul className="mt-4 space-y-3">
                  {column.links.map((link) => (
                    <li key={link.to}>
                      <Link
                        to={link.to}
                        className="text-sm text-secondary-foreground/75 transition-colors hover:text-primary-glow"
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
          <p className="text-xs leading-6 text-secondary-foreground/55">
            البيانات مبنية على آخر فهرسة متاحة وليست تحديثاً لحظياً.
          </p>
          <p className="font-numeric text-xs text-secondary-foreground/55">© {new Date().getFullYear()} Hayer</p>
        </div>
      </div>
    </footer>
  );
}
