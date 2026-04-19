import { useMemo, useState } from "react";
import { Scale, X, Eye, ExternalLink, MapPin, Trash2, Award } from "lucide-react";
import { useUserPrefs } from "@/lib/userPrefs";
import { useDataStore } from "@/lib/dataStore";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { CATEGORY_IMAGES } from "@/lib/mockData";
import { optimizeImageUrl } from "@/lib/imageUrl";

const fmt = (n?: number) => (typeof n === "number" ? `${n.toLocaleString("en-US")} IQD` : "—");

export function CompareBar() {
  const { compare, toggleCompare, clearCompare } = useUserPrefs();
  const { products, shops } = useDataStore();
  const [open, setOpen] = useState(false);

  const items = useMemo(
    () => compare.map((id) => products.find((p) => p.id === id)).filter(Boolean) as typeof products,
    [compare, products],
  );

  if (items.length === 0) return null;

  const prices = items.map((p) => p.priceValue).filter((v): v is number => typeof v === "number");
  const min = prices.length ? Math.min(...prices) : undefined;

  return (
    <>
      {/* Sticky bottom bar — drawer-slide animation + glass */}
      <div className="drawer-slide fixed inset-x-0 z-40 border-t border-border/80 bg-card/95 backdrop-blur-xl shadow-[0_-12px_40px_-12px_hsl(220_30%_20%/0.18)] bottom-[88px] lg:bottom-0">
        <div className="container flex items-center gap-3 py-2.5">
          <div className="inline-flex items-center gap-2 text-sm font-bold">
            <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-violet text-primary-foreground shadow-soft-md">
              <Scale className="h-4 w-4" />
              {items.length >= 2 && (
                <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-rose ring-2 ring-card animate-pulse" />
              )}
            </span>
            <span className="hidden sm:inline">سلة المقارنة</span>
            <span className="rounded-full bg-gradient-primary px-2 py-0.5 text-[11px] text-primary-foreground shadow-soft">
              {items.length}/4
            </span>
          </div>

          <div className="flex flex-1 items-center gap-2 overflow-x-auto">
            {items.map((p) => {
              const rawImg = p.imageUrl ?? CATEGORY_IMAGES[p.category];
              const img = optimizeImageUrl(rawImg, { width: 96, height: 96 }) ?? rawImg;
              return (
                <div
                  key={p.id}
                  className="relative flex shrink-0 items-center gap-2 rounded-md border border-border bg-background pl-2 pr-1 py-1 transition-all hover:border-primary/40 hover:shadow-soft"
                >
                  <img src={img} alt="" loading="lazy" decoding="async" className="h-9 w-9 rounded object-cover" />
                  <span className="max-w-[120px] truncate text-xs">{p.name}</span>
                  <button
                    onClick={() => toggleCompare(p.id)}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                    aria-label="إزالة"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={clearCompare}
              className="h-8 gap-1 text-xs"
              aria-label="إفراغ السلة"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden md:inline">إفراغ</span>
            </Button>
            <Button
              size="sm"
              onClick={() => setOpen(true)}
              disabled={items.length < 2}
              className={`btn-ripple h-8 gap-1 bg-gradient-primary text-primary-foreground hover:opacity-95 shadow-glow ${items.length >= 2 ? "animate-pulse-glow" : ""}`}
            >
              <Eye className="h-3.5 w-3.5" />
              قارن الآن
            </Button>
          </div>
        </div>
      </div>

      {/* Comparison sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-right">مقارنة المنتجات ({items.length})</SheetTitle>
            <SheetDescription className="text-right">
              قارن بين المنتجات اللي اخترتها — السعر الأرخص مميز بإطار أخضر.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[600px] border-separate border-spacing-x-2">
              <thead>
                <tr>
                  <th className="w-32 text-right text-xs text-muted-foreground"></th>
                  {items.map((p) => (
                    <th key={p.id} className="text-right">
                      <div className="rounded-lg border border-border bg-card p-2">
                        <img
                          src={optimizeImageUrl(p.imageUrl ?? CATEGORY_IMAGES[p.category], { width: 320, height: 240 }) ?? p.imageUrl ?? CATEGORY_IMAGES[p.category]}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="h-24 w-full rounded object-cover"
                        />
                        <div className="mt-2 line-clamp-2 text-xs font-bold">{p.name}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm">
                <Row label="السعر">
                  {items.map((p) => (
                    <td key={p.id} className="py-2">
                      <div
                        className={`rounded-md p-2 text-center font-bold ${
                          p.priceValue !== undefined && p.priceValue === min
                            ? "bg-success/15 text-success border border-success/40"
                            : "bg-muted"
                        }`}
                      >
                        {fmt(p.priceValue)}
                        {p.priceValue !== undefined && p.priceValue === min && (
                          <span className="mt-1 inline-flex items-center gap-1 text-[10px]">
                            <Award className="h-3 w-3" /> الأرخص
                          </span>
                        )}
                      </div>
                    </td>
                  ))}
                </Row>
                <Row label="البراند">
                  {items.map((p) => (
                    <td key={p.id} className="py-2 text-center text-xs">{p.brand ?? "—"}</td>
                  ))}
                </Row>
                <Row label="التقييم">
                  {items.map((p) => (
                    <td key={p.id} className="py-2 text-center text-xs">
                      {p.rating ? `★ ${p.rating} (${p.reviewCount ?? 0})` : "—"}
                    </td>
                  ))}
                </Row>
                <Row label="المحل">
                  {items.map((p) => (
                    <td key={p.id} className="py-2 text-center text-xs">{p.shopName}</td>
                  ))}
                </Row>
                <Row label="المنطقة">
                  {items.map((p) => (
                    <td key={p.id} className="py-2 text-center text-xs">{p.area}</td>
                  ))}
                </Row>
                <Row label="إجراء">
                  {items.map((p) => {
                    const shop = shops.find((s) => s.id === p.shopId);
                    return (
                      <td key={p.id} className="py-2">
                        <div className="flex flex-col gap-1.5">
                          {p.productUrl && (
                            <Button asChild size="sm" className="h-8 gap-1 bg-primary text-primary-foreground">
                              <a href={p.productUrl} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-3 w-3" />
                                المنتج
                              </a>
                            </Button>
                          )}
                          {shop?.googleMapsUrl && (
                            <Button asChild size="sm" variant="outline" className="h-8 gap-1">
                              <a href={shop.googleMapsUrl} target="_blank" rel="noreferrer">
                                <MapPin className="h-3 w-3" />
                                خرائط
                              </a>
                            </Button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </Row>
              </tbody>
            </table>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr>
      <td className="py-2 pr-2 text-xs font-semibold text-muted-foreground">{label}</td>
      {children}
    </tr>
  );
}
