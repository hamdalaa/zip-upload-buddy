import { Link } from "react-router-dom";
import { ArrowUp, Compass, MapPin } from "lucide-react";

const columns = [
  {
    title: "استكشاف",
    links: [
      { to: "/", label: "الرئيسية" },
      { to: "/results", label: "كل المنتجات" },
      { to: "/brands", label: "وكلاء البراندات" },
      { to: "/iraq", label: "محافظات العراق" },
    ],
  },
  {
    title: "مسارات السوق",
    links: [
      { to: "/sinaa", label: "شارع الصناعة" },
      { to: "/rubaie", label: "شارع الربيعي" },
      { to: "/results?category=PC%20Parts", label: "قطع PC" },
      { to: "/results?category=Networking", label: "الشبكات" },
    ],
  },
  {
    title: "منصة تايه",
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
    <footer className="relative mt-24 overflow-hidden border-t border-white/10 bg-secondary text-secondary-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,hsl(var(--primary)_/_0.16),transparent_28%),radial-gradient(circle_at_90%_20%,hsl(var(--accent)_/_0.16),transparent_26%)]" />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-10" />

      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="رجوع للأعلى"
        className="press fixed bottom-5 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-primary text-primary-foreground shadow-soft-lg transition-colors hover:bg-primary/90 md:bottom-6 md:right-6 md:h-12 md:w-12"
      >
        <ArrowUp className="h-5 w-5" />
      </button>

      <div className="container relative py-14 md:py-18">
        <div className="grid gap-10 border-b border-white/10 pb-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="max-w-2xl text-right">
            <Link to="/" className="inline-flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Compass className="h-5 w-5" strokeWidth={2.2} />
              </span>
              <div>
                <div className="font-display text-3xl font-bold leading-none">تايه</div>
                <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.24em] text-secondary-foreground/58">
                  Iraqi Electronics Atlas
                </div>
              </div>
            </Link>

            <p className="mt-5 max-w-[48rem] text-sm leading-8 text-secondary-foreground/72">
              تايه مو متجر، بل طبقة توجيه أوضح فوق سوق الإلكترونيات العراقي: محلات، منتجات، محافظات، ووكلاء رسميون
              ضمن تجربة واحدة تركّز على القرار السريع والثقة قبل الخروج من البيت.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                to="/results"
                className="rounded-full bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
              >
                ابدأ البحث
              </Link>
              <Link
                to="/iraq"
                className="rounded-full border border-white/16 px-5 py-3 text-sm font-bold text-secondary-foreground transition-colors hover:bg-white/8"
              >
                تصفّح المحافظات
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-[1.75rem] border border-white/12 bg-white/6 p-5">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground/55">
                بوصلة المنصة
              </div>
              <div className="mt-4 space-y-3 text-sm text-secondary-foreground/78">
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <span>محلات + منتجات + خرائط</span>
                  <span className="font-display text-xl">01</span>
                </div>
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <span>ثقة مرئية قبل التواصل</span>
                  <span className="font-display text-xl">02</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>تجربة مهيأة للموبايل</span>
                  <span className="font-display text-xl">03</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-8 border-b border-white/10 py-10 md:grid-cols-3">
          {columns.map((column) => (
            <div key={column.title} className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-secondary-foreground/52">
                {column.title}
              </div>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      to={link.to}
                      className="inline-flex items-center gap-2 text-sm text-secondary-foreground/78 transition-colors hover:text-secondary-foreground"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary/90" />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 pt-6 text-center md:flex-row md:items-center md:justify-between md:text-right">
          <p className="text-xs leading-6 text-secondary-foreground/52">
            البيانات مبنية على آخر فهرسة متاحة وليست تحديثاً لحظياً. الهدف هو تقليل التشتت ورفع سرعة الوصول
            للمحل أو المنتج المناسب.
          </p>
          <p className="text-xs text-secondary-foreground/38">© {new Date().getFullYear()} تايه</p>
        </div>
      </div>
    </footer>
  );
}
