import type { SiteSettingsPayload } from "./catalog/types.js";

export const DEFAULT_SITE_SETTINGS: SiteSettingsPayload = {
  hero: {
    badgeText: "دليل عراقي مباشر للمتاجر والإلكترونيات",
    title: "تلقى المحل المناسب قبل ما تلف السوق.",
    subtitle: "ابحث عن المنتج، اختَر المنطقة أو الفئة، وافتح المحل مع السعر والتقييم والعنوان من نفس المكان.",
    storeMetricLabel: "محل ومتجر مفهرس",
    productMetricLabel: "منتج قابل للبحث",
    coverageMetricValue: "Iraq",
    coverageMetricLabel: "محافظات وشوارع تقنية",
  },
  seo: {
    title: "حاير | دليل المتاجر والإلكترونيات في العراق",
    description: "ابحث عن المتاجر والمنتجات والأسعار والعناوين في سوق الإلكترونيات العراقي من مكان واحد.",
  },
  featured: {
    storeIds: [],
    brandSlugs: [],
    categoryKeys: [],
  },
  theme: {
    primaryHue: 171,
    accentHue: 39,
    surfaceTone: "cool",
  },
};

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function asStringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => String(entry).trim()).filter(Boolean).slice(0, 24)
    : [];
}

function asHue(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(360, Math.round(parsed)));
}

export function normalizeSiteSettingsPayload(input: unknown): SiteSettingsPayload {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const hero = source.hero && typeof source.hero === "object" ? source.hero as Record<string, unknown> : {};
  const seo = source.seo && typeof source.seo === "object" ? source.seo as Record<string, unknown> : {};
  const featured = source.featured && typeof source.featured === "object" ? source.featured as Record<string, unknown> : {};
  const theme = source.theme && typeof source.theme === "object" ? source.theme as Record<string, unknown> : {};
  const surfaceTone = theme.surfaceTone === "light" || theme.surfaceTone === "warm" || theme.surfaceTone === "cool"
    ? theme.surfaceTone
    : DEFAULT_SITE_SETTINGS.theme.surfaceTone;

  return {
    hero: {
      badgeText: asString(hero.badgeText, DEFAULT_SITE_SETTINGS.hero.badgeText),
      title: asString(hero.title, DEFAULT_SITE_SETTINGS.hero.title),
      subtitle: asString(hero.subtitle, DEFAULT_SITE_SETTINGS.hero.subtitle),
      storeMetricLabel: asString(hero.storeMetricLabel, DEFAULT_SITE_SETTINGS.hero.storeMetricLabel),
      productMetricLabel: asString(hero.productMetricLabel, DEFAULT_SITE_SETTINGS.hero.productMetricLabel),
      coverageMetricValue: asString(hero.coverageMetricValue, DEFAULT_SITE_SETTINGS.hero.coverageMetricValue),
      coverageMetricLabel: asString(hero.coverageMetricLabel, DEFAULT_SITE_SETTINGS.hero.coverageMetricLabel),
    },
    seo: {
      title: asString(seo.title, DEFAULT_SITE_SETTINGS.seo.title),
      description: asString(seo.description, DEFAULT_SITE_SETTINGS.seo.description),
    },
    featured: {
      storeIds: asStringList(featured.storeIds),
      brandSlugs: asStringList(featured.brandSlugs),
      categoryKeys: asStringList(featured.categoryKeys),
    },
    theme: {
      primaryHue: asHue(theme.primaryHue, DEFAULT_SITE_SETTINGS.theme.primaryHue),
      accentHue: asHue(theme.accentHue, DEFAULT_SITE_SETTINGS.theme.accentHue),
      surfaceTone,
    },
  };
}
