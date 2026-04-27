/**
 * TrustBadges — 4 reassurance pills shown right under the price block on
 * ProductDetail. Static, brand-neutral copy in Arabic that matches Iraq
 * commerce expectations (warranty, country-wide shipping, returns, COD).
 */
import { CreditCard, RefreshCcw, ShieldCheck, Truck } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    label: "ضمان الوكيل",
    sub: "أصلي ومضمون",
  },
  {
    icon: Truck,
    label: "توصيل لكل المحافظات",
    sub: "خلال 1-3 أيام",
  },
  {
    icon: RefreshCcw,
    label: "7 أيام استبدال",
    sub: "حسب سياسة المحل",
  },
  {
    icon: CreditCard,
    label: "دفع عند الاستلام",
    sub: "آمن وموثوق",
  },
] as const;

export function TrustBadges() {
  return (
    <ul
      className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"
      aria-label="شارات الثقة"
    >
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <li
            key={item.label}
            className="offer-surface flex items-center gap-2.5 p-3 transition-[border-color,background-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-primary/25 hover:bg-card/90 hover:-translate-y-0.5"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-black leading-tight text-foreground">
                {item.label}
              </div>
              <div className="truncate text-[10.5px] font-medium text-muted-foreground">
                {item.sub}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
