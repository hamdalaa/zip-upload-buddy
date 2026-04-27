import { describe, expect, it } from "vitest";
import { parseNumberish } from "../shared/catalog/normalization.js";
import { normalizeCatalogPrice, resolveSaleFlags } from "../shared/catalog/pricing.js";

describe("catalog pricing", () => {
  it("normalizes zero and negative catalog prices as missing", () => {
    expect(normalizeCatalogPrice(0)).toBeUndefined();
    expect(normalizeCatalogPrice(-25)).toBeUndefined();
    expect(normalizeCatalogPrice(25000)).toBe(25000);
  });

  it("does not mark zero-price products as sale offers", () => {
    expect(resolveSaleFlags(0, 1000)).toEqual({ originalPrice: 1000, onSale: false });
    expect(resolveSaleFlags(900, 1000)).toMatchObject({
      livePrice: 900,
      originalPrice: 1000,
      onSale: true,
      discountAmount: 100,
    });
  });

  it("parses dotted thousands prices as whole IQD values", () => {
    expect(parseNumberish("18.013 IQD")).toBe(18013);
    expect(parseNumberish("25.005 د.ع")).toBe(25005);
    expect(parseNumberish("1,250.50")).toBe(1250.5);
  });
});
