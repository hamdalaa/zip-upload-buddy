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
      <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 border-0 bg-black/95 p-0 shadow-none [&>button]:hidden sm:rounded-none">
        <DialogTitle className="sr-only">معرض صور {title}</DialogTitle>
        {current && index !== null && (
          <div className="relative flex h-full w-full flex-col">
            {/* Top bar */}
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/70 to-transparent px-4 py-3">
              <div className="flex items-center gap-2.5 text-white">
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-md">
                  <Camera className="h-4 w-4" />
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="max-w-[60vw] truncate text-sm font-semibold">{title}</span>
                  <span className="font-numeric text-[11px] tabular-nums text-white/70">
                    {index + 1} / {total}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={zoomOut}
                  disabled={scale <= MIN_SCALE}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  aria-label="تصغير"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="font-numeric min-w-[2.75rem] rounded-full bg-white/10 px-2 py-1 text-center text-[11px] font-semibold tabular-nums text-white backdrop-blur-md">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  type="button"
                  onClick={zoomIn}
                  disabled={scale >= MAX_SCALE}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
                  aria-label="تكبير"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <span className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />
                <button
                  type="button"
                  onClick={handleDownload}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:scale-105 active:scale-95"
                  aria-label="تنزيل"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:scale-105 active:scale-95"
                  aria-label="مشاركة"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <span className="mx-1 hidden h-5 w-px bg-white/20 sm:block" />
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:scale-105 active:scale-95"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Image stage */}
            <div
              className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden bg-black"
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
                  // Only toggle zoom if it wasn't a swipe/pan
                  if (!dragRef.current) toggleZoom();
                  e.stopPropagation();
                }}
                onDragStart={(e) => e.preventDefault()}
                className="max-h-full max-w-full object-contain animate-in fade-in zoom-in-95 duration-300"
                style={{
                  transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                  transition: dragRef.current || pinchBaseRef.current ? "none" : "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                referrerPolicy="no-referrer"
                draggable={false}
              />

              {total > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goPrev}
                    className="absolute right-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:scale-110 active:scale-95"
                    aria-label="السابق"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={goNext}
                    className="absolute left-4 top-1/2 z-10 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur-md transition-all duration-200 hover:bg-white/25 hover:scale-110 active:scale-95"
                    aria-label="التالي"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {total > 1 && (
              <div className="shrink-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-4 pt-3 flex justify-center">
                <div className="flex max-w-full gap-1.5 overflow-x-auto rounded-xl bg-black/60 p-1.5 ring-1 ring-white/10 backdrop-blur-md">
                  {images.map((image, i) => (
                    <button
                      key={`${image}-thumb-${i}`}
                      type="button"
                      onClick={() => onIndexChange(i)}
                      className={cn(
                        "relative h-12 w-16 shrink-0 overflow-hidden rounded-md transition-all duration-200",
                        i === index
                          ? "scale-105 opacity-100 ring-2 ring-primary"
                          : "opacity-50 ring-1 ring-white/15 hover:opacity-90",
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
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
