import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from "react";
import { Camera, ChevronLeft, ChevronRight, Download, Share2, X, ZoomIn, ZoomOut } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { optimizeImageUrl } from "@/lib/imageUrl";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface LightboxViewerProps {
  images: string[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  title: string;
}

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const SWIPE_THRESHOLD = 60;

export function LightboxViewer({ images, index, onClose, onIndexChange, title }: LightboxViewerProps) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number; pointerId: number; isPan: boolean } | null>(null);
  const swipeRef = useRef<{ startX: number; startY: number; pointerId: number } | null>(null);
  const pinchRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchBaseRef = useRef<{ distance: number; scale: number } | null>(null);

  const total = images.length;
  const isOpen = index !== null;
  const current = index !== null ? images[index] : null;

  const resetTransform = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  // Reset on image change / open
  useEffect(() => {
    resetTransform();
  }, [index, resetTransform]);

  const goNext = useCallback(() => {
    if (total < 2 || index === null) return;
    onIndexChange((index + 1) % total);
  }, [index, onIndexChange, total]);

  const goPrev = useCallback(() => {
    if (total < 2 || index === null) return;
    onIndexChange((index - 1 + total) % total);
  }, [index, onIndexChange, total]);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      // RTL: ArrowLeft = next, ArrowRight = prev
      if (e.key === "ArrowLeft") goNext();
      if (e.key === "ArrowRight") goPrev();
      if (e.key === "+" || e.key === "=") setScale((s) => Math.min(MAX_SCALE, s + 0.5));
      if (e.key === "-") setScale((s) => Math.max(MIN_SCALE, s - 0.5));
      if (e.key === "0") resetTransform();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, goNext, goPrev, onClose, resetTransform]);

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s + 0.5));
  const zoomOut = () =>
    setScale((s) => {
      const next = Math.max(MIN_SCALE, s - 0.5);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });

  const toggleZoom = () => {
    if (scale > 1) {
      resetTransform();
    } else {
      setScale(2);
    }
  };

  const handleWheel = (e: ReactWheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey && Math.abs(e.deltaY) < 30) return;
    e.preventDefault();
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale((s) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + direction * 0.25));
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return next;
    });
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pinchRef.current.size === 2) {
      const points = Array.from(pinchRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      pinchBaseRef.current = { distance: Math.hypot(dx, dy), scale };
      dragRef.current = null;
      swipeRef.current = null;
      return;
    }

    if (scale > 1) {
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        baseX: translate.x,
        baseY: translate.y,
        pointerId: e.pointerId,
        isPan: true,
      };
      swipeRef.current = null;
    } else {
      swipeRef.current = { startX: e.clientX, startY: e.clientY, pointerId: e.pointerId };
      dragRef.current = null;
    }
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (pinchRef.current.has(e.pointerId)) {
      pinchRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom
    if (pinchRef.current.size === 2 && pinchBaseRef.current) {
      const points = Array.from(pinchRef.current.values());
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.hypot(dx, dy);
      const ratio = distance / pinchBaseRef.current.distance;
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, pinchBaseRef.current.scale * ratio));
      setScale(next);
      if (next === 1) setTranslate({ x: 0, y: 0 });
      return;
    }

    // Pan when zoomed
    if (dragRef.current && dragRef.current.pointerId === e.pointerId) {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setTranslate({ x: dragRef.current.baseX + dx, y: dragRef.current.baseY + dy });
    }
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const start = swipeRef.current;
    pinchRef.current.delete(e.pointerId);
    if (pinchRef.current.size < 2) pinchBaseRef.current = null;

    // Swipe (only when not zoomed)
    if (start && start.pointerId === e.pointerId && scale === 1) {
      const dx = e.clientX - start.startX;
      const dy = e.clientY - start.startY;
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        // RTL-aware: swipe left (dx<0) → next, swipe right (dx>0) → prev
        if (dx < 0) goNext();
        else goPrev();
      }
    }

    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    swipeRef.current = null;
  };

  const handleDownload = async () => {
    if (!current) return;
    try {
      const res = await fetch(current, { mode: "cors", referrerPolicy: "no-referrer" });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^\w\u0600-\u06FF]+/g, "-")}-${(index ?? 0) + 1}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in a new tab
      window.open(current, "_blank", "noopener,noreferrer");
    }
  };

  const handleShare = async () => {
    if (!current) return;
    const shareData = { title, text: title, url: current };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        /* user dismissed */
      }
    }
    try {
      await navigator.clipboard.writeText(current);
      toast({ title: "تم نسخ رابط الصورة" });
    } catch {
      toast({ title: "تعذّر نسخ الرابط", variant: "destructive" });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 border-0 bg-background/40 p-0 shadow-none backdrop-blur-2xl [&>button]:hidden sm:rounded-none">
        <DialogTitle className="sr-only">معرض صور {title}</DialogTitle>
        {current && index !== null && (
          <div className="relative flex h-full w-full flex-col text-foreground">
            {/* Image stage — full bleed */}
            <div
              className="absolute inset-0 z-0 flex touch-none select-none items-center justify-center overflow-hidden p-2 sm:p-12"
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ cursor: scale > 1 ? (dragRef.current ? "grabbing" : "grab") : "zoom-in" }}
            >
              <img
                key={index}
                src={optimizeImageUrl(current, { width: 1600, height: 1200 }) ?? current}
                alt={`${title} - صورة ${index + 1}`}
                onClick={(e) => {
                  if (!dragRef.current) toggleZoom();
                  e.stopPropagation();
                }}
                onDragStart={(e) => e.preventDefault()}
                className="max-h-full max-w-full object-contain shadow-2xl animate-in fade-in duration-300"
                style={{
                  transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                  transition: dragRef.current || pinchBaseRef.current ? "none" : "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                referrerPolicy="no-referrer"
                draggable={false}
              />
            </div>

            {/* Top: counter + close — floating pills */}
            <header className="pointer-events-none relative z-20 flex items-start justify-between px-4 py-5 sm:px-6 sm:py-6">
              <div className="pointer-events-auto inline-flex items-center gap-3 rounded-full border border-border/40 bg-background/60 px-4 py-2 backdrop-blur-md">
                <span className="font-numeric text-xs font-semibold tabular-nums">{index + 1}</span>
                <span className="h-px w-3 bg-muted-foreground/40" />
                <span className="font-numeric text-xs tabular-nums text-muted-foreground">{total}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="pointer-events-auto group inline-flex items-center gap-2.5 rounded-full border border-border/40 bg-background/60 py-1.5 pe-4 ps-1.5 backdrop-blur-md transition-colors hover:bg-background/80"
                aria-label="إغلاق"
              >
                <span className="flex size-7 items-center justify-center rounded-full bg-muted/50 transition-transform duration-300 group-hover:rotate-90">
                  <X className="h-3.5 w-3.5" />
                </span>
                <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">إغلاق</span>
              </button>
            </header>

            {/* Side nav */}
            {total > 1 && (
              <div className="pointer-events-none absolute inset-y-0 inset-x-0 z-10 flex items-center justify-between px-3 sm:px-6">
                <button
                  type="button"
                  onClick={goPrev}
                  className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border/40 bg-background/60 text-muted-foreground backdrop-blur-md transition-all hover:bg-background/80 hover:text-foreground hover:scale-105"
                  aria-label="السابق"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-border/40 bg-background/60 text-muted-foreground backdrop-blur-md transition-all hover:bg-background/80 hover:text-foreground hover:scale-105"
                  aria-label="التالي"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Bottom: thumbnails + tools */}
            <footer className="pointer-events-none relative z-20 mt-auto flex flex-col gap-4 px-3 pb-5 pt-20 sm:px-6 sm:pb-6">
              {total > 1 && (
                <div className="pointer-events-auto flex items-center justify-center gap-1.5 overflow-x-auto">
                  {images.map((image, i) => (
                    <button
                      key={`${image}-thumb-${i}`}
                      type="button"
                      onClick={() => onIndexChange(i)}
                      className={cn(
                        "relative size-10 shrink-0 overflow-hidden rounded-md transition-all duration-300 sm:size-12",
                        i === index
                          ? "opacity-100 ring-1 ring-foreground/40 ring-offset-4 ring-offset-background/60"
                          : "opacity-30 hover:opacity-90",
                      )}
                      aria-label={`الصورة ${i + 1}`}
                    >
                      <img
                        src={optimizeImageUrl(image, { width: 160, height: 120 }) ?? image}
                        alt=""
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div className="pointer-events-auto flex flex-row items-center justify-between gap-3">
                {/* Zoom */}
                <div className="inline-flex items-center gap-3 rounded-full border border-border/40 bg-background/60 px-3 py-1.5 backdrop-blur-md">
                  <button
                    type="button"
                    onClick={zoomOut}
                    disabled={scale <= MIN_SCALE}
                    aria-label="تصغير"
                    className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <span className="font-numeric w-10 text-center text-xs tabular-nums">{Math.round(scale * 100)}%</span>
                  <button
                    type="button"
                    onClick={zoomIn}
                    disabled={scale >= MAX_SCALE}
                    aria-label="تكبير"
                    className="text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-background/60 px-3.5 py-2 text-xs font-medium text-foreground backdrop-blur-md transition-colors hover:bg-background/80"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">مشاركة</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-colors hover:bg-foreground/90"
                  >
                    <Download className="h-3.5 w-3.5" />
                    تحميل
                  </button>
                </div>
              </div>
            </footer>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}