export type VisualThemeKey = "home" | "directory" | "brand" | "about" | "admin";

export interface VisualTheme {
  heroClassName: string;
  shellClassName: string;
  panelClassName: string;
  eyebrowClassName: string;
  descriptionClassName: string;
}

export const VISUAL_THEMES: Record<VisualThemeKey, VisualTheme> = {
  home: {
    heroClassName: "page-hero",
    shellClassName: "page-shell",
    panelClassName: "surface-blur rounded-[calc(var(--radius-xl)+0.125rem)]",
    eyebrowClassName: "atlas-kicker",
    descriptionClassName: "max-w-[66ch] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8",
  },
  directory: {
    heroClassName: "page-hero",
    shellClassName: "page-shell",
    panelClassName: "surface-blur rounded-[calc(var(--radius-lg)+0.125rem)]",
    eyebrowClassName: "atlas-kicker",
    descriptionClassName: "max-w-[62ch] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8",
  },
  brand: {
    heroClassName: "page-hero",
    shellClassName: "page-shell",
    panelClassName: "surface-blur rounded-[calc(var(--radius-xl)+0.125rem)]",
    eyebrowClassName: "atlas-kicker",
    descriptionClassName: "max-w-[64ch] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8",
  },
  about: {
    heroClassName: "page-hero",
    shellClassName: "page-shell",
    panelClassName: "surface-blur rounded-[calc(var(--radius-xl)+0.125rem)]",
    eyebrowClassName: "atlas-kicker",
    descriptionClassName: "max-w-[62ch] text-sm leading-7 text-muted-foreground sm:text-base sm:leading-8",
  },
  admin: {
    heroClassName: "page-hero",
    shellClassName: "page-shell",
    panelClassName: "rounded-[calc(var(--radius-lg)+0.125rem)] border border-border/80 bg-card/96 shadow-soft-md",
    eyebrowClassName: "atlas-kicker",
    descriptionClassName: "max-w-[62ch] text-sm leading-7 text-muted-foreground",
  },
};

export function getVisualTheme(themeKey: VisualThemeKey): VisualTheme {
  return VISUAL_THEMES[themeKey];
}
