import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: string;
  className?: string;
  aside?: ReactNode;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionLabel,
  actionTo,
  className,
  aside,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-5 border-b border-border/70 pb-5 sm:pb-7 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-3xl text-right">
        {eyebrow ? <span className="atlas-kicker">{eyebrow}</span> : null}
        <h2 className="font-display mt-3 max-w-[18ch] text-2xl font-semibold leading-[1.02] tracking-[-0.045em] text-foreground sm:text-3xl md:text-4xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-[62ch] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8">
            {description}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {aside}
        {actionLabel && actionTo ? (
          <Link
            to={actionTo}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border/80 bg-card/85 px-4 text-sm font-semibold text-foreground transition-[transform,border-color,background-color,box-shadow,color] duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:text-primary hover:shadow-soft-md"
          >
            {actionLabel}
            <ArrowLeft className="h-4 w-4" weight="bold" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
