// Brand logo registry — maps brand slug to imported logo asset.
// Used in /brand/:slug, /brands index, and BrandCard components.
import apple from "@/assets/brands/apple.png";
import samsung from "@/assets/brands/samsung.png";
import asus from "@/assets/brands/asus.png";
import honor from "@/assets/brands/honor.png";
import anker from "@/assets/brands/anker.png";

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
