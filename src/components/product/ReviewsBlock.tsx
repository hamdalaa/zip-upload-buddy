/**
 * ReviewsBlock — advanced ratings UI for ProductDetail. Renders:
 * – Big average rating + total count
 * – Distribution bars (5★ → 1★) computed from samples (or evenly when only
 *   the average is available)
 * – Star-based filter pills
 * – Sample reviews list (Google Places-shaped)
 */
import { useMemo, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const arabicNumber = new Intl.NumberFormat("ar");

export interface ReviewSample {
  rating?: number | null;
  text?: string;
  authorName?: string;
  relativePublishTime?: string;
}

interface Props {
  rating?: number;
  reviewCount?: number;
  samples?: ReviewSample[];
}

export function ReviewsBlock({ rating, reviewCount, samples }: Props) {
  const [filter, setFilter] = useState<number | null>(null);

  // Distribution: prefer real samples; otherwise estimate from the average.
  const distribution = useMemo(() => {
    const buckets = [0, 0, 0, 0, 0]; // index 0 = 1★, 4 = 5★
    if (samples && samples.length > 0) {
      for (const s of samples) {
        const r = Math.round(Number(s.rating ?? 0));
        if (r >= 1 && r <= 5) buckets[r - 1] += 1;
      }
      const total = buckets.reduce((a, b) => a + b, 0) || 1;
      return buckets.map((c) => Math.round((c / total) * 100));
    }
    // Estimate around the average when we only have a number.
    const avg = rating ?? 0;
    if (avg <= 0) return [0, 0, 0, 0, 0];
    const peak = Math.min(4, Math.max(0, Math.round(avg) - 1));
    return buckets.map((_, i) => {
      const distance = Math.abs(i - peak);
      if (distance === 0) return 60;
      if (distance === 1) return 22;
      if (distance === 2) return 10;
      return 4;
    });
  }, [samples, rating]);

  const filtered = useMemo(() => {
    if (!samples) return [];
    if (filter == null) return samples;
    return samples.filter((s) => Math.round(Number(s.rating ?? 0)) === filter);
  }, [samples, filter]);

  if (!rating || rating <= 0) return null;

  return (
    <section
      aria-labelledby="reviews-heading"
      className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6"
    >
      <div className="grid gap-6 sm:grid-cols-[220px_1fr] sm:gap-8">
        {/* Average */}
        <div className="flex flex-col items-center justify-center text-center">
          <h3
            id="reviews-heading"
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
          >
            تقييمات العملاء
          </h3>
          <div className="mt-2 font-numeric text-5xl font-semibold tabular-nums tracking-tight text-foreground">
            {rating.toFixed(1)}
          </div>
          <div className="mt-2 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((step) => (
              <Star
                key={step}
                className={cn(
                  "h-4 w-4",
                  step <= Math.round(rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground/30",
                )}
              />
            ))}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {arabicNumber.format(reviewCount ?? 0)} تقييم
          </div>
        </div>

        {/* Distribution */}
        <ul className="flex flex-col gap-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const pct = distribution[star - 1];
            const active = filter === star;
            return (
              <li key={star}>
                <button
                  type="button"
                  onClick={() => setFilter(active ? null : star)}
                  aria-pressed={active}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-start transition-colors",
                    active ? "bg-primary-soft" : "hover:bg-surface/60",
                  )}
                >
                  <span className="flex w-9 shrink-0 items-center gap-0.5 text-[12px] font-semibold tabular-nums text-foreground/80">
                    {star}
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  </span>
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/60">
                    <span
                      className={cn(
                        "absolute inset-y-0 start-0 rounded-full transition-[width] duration-500",
                        active ? "bg-primary" : "bg-foreground/70",
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </span>
                  <span className="w-10 shrink-0 text-end text-[11px] tabular-nums text-muted-foreground">
                    {pct}%
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Filter chip + samples */}
      {samples && samples.length > 0 && (
        <div className="mt-6 border-t border-border/40 pt-5">
          <div className="flex flex-wrap items-center gap-2 pb-4">
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              {filter ? `${filter} نجوم` : "كل التقييمات"}
            </span>
            {filter && (
              <button
                type="button"
                onClick={() => setFilter(null)}
                className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                مسح الفلتر
              </button>
            )}
          </div>

          {filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border bg-surface/40 px-4 py-6 text-center text-[12px] text-muted-foreground">
              لا توجد تقييمات بهذا التصنيف.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {filtered.slice(0, 5).map((s, idx) => (
                <li key={idx} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((step) => (
                        <Star
                          key={step}
                          className={cn(
                            "h-3 w-3",
                            step <= Math.round(Number(s.rating ?? 0))
                              ? "fill-amber-400 text-amber-400"
                              : "text-muted-foreground/30",
                          )}
                        />
                      ))}
                    </div>
                    {s.relativePublishTime && (
                      <span className="text-[10.5px] text-muted-foreground">
                        {s.relativePublishTime}
                      </span>
                    )}
                  </div>
                  {s.text && (
                    <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-foreground/85">
                      {s.text}
                    </p>
                  )}
                  {s.authorName && (
                    <div className="mt-1.5 text-[11px] font-semibold text-muted-foreground">
                      — {s.authorName}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}