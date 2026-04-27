import { useEffect, useMemo, useState } from "react";
import { optimizeImageUrl } from "@/lib/imageUrl";

interface SequentialImageOptions {
  fallbackSrc?: string;
  optimize?: { width?: number; height?: number };
  resetKey?: string | number;
}

const failedImageSources = new Set<string>();

function uniqueCandidates(values: Array<string | undefined | null>) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    if (failedImageSources.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }

  return out;
}

export function useSequentialImage(
  candidates: Array<string | undefined | null>,
  { fallbackSrc, optimize, resetKey }: SequentialImageOptions = {},
) {
  const candidateKey = useMemo(
    () => uniqueCandidates([...candidates, fallbackSrc]).join("\n"),
    [candidates, fallbackSrc],
  );
  const resolvedCandidates = useMemo(() => {
    return candidateKey ? candidateKey.split("\n") : [];
  }, [candidateKey]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [resetKey, candidateKey]);

  const rawSrc = resolvedCandidates[activeIndex] ?? fallbackSrc;
  const src = rawSrc ? optimizeImageUrl(rawSrc, optimize) ?? rawSrc : undefined;

  return {
    src,
    rawSrc,
    onError: () => {
      if (rawSrc) failedImageSources.add(rawSrc);
      setActiveIndex((current) => {
        if (current >= resolvedCandidates.length - 1) return current;
        return current + 1;
      });
    },
  };
}
