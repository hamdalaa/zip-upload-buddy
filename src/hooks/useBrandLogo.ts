import { useEffect, useState } from "react";
import {
  getBrandLogo,
  getTheSvgUrl,
  resolveTheSvgLogoUrl,
  type TheSvgVariant,
} from "@/lib/brandLogos";

export function useBrandLogo(slug?: string, brandName?: string, variant: TheSvgVariant = "default") {
  const [logoSrc, setLogoSrc] = useState<string | undefined>(() => {
    if (!slug) return undefined;
    return getTheSvgUrl(slug, variant) ?? getBrandLogo(slug);
  });

  useEffect(() => {
    if (!slug && !brandName) {
      setLogoSrc(undefined);
      return;
    }

    const fallback = slug ? getBrandLogo(slug) : undefined;
    const warmStart = slug ? getTheSvgUrl(slug, variant) ?? fallback : fallback;
    setLogoSrc(warmStart);

    let active = true;
    resolveTheSvgLogoUrl({ slug: slug ?? "", brandName, variant })
      .then((resolved) => {
        if (!active) return;
        setLogoSrc(resolved ?? fallback);
      })
      .catch(() => {
        if (!active) return;
        setLogoSrc(fallback);
      });

    return () => {
      active = false;
    };
  }, [brandName, slug, variant]);

  return logoSrc;
}
