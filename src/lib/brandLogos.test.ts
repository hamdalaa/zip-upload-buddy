import {
  buildTheSvgRegistryIndex,
  findTheSvgIcon,
  getTheSvgIconUrl,
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
});
