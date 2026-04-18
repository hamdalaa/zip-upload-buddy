import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { SearchX } from "lucide-react";

export function EmptyState({
  title,
  description,
  action,
  className,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border bg-card p-10 text-center shadow-soft-md", className)}>
      {/* Decorative aurora glow */}
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-60">
        <div className="absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-16 right-1/3 h-32 w-32 rounded-full bg-accent-violet/15 blur-3xl" style={{ background: "hsl(var(--accent-violet) / 0.18)" }} />
      </div>

      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-soft via-card to-violet-soft shadow-soft-md">
        {icon ?? <SearchX className="h-7 w-7 text-primary" />}
      </div>

      <h3 className="font-display text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
