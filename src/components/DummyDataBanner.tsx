/**
 * DummyDataBanner — TEMPORARY
 * ----------------------------
 * هذا البانر يوضّح إن البيانات المعروضة بـ /search و /product/:id هي بيانات
 * تجريبية (Dummy) تُغذّى من `src/lib/unifiedSearch.ts` (DUMMY_DATA block).
 *
 * 🗑️ للحذف لاحقاً (3 خطوات):
 *   1. احذف هذا الملف بالكامل: src/components/DummyDataBanner.tsx
 *   2. احذف الاستدعاءات منه في:
 *        - src/pages/UnifiedSearch.tsx
 *        - src/pages/ProductDetail.tsx
 *   3. بدّل DUMMY_DATA block داخل src/lib/unifiedSearch.ts
 *      بالنداءات الحقيقية للـ backend.
 */
import { Sparkles, X } from "lucide-react";
import { useState } from "react";

export function DummyDataBanner() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <div className="border-b border-warning/30 bg-warning/10">
      <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <Sparkles className="h-4 w-4 shrink-0 text-warning" />
          <span className="font-medium">
            بيانات تجريبية (Dummy) — للعرض فقط، تُستبدل بنتائج الـ backend الحقيقي قريباً.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="إغلاق"
          className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-warning/20 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
