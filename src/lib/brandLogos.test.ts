import {
  buildTheSvgRegistryIndex,
  findTheSvgIcon,
  getBrandLogo,
  getTheSvgIconUrl,
  getTheSvgUrl,
  pickTheSvgVariant,
  type TheSvgRegistryIcon,
} from "./brandLogos";

const REGISTRY_FIXTURE: TheSvgRegistryIcon[] = [
  {
    slug: "msi",
    title: "MSI",
    aliases: ["Micro-Star International"],
    variants: ["default", "mono"],
  },
  {
    slug: "tp-link",
    title: "TP-Link",
    aliases: [],
    variants: ["default", "mono"],
  },
  {
    slug: "honor",
    title: "Honor",
    aliases: [],
    variants: ["default"],
  },
];

describe("brandLogos", () => {
  it("matches by slug", () => {
    const index = buildTheSvgRegistryIndex(REGISTRY_FIXTURE);
    expect(findTheSvgIcon(index, "msi")?.slug).toBe("msi");
  });

  it("matches by title normalization", () => {
    const index = buildTheSvgRegistryIndex(REGISTRY_FIXTURE);
    expect(findTheSvgIcon(index, "honor", "HONOR")?.slug).toBe("honor");
    expect(findTheSvgIcon(index, "tp link", "TP Link")?.slug).toBe("tp-link");
  });

  it("matches by alias", () => {
    const index = buildTheSvgRegistryIndex(REGISTRY_FIXTURE);
    expect(findTheSvgIcon(index, "micro-star-international", "Micro-Star International")?.slug).toBe("msi");
  });

  it("falls back to default when the preferred variant is unavailable", () => {
    expect(pickTheSvgVariant(REGISTRY_FIXTURE[2], "light")).toBe("default");
  });

  it("builds icon URLs", () => {
    expect(getTheSvgIconUrl("msi", "mono")).toBe("https://thesvg.org/icons/msi/mono.svg");
  });

  it("uses local fallback logos for brands missing a remote logo", () => {
    expect(getBrandLogo("realme")).toContain("realme");
    expect(getBrandLogo("gigabyte")).toContain("gigabyte");
    expect(getBrandLogo("sandisk")).toContain("sandisk");
  });

  it("applies preferred theSVG variants for low-contrast brands", () => {
    expect(getTheSvgUrl("apple")).toBe("https://thesvg.org/icons/apple/dark.svg");
    expect(getTheSvgUrl("sony")).toBe("https://thesvg.org/icons/sony/mono.svg");
    expect(getTheSvgUrl("nvidia")).toBe("https://thesvg.org/icons/nvidia/wordmark.svg");
  });
});
