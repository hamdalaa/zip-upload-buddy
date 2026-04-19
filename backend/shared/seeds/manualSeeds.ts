import type { StoreSeed } from "../catalog/types.js";
import { compactText, classifyWebsiteType, normalizeWebsiteUrl, slugify } from "../catalog/normalization.js";

const manualDomains = [
  {
    id: "manual_miswag",
    name: "Miswag",
    city: "Baghdad",
    website: "https://miswag.com/",
    primaryCategory: "Marketplace",
  },
  {
    id: "manual_elryan",
    name: "ElRyan",
    city: "Erbil",
    website: "https://www.elryan.com/",
    primaryCategory: "Marketplace",
  },
  {
    id: "manual_icenter",
    name: "iCenter Iraq",
    city: "Baghdad",
    website: "https://www.icenter-iraq.com/",
    primaryCategory: "Electronics",
  },
  {
    id: "manual_korektel",
    name: "Korek Tel",
    city: "Erbil",
    website: "https://korektel.com/",
    primaryCategory: "Phones",
  },
];

export const manualSeeds: StoreSeed[] = manualDomains.map((seed) => ({
  id: seed.id,
  name: seed.name,
  normalizedName: compactText(seed.name),
  slug: slugify(seed.name),
  city: seed.city,
  website: normalizeWebsiteUrl(seed.website),
  websiteType: classifyWebsiteType(seed.website),
  primaryCategory: seed.primaryCategory,
  discoverySource: "manual_seed",
  highPriority: true,
  metadata: {
    seed: "manual_priority",
  },
}));
