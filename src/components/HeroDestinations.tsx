import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles, MapPin, Cpu, Smartphone, type LucideIcon } from "lucide-react";

interface Destination {
  to: string;
  kicker: string;
  title: string;
  meta: string;
  badge?: string;
  Icon: LucideIcon;
  accent: "primary" | "cyan" | "violet";
}

const DESTINATIONS: Destination[] = [
  {
    to: "/iraq",
    kicker: "خرائط",
    title: "كل محافظات العراق",
    meta: "10 محافظات · 1,200+ محل",
    badge: "جديد",
    Icon: MapPin,
    accent: "primary",
  },
  {
    to: "/sinaa",
    kicker: "بغداد",
    title: "شارع الصناعة",
    meta: "حاسبات · شبكات · طابعات",
    Icon: Cpu,
    accent: "cyan",
  },
  {
    to: "/rubaie",
    kicker: "بغداد",
    title: "شارع الربيعي",
    meta: "موبايلات · إكسسوارات",
    Icon: Smartphone,
    accent: "violet",
  },
];

const ACCENT_STYLES: Record<
  Destination["accent"],
  {
    glow: string;
    ring: string;
    iconBg: string;
    iconText: string;
    blob1: string;
    blob2: string;
    grid: string;
  }
> = {
  primary: {
    glow: "from-primary/30 via-primary/10 to-transparent",
    ring: "ring-primary/30",
    iconBg: "bg-primary/15",
    iconText: "text-primary",
    blob1: "bg-primary/25",
    blob2: "bg-primary/15",
    grid: "text-primary/40",
  },
  cyan: {
    glow: "from-cyan/30 via-cyan/10 to-transparent",
    ring: "ring-cyan/30",
    iconBg: "bg-cyan-soft/70",
    iconText: "text-cyan",
    blob1: "bg-cyan/25",
    blob2: "bg-cyan/15",
    grid: "text-cyan/40",
  },
  violet: {
    glow: "from-violet/30 via-violet/10 to-transparent",
    ring: "ring-violet/30",
    iconBg: "bg-violet-soft/70",
    iconText: "text-violet",
    blob1: "bg-violet/25",
    blob2: "bg-violet/15",
    grid: "text-violet/40",
  },
};

export function HeroDestinations() {
  return (
    <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
      {DESTINATIONS.map((d, index) => {
        const a = ACCENT_STYLES[d.accent];
        const Icon = d.Icon;
        return (
          <Link
            key={d.to}
            to={d.to}
            className="group animate-fade-in-up relative block overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_2px_-1px_hsl(var(--foreground)/0.06)] transition-[transform,box-shadow,border-color] duration-500 ease-ios will-change-transform [@media(hover:hover)]:hover:-translate-y-1.5 [@media(hover:hover)]:hover:border-foreground/25 [@media(hover:hover)]:hover:shadow-[0_18px_44px_-18px_hsl(var(--foreground)/0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label={d.title}
            style={{ animationDelay: `${500 + index * 100}ms`, animationFillMode: "backwards" }}
          >
            {/* Creative artwork panel */}
            <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-muted/40 via-card to-background">
              {/* Dotted grid backdrop */}
              <svg
                aria-hidden
                className={`absolute inset-0 h-full w-full ${a.grid} opacity-40`}
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <pattern id={`dots-${d.to}`} x="0" y="0" width="18" height="18" patternUnits="userSpaceOnUse">
                    <circle cx="1.2" cy="1.2" r="1.2" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill={`url(#dots-${d.to})`} />
              </svg>

              {/* Soft color blobs */}
              <div
                aria-hidden
                className={`absolute -top-10 -end-10 h-40 w-40 rounded-full blur-3xl ${a.blob1} animate-drift-1`}
              />
              <div
                aria-hidden
                className={`absolute -bottom-12 -start-8 h-36 w-36 rounded-full blur-3xl ${a.blob2} animate-drift-2`}
              />

              {/* Decorative ring */}
              <svg
                aria-hidden
                className={`absolute -bottom-8 -end-6 h-32 w-32 ${a.iconText} opacity-25 animate-spin-slow`}
                viewBox="0 0 100 100"
                fill="none"
              >
                <circle cx="50" cy="50" r="46" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" />
              </svg>

              {/* Radial glow */}
              <div
                aria-hidden
                className={`absolute inset-0 bg-gradient-radial ${a.glow}`}
                style={{ background: `radial-gradient(circle at 70% 30%, hsl(var(--${d.accent === "primary" ? "primary" : d.accent})/0.18), transparent 60%)` }}
              />

              {/* Top chips */}
              <div className="absolute end-3 top-3 z-10 flex items-center gap-1.5">
                <span className="inline-flex items-center rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-foreground shadow-xs backdrop-blur-md">
                  {d.kicker}
                </span>
                {d.badge && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-soft px-2 py-1 text-[10px] font-bold text-emerald shadow-xs">
                    <Sparkles className="h-2.5 w-2.5" strokeWidth={2.6} />
                    {d.badge}
                  </span>
                )}
              </div>

              {/* Big icon */}
              <div className="absolute inset-x-0 top-[30%] z-0 flex -translate-y-1/2 items-center justify-center">
                <div
                  className={`relative flex h-16 w-16 items-center justify-center rounded-2xl ${a.iconBg} ring-1 ${a.ring} shadow-[0_10px_30px_-10px_hsl(var(--foreground)/0.15)] backdrop-blur-sm transition-transform duration-500 ease-ios [@media(hover:hover)]:group-hover:scale-110 [@media(hover:hover)]:group-hover:-rotate-3 sm:h-20 sm:w-20`}
                >
                  <Icon className={`h-8 w-8 ${a.iconText} sm:h-10 sm:w-10`} strokeWidth={1.8} />
                  <span
                    aria-hidden
                    className={`absolute -end-1 -top-1 h-3 w-3 rounded-full ${a.blob1} animate-ping-soft`}
                  />
                </div>
              </div>

              {/* Title block */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex min-h-[92px] flex-col justify-end bg-gradient-to-t from-background/95 via-background/80 to-transparent px-4 pb-4 pt-10 text-center sm:min-h-[104px] sm:px-5 sm:pb-5">
                <h3 className="font-display text-balance text-base font-semibold leading-tight tracking-tight text-foreground sm:text-[17px]">
                  {d.title}
                </h3>
                <p className="mt-1 text-[11.5px] text-muted-foreground sm:text-[12px]">
                  {d.meta}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-border/60 px-4 py-3.5 text-start sm:px-5">
              <span className={`inline-flex items-center gap-1 text-[12px] font-semibold ${a.iconText} transition-transform duration-300 [@media(hover:hover)]:group-hover:-translate-x-1`}>
                استكشف <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
              </span>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground/70 tabular-nums">
                <span aria-hidden className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
