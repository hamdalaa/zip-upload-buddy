import { NavLink, useLocation } from "react-router-dom";
import { Home, Search, MapPin, Heart, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserPrefs } from "@/lib/userPrefs";

const TABS = [
  { to: "/", label: "الرئيسية", icon: Home, exact: true },
  { to: "/search", label: "البحث", icon: Search },
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
  if (loc.pathname.startsWith("/dashboard") || loc.pathname === "/67") return null;

  return (
    <>
      {/* Spacer so content isn't hidden under the bar */}
      <div aria-hidden className="h-[88px] lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }} />

      <nav
        className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
        aria-label="التنقل السريع"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto max-w-md px-3 pb-2 pt-1">
          <div className="ios-tabbar grid grid-cols-5 items-stretch gap-1 rounded-[2rem] border border-white/70 bg-card/78 px-2 py-1.5 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.38),inset_0_1px_0_rgba(255,255,255,0.88),inset_0_0_0_1px_hsl(var(--border)/0.28)] backdrop-blur-2xl">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  end={tab.exact}
                  className={({ isActive }) =>
                    cn(
                      "ios-tap group relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[1.45rem] px-1 py-1.5 text-[10px] font-semibold transition-[background-color,color,transform,box-shadow]",
                      isActive
                        ? "bg-white/82 text-foreground shadow-[0_12px_30px_-24px_rgba(15,23,42,0.32),inset_0_0_0_1px_hsl(var(--border)/0.32)]"
                        : "text-muted-foreground hover:bg-white/48 hover:text-foreground",
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 ios-spring",
                          isActive
                            ? "scale-105 bg-foreground text-background shadow-[0_10px_24px_-18px_rgba(15,23,42,0.65)]"
                            : "scale-100 bg-transparent",
                        )}
                      >
                        <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.4 : 2} />
                      </span>
                      <span className="leading-none">{tab.label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}

            {/* Favorites — last tab with badge */}
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("open-favorites"));
              }}
              className="ios-tap relative flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[1.45rem] px-1 py-1.5 text-[10px] font-semibold text-muted-foreground transition-[background-color,color,transform] hover:bg-white/48 hover:text-foreground"
              aria-label={`المفضلة (${favCount})`}
            >
              <span className="relative flex h-8 w-8 items-center justify-center rounded-full transition-[transform,border-color,box-shadow,background-color,color,opacity,width,filter] duration-300 ios-spring">
                <Heart className="h-[18px] w-[18px]" strokeWidth={2} />
                {favCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[9px] font-semibold text-background shadow-soft-md">
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
