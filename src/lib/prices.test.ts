import { describe, expect, it } from "vitest";
import { formatIQDPrice, getDisplayPriceText, hasComparableDiscount, isValidPrice } from "./prices";

describe("price helpers", () => {
  it("treats zero and negative prices as unavailable", () => {
    expect(isValidPrice(0)).toBe(false);
    expect(isValidPrice(-1)).toBe(false);
    expect(formatIQDPrice(0)).toBe("—");
    expect(getDisplayPriceText("0 IQD", 0)).toBeUndefined();
  });

  it("allows only real positive discounts into deal rails", () => {
    expect(hasComparableDiscount(0, 1000)).toBe(false);
    expect(hasComparableDiscount(1000, 1000)).toBe(false);
    expect(hasComparableDiscount(900, 1000)).toBe(true);
  });
});
