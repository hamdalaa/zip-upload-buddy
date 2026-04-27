import { CATEGORY_REAL_IMAGES } from "./categoryImages";
import type { ProductIndex } from "./types";
import type { UnifiedProduct } from "./unifiedSearch";
import productImageNotFound from "@/assets/products/product-image-not-found.svg";

function normalizeCategoryKey(category?: string): keyof typeof CATEGORY_REAL_IMAGES {
  const normalized = (category ?? "").toLowerCase();

  if (/(phone|iphone|smartphone|mobile)/i.test(normalized)) return "Phones";
  if (/(ipad|tablet)/i.test(normalized)) return "Tablets";
  if (/(charger|charge|adapter|power|magsafe|cable|usb)/i.test(normalized)) return "Chargers";
  if (/(watch|airpods|accessor|case|cover|strap|wallet|band|keyboard|mouse)/i.test(normalized)) return "Accessories";
  if (/(laptop|macbook|desktop|computer|office laptop|mac)/i.test(normalized)) return "Computing";
  if (/(gpu|pc parts|motherboard|processor|ram|ssd|cooler)/i.test(normalized)) return "PC Parts";
  if (/(router|network|switch|wifi)/i.test(normalized)) return "Networking";
  if (/(camera)/i.test(normalized)) return "Cameras";
  if (/(printer)/i.test(normalized)) return "Printers";
  if (/(smart|wearable)/i.test(normalized)) return "Smart Devices";
  if (/(gaming|game)/i.test(normalized)) return "Gaming";

  return "Accessories";
}

export function getFallbackProductImage(category?: string): string {
  return CATEGORY_REAL_IMAGES[normalizeCategoryKey(category)];
}

export function getProductImageNotFound(): string {
  return productImageNotFound;
}

export function isRenderableProductImage(src?: string | null): boolean {
  if (!src) return false;
  const value = src.trim();
  if (!value) return false;
  if (value === "Not found") return false;
  if (value === "Image not found") return false;
  if (value.startsWith("data:image/svg+xml")) return false;
  try {
    const parsed = new URL(value, "https://h-db.site");
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "s3.elryan.com") return false;
    if (host === "elryan.com" && !parsed.pathname.startsWith("/img/")) return false;
  } catch {
    return false;
  }
  return true;
}

type ProductImageLike = Pick<ProductIndex, "category" | "imageUrl"> & {
  images?: Array<string | undefined | null>;
};

export function getRenderableProductImageCandidates(product: ProductImageLike | UnifiedProduct): string[] {
  const images = "images" in product && Array.isArray(product.images) ? product.images : [];

  return [...new Set(
    [...images, product.imageUrl]
      .filter((src): src is string => isRenderableProductImage(src))
      .map((src) => src.trim()),
  )];
}
