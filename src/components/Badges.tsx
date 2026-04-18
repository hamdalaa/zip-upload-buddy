import { BadgeCheck, Clock4 } from "lucide-react";
import { cn } from "@/lib/utils";

export function VerifiedBadge({ verified, className }: { verified: boolean; className?: string }) {
  if (verified) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 rounded-full border border-white/12 bg-black/32 px-2.5 py-1 text-[10px] font-bold text-white backdrop-blur-sm",
          className,
        )}
      >
        <BadgeCheck className="h-3 w-3" />
        محل موثّق
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-border/75 bg-background/94 px-2.5 py-1 text-[10px] font-bold text-muted-foreground",
        className,
      )}
    >
      <Clock4 className="h-3 w-3" />
      غير موثّق
    </span>
  );
}

export function StaleBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/14 px-2.5 py-1 text-[10px] font-bold text-warning",
        className,
      )}
    >
      قديم
    </span>
  );
}
