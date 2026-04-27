import { describe, expect, it } from "vitest";
import {
  getProductImageNotFound,
  getRenderableProductImageCandidates,
  isRenderableProductImage,
} from "./productVisuals";

describe("productVisuals", () => {
  it("uses a local image-not-found asset for missing product imagery", () => {
    expect(getProductImageNotFound()).toContain("product-image-not-found");
  });

  it("keeps only renderable product image candidates", () => {
    const elryanImage = "https://www.elryan.com/img/500/500/resize/catalog/product/i/p/iphone.jpg";

    expect(isRenderableProductImage("")).toBe(false);
    expect(isRenderableProductImage("Not found")).toBe(false);
    expect(isRenderableProductImage("Image not found")).toBe(false);
    expect(isRenderableProductImage("https://s3.elryan.com/missing.jpg")).toBe(false);
    expect(isRenderableProductImage("https://www.elryan.com/ar/phones/iphone-16.html")).toBe(false);
    expect(isRenderableProductImage(elryanImage)).toBe(true);

    expect(
      getRenderableProductImageCandidates({
        category: "Phones",
        imageUrl: "https://www.elryan.com/ar/not-an-image",
        images: ["Not found", "https://s3.elryan.com/missing.jpg", elryanImage, elryanImage],
      }),
    ).toEqual([elryanImage]);
  });
});
