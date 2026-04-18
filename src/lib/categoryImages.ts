import type { Category } from "./types";

/**
 * Real product photography for category circles, sourced from Unsplash
 * (free for commercial use). Square crops via the Unsplash image API params.
 * These replace the previous AI-generated category illustrations.
 */
const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=400&h=400&q=80`;

export const CATEGORY_REAL_IMAGES: Record<Category, string> = {
  // Laptops / desktops
  Computing: u("photo-1517336714731-489689fd1ca8"),
  // Motherboards / GPUs / RAM
  "PC Parts": u("photo-1591488320449-011701bb6704"),
  // Routers / switches
  Networking: u("photo-1606318801954-d46d46d3360a"),
  // Gaming controllers / RGB
  Gaming: u("photo-1542751371-adc38448a05e"),
  // DSLR cameras
  Cameras: u("photo-1502920917128-1aa500764cbd"),
  // Office printer
  Printers: u("photo-1612815154858-60aa4c59eaa6"),
  // Smartphones
  Phones: u("photo-1511707171634-5f897ff02aa9"),
  // Chargers / cables
  Chargers: u("photo-1583863788434-e58a36330cf0"),
  // Tech accessories (mouse, keyboard)
  Accessories: u("photo-1527443224154-c4a3942d3acf"),
  // iPad / tablets
  Tablets: u("photo-1561154464-82e9adf32764"),
  // Smartwatch / smart home
  "Smart Devices": u("photo-1546868871-7041f2a55e12"),
};
