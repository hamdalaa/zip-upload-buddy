// Brand logo registry — maps brand slug to imported logo asset.
// Used in /brand/:slug, /brands index, and BrandCard components.
import apple from "@/assets/brands/apple.png";
import samsung from "@/assets/brands/samsung.png";
import asus from "@/assets/brands/asus.png";
import honor from "@/assets/brands/honor.png";
import anker from "@/assets/brands/anker.svg";

export const BRAND_LOGOS: Record<string, string> = {
  apple,
  samsung,
  asus,
  honor,
  anker,
};

export function getBrandLogo(slug: string): string | undefined {
  return BRAND_LOGOS[slug.toLowerCase()];
}

// theSVG CDN — high quality, official brand icons.
// Docs: https://github.com/GLINCKER/thesvg
// URL pattern: https://thesvg.org/icons/{slug}/{variant}.svg
// Variants: default | mono | light | dark | wordmark | wordmarkLight | wordmarkDark
export type TheSvgVariant =
  | "default"
  | "mono"
  | "light"
  | "dark"
  | "wordmark"
  | "wordmarkLight"
  | "wordmarkDark";

// Map our internal slugs → theSVG slugs (most are identical).
// Brands omitted here will fall back to the local logo.
const THESVG_SLUG_MAP: Record<string, string> = {
  apple: "apple",
  samsung: "samsung",
  asus: "asus",
  honor: "honor",
  // anker: intentionally omitted — using local SVG (official brand-blue wordmark)
};

export function getTheSvgUrl(slug: string, variant: TheSvgVariant = "default"): string | undefined {
  const mapped = THESVG_SLUG_MAP[slug.toLowerCase()];
  if (!mapped) return undefined;
  return `https://thesvg.org/icons/${mapped}/${variant}.svg`;
}
