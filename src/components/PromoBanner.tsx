import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export interface PromoBannerProps {
  to: string;
  kicker: string;
  title: string;
  description?: string;
  cta: string;
  image: string;
  /** Visual accent — primary (cyan), emerald, violet */
  tone?: "primary" | "emerald" | "violet";
}

const toneClasses: Record<NonNullable<PromoBannerProps["tone"]>, { bg: string; orb1: string; orb2: string; chip: string }> = {
  primary: {
    bg: "from-primary/15 via-background to-cyan/10",
    orb1: "bg-primary/25",
    orb2: "bg-cyan/20",
    chip: "border-primary/25 bg-primary/10 text-primary",
  },
  emerald: {
    bg: "from-emerald/15 via-background to-cyan/10",
    orb1: "bg-emerald/25",
    orb2: "bg-cyan/20",
    chip: "border-emerald/25 bg-emerald/10 text-emerald",
  },
  violet: {
    bg: "from-violet/15 via-background to-primary/10",
    orb1: "bg-violet/25",
    orb2: "bg-primary/20",
    chip: "border-violet/25 bg-violet/10 text-violet",
  },
};

export function PromoBanner({
  to,
  kicker,
  title,
  description,
  cta,
  image,
  tone = "primary",
}: PromoBannerProps) {
  const t = toneClasses[tone];
  return (
    <Link
      to={to}
      className={`group press relative isolate block overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-l ${t.bg} px-5 py-6 shadow-soft-md transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-xl sm:px-8 sm:py-10 md:px-12 md:py-12`}
    >
      <div aria-hidden className={`pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full ${t.orb1} blur-3xl`} />
      <div aria-hidden className={`pointer-events-none absolute -bottom-20 -right-12 h-64 w-64 rounded-full ${t.orb2} blur-3xl`} />

      <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto] sm:gap-8">
        <div className="text-right">
          <span className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${t.chip}`}>
            {kicker}
          </span>
          <h3 className="font-display mt-3 text-balance text-xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {title}
          </h3>
          {description && (
            <p className="mt-2 max-w-xl text-pretty text-sm leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
          )}
          <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors group-hover:text-primary-glow sm:text-base">
            <span>{cta}</span>
            <ArrowLeft className="h-4 w-4 translate-x-px transition-transform duration-300 group-hover:-translate-x-0.5" />
          </div>
        </div>

        <div className="relative hidden h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-border/50 bg-card/60 shadow-soft sm:block sm:h-40 sm:w-40 md:h-48 md:w-48">
          <img
            src={image}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
          />
        </div>
      </div>
    </Link>
  );
}