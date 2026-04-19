import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, MapPin, Heart, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPrefs } from "@/lib/userPrefs";

const TABS = [
  { to: "/", label: "الرئيسية", icon: Home, exact: true },
  { to: "/results", label: "البحث", icon: Search },
  { to: "/iraq", label: "المحافظات", icon: MapPin },
  { to: "/street", label: "الشوارع", icon: Store },
];

/**
 * iOS-style bottom tab bar — visible only on mobile.
 * Uses safe-area inset, frosted glass, and spring active states.
 */
export function BottomTabBar() {
  const loc = useLocation();
  const { favorites } = useUserPrefs();
  const favCount = favorites.size;

  // Hide on dashboard / admin-like routes if any
  if (loc.pathname.startsWith("/dashboard")) return null;

  return (
    <>
      {/* Spacer so content isn't hidden under the bar */}
      <div aria-hidden className="h-[72px] lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        aria-label="التنقل السريع"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto max-w-md px-3 pb-2 pt-1">
          <div className="ios-tabbar grid grid-cols-5 items-stretch gap-1 rounded-3xl border border-border/50 bg-background/80 px-2 py-1.5 shadow-[0_8px_32px_-8px_hsl(var(--foreground)/0.18),0_2px_8px_-2px_hsl(var(--foreground)/0.08)] backdrop-blur-xl">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.exact}
                  className={({ isActive }) =>
                    cn(
                      "ios-tap group relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-300 ios-spring",
                          isActive
                            ? "scale-105 bg-primary-soft text-primary"
                            : "scale-100 bg-transparent",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                      </span>
                      <span className={cn("leading-none", isActive && "font-bold")}>{tab.label}</span>
                      {isActive && (
                        <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-primary" />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Favorites — last tab with badge */}
            <button
              type="button"
              onClick={() => {
                // Trigger the existing favorites sheet via a custom event would be ideal,
                // but for now navigate to results filtered to favorites if not implemented.
                const evt = new CustomEvent("open-favorites");
                window.dispatchEvent(evt);
              }}
              className="ios-tap relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[10px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
              aria-label={`المفضلة (${favCount})`}
            >
              <span className="relative flex h-7 w-7 items-center justify-center rounded-xl transition-all duration-300 ios-spring">
                <Heart className="h-[18px] w-[18px]" strokeWidth={2} />
                {favCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-bold text-accent-foreground shadow-soft-md">
                    {favCount > 9 ? "9+" : favCount}
                  </span>
                )}
              </span>
              <span className="leading-none">المفضلة</span>
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}
