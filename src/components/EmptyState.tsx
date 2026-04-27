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
    <div
      className={cn(
        "flex min-h-[60vh] w-full items-center justify-center",
        className,
      )}
    >
      <div className="search-surface mx-auto w-full max-w-md p-1.5">
        <div className="search-core flex flex-col items-center gap-5 p-6 text-center sm:p-7">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/15 bg-primary-soft text-primary shadow-soft">
            {icon ?? <SearchX className="h-6 w-6" strokeWidth={2.2} />}
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
            {description && (
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            )}
          </div>
          {action && <div className="flex justify-center">{action}</div>}
        </div>
      </div>
    </div>
  );
}
