import { Link } from "react-router-dom";
import { SUGGESTED_QUERIES } from "@/lib/search";

export function QuickQueryChips() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">جرب:</span>
      {SUGGESTED_QUERIES.map((q) => (
        <Link
          key={q}
          to={`/results?q=${encodeURIComponent(q)}`}
          className="rounded-full border border-border bg-surface/60 px-3 py-1 text-xs font-medium text-foreground/90 transition-colors hover:border-primary/50 hover:bg-primary/10 hover:text-primary"
        >
          {q}
        </Link>
      ))}
    </div>
  );
}
