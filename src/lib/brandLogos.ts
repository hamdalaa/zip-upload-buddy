// Brand logo registry — maps brand slug to imported logo asset.
// Used in /brand/:slug, /brands index, and BrandCard components.
import apple from "@/assets/brands/apple.png";
import samsung from "@/assets/brands/samsung.png";
import asus from "@/assets/brands/asus.png";
import honor from "@/assets/brands/honor.png";
import anker from "@/assets/brands/anker.svg";
import ugreen from "@/assets/brands/ugreen.svg";

export const BRAND_LOGOS: Record<string, string> = {
  apple,
  samsung,
  asus,
  honor,
  anker,
  ugreen,
};

export function getBrandLogo(slug: string): string | undefined {
  return BRAND_LOGOS[slug.toLowerCase()];
}

// theSVG CDN — official brand icon registry + raw SVG delivery.
// Docs: https://github.com/GLINCKER/thesvg#api
// Registry: https://thesvg.org/api/registry.json
// URL pattern: https://thesvg.org/icons/{slug}/{variant}.svg
export type TheSvgVariant =
  | "default"
  | "color"
  | "mono"
  | "light"
  | "dark"
  | "wordmark"
  | "wordmarkLight"
  | "wordmarkDark";

export interface TheSvgRegistryIcon {
  slug: string;
  title: string;
  aliases: string[];
  variants: TheSvgVariant[];
}

interface TheSvgRegistryResponse {
  total: number;
  icons: TheSvgRegistryIcon[];
}

interface TheSvgRegistryIndex {
  bySlug: Map<string, TheSvgRegistryIcon>;
  byNormalized: Map<string, TheSvgRegistryIcon>;
  byCompact: Map<string, TheSvgRegistryIcon>;
}

interface ResolveBrandIconOptions {
  slug: string;
  brandName?: string;
  variant?: TheSvgVariant;
}

const THESVG_REGISTRY_URL = "https://thesvg.org/api/registry.json";

// Warm-start the most common local brands so they render immediately before
// the registry request finishes.
const THESVG_SLUG_MAP: Record<string, string> = {
  apple: "apple",
  samsung: "samsung",
  asus: "asus",
  honor: "honor",
};

let theSvgRegistryPromise: Promise<TheSvgRegistryIndex> | null = null;

function normalizeLookupValue(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactLookupValue(value: string): string {
  return normalizeLookupValue(value).replace(/\s+/g, "");
}

function addLookupValue(
  map: Map<string, TheSvgRegistryIcon>,
  rawValue: string | undefined,
  icon: TheSvgRegistryIcon,
  transform: (value: string) => string,
) {
  if (!rawValue) return;
  const key = transform(rawValue);
  if (!key || map.has(key)) return;
  map.set(key, icon);
}

export function buildTheSvgRegistryIndex(icons: TheSvgRegistryIcon[]): TheSvgRegistryIndex {
  const bySlug = new Map<string, TheSvgRegistryIcon>();
  const byNormalized = new Map<string, TheSvgRegistryIcon>();
  const byCompact = new Map<string, TheSvgRegistryIcon>();

  for (const icon of icons) {
    addLookupValue(bySlug, icon.slug, icon, (value) => value.toLowerCase());
    addLookupValue(byNormalized, icon.slug, icon, normalizeLookupValue);
    addLookupValue(byCompact, icon.slug, icon, compactLookupValue);
    addLookupValue(byNormalized, icon.title, icon, normalizeLookupValue);
    addLookupValue(byCompact, icon.title, icon, compactLookupValue);

    for (const alias of icon.aliases) {
      addLookupValue(byNormalized, alias, icon, normalizeLookupValue);
      addLookupValue(byCompact, alias, icon, compactLookupValue);
    }
  }

  return { bySlug, byNormalized, byCompact };
}

export function findTheSvgIcon(
  index: TheSvgRegistryIndex,
  slug: string,
  brandName?: string,
): TheSvgRegistryIcon | undefined {
  const candidates = [
    slug,
    brandName,
    slug.replace(/-/g, " "),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    const bySlug = index.bySlug.get(candidate.toLowerCase());
    if (bySlug) return bySlug;

    const byNormalized = index.byNormalized.get(normalizeLookupValue(candidate));
    if (byNormalized) return byNormalized;

    const byCompact = index.byCompact.get(compactLookupValue(candidate));
    if (byCompact) return byCompact;
  }

  return undefined;
}

export function pickTheSvgVariant(
  icon: Pick<TheSvgRegistryIcon, "variants">,
  preferredVariant: TheSvgVariant,
): TheSvgVariant | undefined {
  if (icon.variants.includes(preferredVariant)) return preferredVariant;
  if (icon.variants.includes("default")) return "default";
  return icon.variants[0];
}

export function getTheSvgIconUrl(slug: string, variant: TheSvgVariant = "default"): string {
  return `https://thesvg.org/icons/${slug}/${variant}.svg`;
}

export function getTheSvgUrl(slug: string, variant: TheSvgVariant = "default"): string | undefined {
  const mapped = THESVG_SLUG_MAP[slug.toLowerCase()];
  if (!mapped) return undefined;
  return getTheSvgIconUrl(mapped, variant);
}

export async function getTheSvgRegistry(): Promise<TheSvgRegistryIndex> {
  if (!theSvgRegistryPromise) {
    theSvgRegistryPromise = fetch(THESVG_REGISTRY_URL)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`theSVG registry request failed with ${response.status}`);
        }
        const payload = (await response.json()) as TheSvgRegistryResponse;
        return buildTheSvgRegistryIndex(payload.icons ?? []);
      })
      .catch((error) => {
        theSvgRegistryPromise = null;
        throw error;
      });
  }

  return theSvgRegistryPromise;
}

export async function resolveTheSvgLogoUrl({
  slug,
  brandName,
  variant = "default",
}: ResolveBrandIconOptions): Promise<string | undefined> {
  if (!slug && !brandName) return undefined;

  const registry = await getTheSvgRegistry();
  const icon = findTheSvgIcon(registry, slug, brandName);
  if (!icon) return undefined;

  const resolvedVariant = pickTheSvgVariant(icon, variant);
  if (!resolvedVariant) return undefined;

  return getTheSvgIconUrl(icon.slug, resolvedVariant);
}
