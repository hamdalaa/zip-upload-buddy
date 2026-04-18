import { useEffect, useState } from "react";

/**
 * Returns true while a simulated initial load is in progress.
 * Useful to show skeleton loaders the first time a section mounts,
 * giving the UI a smoother perceived load even when data is local.
 */
export function useFakeLoading(durationMs = 600) {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLoading(false), durationMs);
    return () => clearTimeout(t);
  }, [durationMs]);
  return loading;
}
