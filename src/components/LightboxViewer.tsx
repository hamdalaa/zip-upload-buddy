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
      <DialogContent className="h-[100dvh] w-screen max-w-none gap-0 border-0 bg-black p-0 shadow-none [&>button]:hidden sm:rounded-none">
        <DialogTitle className="sr-only">معرض صور {title}</DialogTitle>
        {current && index !== null && (
          <div className="relative flex h-full w-full flex-col">
            {/* Top bar — minimal */}
            <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2 text-white/85">
                <span className="font-numeric text-xs tabular-nums text-white/55">
                  {index + 1} / {total}
                </span>
                <span className="hidden h-3 w-px bg-white/15 sm:block" />
                <span className="hidden max-w-[40vw] truncate text-xs font-medium sm:inline">{title}</span>
              </div>

              <div className="flex items-center gap-1">
                <IconButton onClick={zoomOut} disabled={scale <= MIN_SCALE} label="تصغير">
                  <ZoomOut className="h-[15px] w-[15px]" />
                </IconButton>
                <span className="font-numeric min-w-[2.5rem] text-center text-[11px] tabular-nums text-white/60">
                  {Math.round(scale * 100)}%
                </span>
                <IconButton onClick={zoomIn} disabled={scale >= MAX_SCALE} label="تكبير">
                  <ZoomIn className="h-[15px] w-[15px]" />
                </IconButton>
                <span className="mx-1 h-4 w-px bg-white/15" />
                <IconButton onClick={handleDownload} label="تنزيل">
                  <Download className="h-[15px] w-[15px]" />
                </IconButton>
                <IconButton onClick={handleShare} label="مشاركة">
                  <Share2 className="h-[15px] w-[15px]" />
                </IconButton>
                <span className="mx-1 h-4 w-px bg-white/15" />
                <IconButton onClick={onClose} label="إغلاق">
                  <X className="h-4 w-4" />
                </IconButton>
              </div>
            </div>

            {/* Image stage */}
            <div
              className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
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
                className="max-h-full max-w-full object-contain animate-in fade-in duration-200"
                style={{
                  transform: `translate3d(${translate.x}px, ${translate.y}px, 0) scale(${scale})`,
                  transition: dragRef.current || pinchBaseRef.current ? "none" : "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
                }}
                referrerPolicy="no-referrer"
                draggable={false}
              />

              {total > 1 && (
                <>
                  <NavButton side="right" onClick={goPrev} label="السابق">
                    <ChevronRight className="h-5 w-5" />
                  </NavButton>
                  <NavButton side="left" onClick={goNext} label="التالي">
                    <ChevronLeft className="h-5 w-5" />
                  </NavButton>
                </>
              )}
            </div>

            {/* Thumbnail strip — minimal */}
            {total > 1 && (
              <div className="shrink-0 px-3 pb-4 pt-2">
                <div className="mx-auto flex max-w-full justify-center gap-1.5 overflow-x-auto">
                  {images.map((image, i) => (
                    <button
                      key={`${image}-thumb-${i}`}
                      type="button"
                      onClick={() => onIndexChange(i)}
                      className={cn(
                        "relative h-10 w-14 shrink-0 overflow-hidden rounded-md transition-all duration-150",
                        i === index
                          ? "opacity-100 ring-2 ring-white"
                          : "opacity-40 hover:opacity-80",
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

function IconButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/75 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function NavButton({
  children,
  onClick,
  label,
  side,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  side: "left" | "right";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/8 text-white/80 backdrop-blur-sm transition-all duration-150 hover:bg-white/15 hover:text-white",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      {children}
    </button>
  );
}
