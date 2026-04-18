import { BadgeCheck, Clock4 } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ verified, className }: { verified: boolean; className?: string }) {
  if (verified) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-success px-2.5 py-1 text-[10px] font-semibold tracking-wide text-primary-foreground shadow-soft-md",
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
        "inline-flex items-center gap-1 rounded-full bg-background/95 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-muted-foreground shadow-soft backdrop-blur-sm",
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
        "inline-flex items-center gap-1 rounded-full border border-warning/30 bg-warning/10 px-2 py-1 text-[10px] font-semibold tracking-wide text-warning",
        className,
      )}
    >
      قديم
    </span>
  );
}
