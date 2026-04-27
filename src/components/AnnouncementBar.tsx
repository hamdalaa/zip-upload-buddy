import { useEffect, useRef, useState } from "react";
import { X, Truck, ShieldCheck, Store, RefreshCw, Sparkles } from "lucide-react";

const STORAGE_KEY = "atlas-announcement-dismissed-v1";

const messages = [
  { icon: Truck, text: "توصيل سريع لكل المحافظات" },
  { icon: ShieldCheck, text: "ضمان سنة على المنتجات الموثّقة" },
  { icon: Store, text: "أكثر من 1,200 محل ميداني موثوق" },
  { icon: RefreshCw, text: "تحديث يومي للأسعار والمخزون" },
];

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true);
  const [inView, setInView] = useState(true);
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  // Fully stop the marquee animation when the bar scrolls out of view —
  // we toggle a class that sets `animation: none` (not just paused) so
  // the browser stops generating new keyframe ticks entirely. When the
  // bar re-enters the viewport the class is removed and the animation
  // restarts from frame 0 cleanly.
  useEffect(() => {
    const node = barRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { rootMargin: "32px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [dismissed]);

  const handleClose = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
  };

  if (dismissed) return null;

  // Duplicate the list so the marquee loop is seamless
  const loop = [...messages, ...messages];

  return (
    <div
      ref={barRef}
      className="relative z-40 overflow-hidden border-b border-border/50 bg-background/80 text-foreground backdrop-blur-xl"
    >
      {/* Subtle gradient wash for premium feel */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "linear-gradient(90deg, hsl(var(--primary) / 0.06) 0%, hsl(var(--accent-violet) / 0.04) 50%, hsl(var(--accent-cyan) / 0.06) 100%)",
        }}
      />
      <div className="container relative flex items-center gap-3 py-1.5 pe-9">
        <span className="hidden shrink-0 items-center gap-1.5 border-e border-border/60 pe-3 text-[11px] font-semibold sm:inline-flex">
          <Sparkles className="h-3 w-3 text-primary" strokeWidth={2.4} />
          <span className="text-grad-ocean">أتلس</span>
        </span>
        <div className="group/marquee relative flex-1 overflow-hidden">
          <div
            className={`marquee-gpu flex w-max items-center gap-10 ${inView ? "animate-marquee group-hover/marquee:[animation-play-state:paused]" : "marquee-stopped"}`}
            style={inView ? { animationDuration: "60s" } : undefined}
            aria-hidden={!inView}
          >
            {loop.map((m, i) => {
              const Icon = m.icon;
              return (
                <span key={i} className="flex shrink-0 items-center gap-2 text-[11.5px] font-medium text-muted-foreground/90">
                  <Icon className="h-3 w-3 shrink-0 text-primary/70" strokeWidth={2.4} />
                  <span>{m.text}</span>
                  <span aria-hidden className="ms-6 h-1 w-1 rounded-full bg-border/70" />
                </span>
              );
            })}
          </div>
          {/* Edge fades */}
          <div aria-hidden className="pointer-events-none absolute inset-y-0 start-0 w-16 bg-gradient-to-l from-transparent to-background" />
          <div aria-hidden className="pointer-events-none absolute inset-y-0 end-0 w-16 bg-gradient-to-r from-transparent to-background" />
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="إغلاق"
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}