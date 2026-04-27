import { useCallback, useEffect, useState } from "react";

const KEY = "teh:recently-viewed";
const MAX = 8;

function load(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function save(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
    window.dispatchEvent(new CustomEvent("teh:recently-viewed-changed"));
  } catch {
    /* ignore */
  }
}

export function trackRecentlyViewed(id: string) {
  if (!id || typeof window === "undefined") return;
  const cur = load().filter((x) => x !== id);
  cur.unshift(id);
  save(cur.slice(0, MAX));
}

export function useRecentlyViewed() {
  const [ids, setIds] = useState<string[]>(() => load());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onChange = () => setIds(load());
    window.addEventListener("teh:recently-viewed-changed", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("teh:recently-viewed-changed", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const clear = useCallback(() => {
    save([]);
  }, []);

  return { ids, clear };
}