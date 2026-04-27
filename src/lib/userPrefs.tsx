import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

const FAV_KEY = "teh:favorites";
const COMPARE_KEY = "teh:compare";
/** Persistent: the welcome tour shows once per major onboarding version. */
const ONBOARD_STORAGE_KEY = "teh:onboarded:beta-v2";

type Ctx = {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;

  compare: string[]; // ordered list of product ids (max 4)
  toggleCompare: (id: string) => void;
  isInCompare: (id: string) => boolean;
  clearCompare: () => void;

  /** True once the user has dismissed/completed the welcome tour in this session. */
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  /** Force-open the welcome tour (used by the "?" button in the navbar). */
  tourTrigger: number;
  openTour: () => void;
};

const UserPrefsCtx = createContext<Ctx | null>(null);

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}
function loadArr(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function UserPrefsProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet(FAV_KEY));
  const [compare, setCompare] = useState<string[]>(() => loadArr(COMPARE_KEY));
  const [onboarded, setOnboardedState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(ONBOARD_STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [tourTrigger, setTourTrigger] = useState(0);

  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify(Array.from(favorites)));
    } catch {/* ignore */}
  }, [favorites]);

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_KEY, JSON.stringify(compare));
    } catch {/* ignore */}
  }, [compare]);

  function toggleFavorite(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCompare(id: string) {
    setCompare((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev; // cap at 4
      return [...prev, id];
    });
  }

  function setOnboarded(v: boolean) {
    setOnboardedState(v);
    try {
      if (v) localStorage.setItem(ONBOARD_STORAGE_KEY, "1");
      else localStorage.removeItem(ONBOARD_STORAGE_KEY);
    } catch {/* ignore */}
  }

  /** Trigger the welcome tour to open even if already onboarded this session. */
  function openTour() {
    setOnboardedState(false);
    try {
      localStorage.removeItem(ONBOARD_STORAGE_KEY);
    } catch {/* ignore */}
    setTourTrigger((n) => n + 1);
  }

  const value = useMemo<Ctx>(
    () => ({
      favorites,
      toggleFavorite,
      isFavorite: (id) => favorites.has(id),
      compare,
      toggleCompare,
      isInCompare: (id) => compare.includes(id),
      clearCompare: () => setCompare([]),
      onboarded,
      setOnboarded,
      tourTrigger,
      openTour,
    }),
    [favorites, compare, onboarded, tourTrigger],
  );

  return <UserPrefsCtx.Provider value={value}>{children}</UserPrefsCtx.Provider>;
}

export function useUserPrefs() {
  const ctx = useContext(UserPrefsCtx);
  if (!ctx) throw new Error("useUserPrefs must be used within UserPrefsProvider");
  return ctx;
}
