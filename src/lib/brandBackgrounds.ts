// Brand background registry — premium showroom imagery per brand.
// Used as priority background on /brands and /brand/:slug.
import apple from "@/assets/brands/bg-apple.webp";
import samsung from "@/assets/brands/bg-samsung.webp";
import asus from "@/assets/brands/bg-asus.webp";
import honor from "@/assets/brands/bg-honor.webp";
import anker from "@/assets/brands/bg-anker.webp";

export const BRAND_BACKGROUNDS: Record<string, string> = {
  apple,
  samsung,
  asus,
  honor,
  anker,
};

export function getBrandBackground(slug: string): string | undefined {
  return BRAND_BACKGROUNDS[slug.toLowerCase()];
}
