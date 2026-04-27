import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, House } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { getVisualTheme, type VisualThemeKey } from "@/lib/visualTheme";

interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface Metric {
  label: string;
  value: string;
}

interface Props {
  theme: VisualThemeKey;
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  title: string;
  description?: string;
  metrics?: Metric[];
  media?: ReactNode;
  aside?: ReactNode;
  className?: string;
  titleClassName?: string;
}

export function PageHero({
  theme,
  breadcrumbs = [],
  eyebrow,
  title,
  description,
  metrics,
  media,
  aside,
  className,
  titleClassName,
}: Props) {
  const visualTheme = getVisualTheme(theme);

  return (
    <section className={cn(visualTheme.heroClassName, className)}>
      <div className="container page-hero-inner">
        {breadcrumbs.length > 0 ? (
          <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap text-xs text-muted-foreground">
            <Link to="/" className="inline-flex items-center gap-1 transition-colors hover:text-primary">
              <House className="h-3.5 w-3.5" weight="duotone" />
              الرئيسية
            </Link>
            {breadcrumbs.map((item, index) => (
              <div key={`${item.label}-${index}`} className="inline-flex items-center gap-2">
                <ArrowLeft className="h-3 w-3" weight="bold" />
                {item.to ? (
                  <Link to={item.to} className="transition-colors hover:text-primary">
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground">{item.label}</span>
                )}
              </div>
            ))}
          </div>
        ) : null}

        <div className={cn("grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,380px)] lg:items-end", !media && !aside && "lg:grid-cols-1")}>
          <div className="text-right">
            {eyebrow ? <span className={visualTheme.eyebrowClassName}>{eyebrow}</span> : null}
            <h1 className={cn("font-display mt-4 max-w-[14ch] text-[clamp(2.45rem,5vw,5.25rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-foreground", titleClassName)}>
              {title}
            </h1>
            {description ? <p className={cn("mt-4", visualTheme.descriptionClassName)}>{description}</p> : null}
            {metrics && metrics.length > 0 ? (
              <div className="page-metrics mt-7">
                {metrics.map((metric) => (
                  <div key={metric.label} className="page-metric text-right">
                    <div className="page-metric-value">{metric.value}</div>
                    <div className="page-metric-label">{metric.label}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {media || aside ? (
            <div className="space-y-4">
              {media}
              {aside}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
