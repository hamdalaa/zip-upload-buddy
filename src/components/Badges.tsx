import { BadgeCheck, Clock4 } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ verified, className }: { verified: boolean; className?: string }) {
  if (verified) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground",
          className,
        )}
      >
        <BadgeCheck className="h-3 w-3" />
        موثّق
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 bg-background/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground",
        className,
      )}
    >
      <Clock4 className="h-3 w-3" />
      —
    </span>
  );
}

export function StaleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 border border-warning/40 bg-warning/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-warning",
        className,
      )}
    >
      قديم
    </span>
  );
}
