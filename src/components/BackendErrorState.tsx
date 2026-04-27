import { Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TopNav } from "@/components/TopNav";
import { SiteFooter } from "@/components/SiteFooter";
import { cn } from "@/lib/utils";

interface BackendErrorStateProps {
  title?: string;
  description?: string;
  error?: Error | null;
  onRetry?: () => void;
  /**
   * When true, renders only the inline card (no TopNav/Footer wrapper).
   * Use inside pages that already render their own chrome.
   */
  inline?: boolean;
  /**
   * Visual variant: "network" emphasises connectivity issues, "generic" is for
   * unexpected runtime errors.
   */
  variant?: "network" | "generic";
  className?: string;
}

export function BackendErrorState({
  title = "تعذّر الاتصال بالخادم",
  description = "البيانات ما وصلت من السيرفر. تأكد من الإنترنت أو حاول بعد لحظات.",
  error,
  onRetry,
  inline = false,
  variant = "network",
  className,
}: BackendErrorStateProps) {
  const Icon = variant === "network" ? WifiOff : AlertTriangle;

  const card = (
    <div
      className={cn(
        "relative mx-auto max-w-xl overflow-hidden rounded-3xl border border-border/70 bg-card/90 p-6 text-center shadow-soft-xl backdrop-blur-sm sm:p-8",
        className,
      )}
      role="alert"
    >
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-70">
        <div className="absolute -top-16 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-destructive/12 blur-3xl" />
        <div className="absolute -bottom-16 right-1/3 h-32 w-32 rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive shadow-soft-md">
        <Icon className="h-7 w-7" />
      </div>

      <h2 className="font-display text-xl font-bold text-foreground sm:text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>

      {error?.message && (
        <details className="mx-auto mt-4 max-w-md text-left text-xs text-muted-foreground/80">
          <summary className="cursor-pointer select-none text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground">
            تفاصيل تقنية
          </summary>
          <pre dir="ltr" className="mt-2 overflow-x-auto rounded-xl border border-border/60 bg-muted/40 p-3 text-[11px] leading-5">
            {error.message}
          </pre>
        </details>
      )}

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {onRetry && (
          <Button onClick={onRetry} className="gap-1.5 rounded-full">
            <RefreshCw className="h-4 w-4" />
            إعادة المحاولة
          </Button>
        )}
        <Button asChild variant="outline" className="gap-1.5 rounded-full">
          <Link to="/">
            <Home className="h-4 w-4" />
            الرئيسية
          </Link>
        </Button>
      </div>
    </div>
  );

  if (inline) return card;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <TopNav />
      <main className="container flex-1 py-12">{card}</main>
      <SiteFooter />
    </div>
  );
}