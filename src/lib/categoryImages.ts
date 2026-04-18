import type { Category } from "./types";

import imgComputing from "@/assets/categories/cat-computing-2026.jpg";
import imgPcParts from "@/assets/categories/cat-pcparts-2026.jpg";
import imgNetworking from "@/assets/categories/cat-networking-2026.jpg";
import imgGaming from "@/assets/categories/cat-gaming-2026.jpg";
import imgCameras from "@/assets/categories/cat-cameras-2026.jpg";
import imgPrinters from "@/assets/categories/cat-printers-2026.jpg";
import imgPhones from "@/assets/categories/cat-phones-2026.jpg";
import imgChargers from "@/assets/categories/cat-chargers-2026.jpg";
import imgAccessories from "@/assets/categories/cat-accessories-2026.jpg";
import imgTablets from "@/assets/categories/cat-tablets-2026.jpg";
import imgSmart from "@/assets/categories/cat-smart-2026.jpg";

/** Latest 2026 device imagery for category circles. */
export const CATEGORY_REAL_IMAGES: Record<Category, string> = {
  Computing: imgComputing,
  "PC Parts": imgPcParts,
  Networking: imgNetworking,
  Gaming: imgGaming,
  Cameras: imgCameras,
  Printers: imgPrinters,
  Phones: imgPhones,
  Chargers: imgChargers,
  Accessories: imgAccessories,
  Tablets: imgTablets,
  "Smart Devices": imgSmart,
};
