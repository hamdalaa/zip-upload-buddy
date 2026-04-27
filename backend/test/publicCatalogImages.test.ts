import { describe, expect, it } from "vitest";
import { sanitizePublicProductImages } from "../api/publicCatalog.js";

describe("public catalog product image sanitization", () => {
  it("drops placeholders, empty values, and blocked ElRyan image URLs", () => {
    const validElryanImage = "https://www.elryan.com/img/500/500/resize/catalog/product/i/p/iphone.jpg";

    expect(
      sanitizePublicProductImages(
        [
          "",
          "Not found",
          "Image not found",
          "data:image/svg+xml,<svg />",
          "https://s3.elryan.com/broken.jpg",
          "https://www.elryan.com/ar/not-an-image",
          validElryanImage,
          "/images/local-product.jpg",
        ],
        "https://store.example/products/item",
      ),
    ).toEqual([validElryanImage, "https://store.example/images/local-product.jpg"]);
  });

  it("returns an empty array when no public image is usable", () => {
    expect(
      sanitizePublicProductImages([
        "",
        "Image not found",
        "https://s3.elryan.com/broken.jpg",
        "https://www.elryan.com/ar/product-page",
      ]),
    ).toEqual([]);
  });
});
