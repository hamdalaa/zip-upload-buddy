import type { Category } from "./types";

import imgNetworking from "@/assets/categories/cat-networking-2026.jpg";
import imgCameras from "@/assets/categories/cat-cameras-2026.jpg";
import showcasePhones from "@/assets/categories/showcase/showcase-phones.webp";
import showcaseComputing from "@/assets/categories/showcase/showcase-computing.webp";
import showcasePcParts from "@/assets/categories/showcase/showcase-pcparts.webp";
import showcaseGaming from "@/assets/categories/showcase/showcase-gaming.webp";
import showcaseAccessories from "@/assets/categories/showcase/showcase-accessories.webp";
import showcaseSmart from "@/assets/categories/showcase/showcase-smart.webp";

/** Latest 2026 device imagery for category circles. */
export const CATEGORY_REAL_IMAGES: Record<Category, string> = {
  Computing: showcaseComputing,
  "PC Parts": showcasePcParts,
  Networking: imgNetworking,
  Gaming: showcaseGaming,
  Cameras: imgCameras,
  Printers: showcaseSmart,
  Phones: showcasePhones,
  Chargers: showcaseAccessories,
  Accessories: showcaseAccessories,
  Tablets: showcasePhones,
  "Smart Devices": showcaseSmart,
};

export const CATEGORY_IMAGES = CATEGORY_REAL_IMAGES;
