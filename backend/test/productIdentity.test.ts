import { describe, expect, it } from "vitest";
import { buildCanonicalProductId } from "../shared/catalog/searchDocuments.js";
import { compactText } from "../shared/catalog/normalization.js";

function identityInput(input: {
  title: string;
  brand?: string;
  model?: string;
  sku?: string;
  categoryPath?: string[] | string;
}) {
  return {
    normalizedTitle: compactText(input.title),
    title: input.title,
    brand: input.brand,
    model: input.model,
    sku: input.sku,
    categoryPath: input.categoryPath,
  };
}

describe("product identity canonical v2", () => {
  it("matches the same ADATA SC735 2TB product across Arabic and English titles", () => {
    const alNabaa = buildCanonicalProductId(identityInput({
      title: "ADATA SC735 Portable External SSD – 2TB, Retractable USB-C, MIL-STD Drop Resistance",
      brand: "ADATA",
      model: "SC735",
      sku: "SC735-2000G-CCBK",
      categoryPath: ["Drives & Storage", "External SSD"],
    }));
    const miswag = buildCanonicalProductId(identityInput({
      title: "ADATA SC735 قرص SSD خارجي محمول - سعة 2 تيرابايت، موصل USB-C منزلق",
      brand: "ADATA",
      model: "SC735",
      sku: "SC735-2TB",
      categoryPath: ["external-hard-drives"],
    }));

    expect(miswag).toBe(alNabaa);
  });

  it("keeps ADATA SC735 1TB and 2TB as different products", () => {
    const oneTb = buildCanonicalProductId(identityInput({
      title: "ADATA SC735 Portable External SSD 1TB USB-C",
      brand: "ADATA",
      model: "SC735",
      categoryPath: ["External SSD"],
    }));
    const twoTb = buildCanonicalProductId(identityInput({
      title: "ADATA SC735 Portable External SSD 2TB USB-C",
      brand: "ADATA",
      model: "SC735",
      categoryPath: ["External SSD"],
    }));

    expect(oneTb).not.toBe(twoTb);
  });

  it("extracts SC735 model before compacted title noise when model is missing", () => {
    const alNabaa = buildCanonicalProductId(identityInput({
      title: "ADATA SC735 Portable External SSD – 2TB, Retractable USB-C, MIL-STD Drop Resistance",
      brand: "ADATA",
      categoryPath: ["Drives & Storage", "External SSD"],
    }));
    const miswag = buildCanonicalProductId(identityInput({
      title: "ADATA SC735 قرص SSD خارجي محمول – سعة 2 تيرابايت، موصل USB-C منزلق، مقاومة للسقوط بمعيار MIL-STD ADATA SC735 Portable External SSD – 2TB, Retractable USB-C, MIL-STD Drop Resistance",
      brand: "ADATA",
      categoryPath: ["external-hard-drives"],
    }));

    expect(miswag).toBe(alNabaa);
  });

  it("does not merge Samsung S24 phones with their cases", () => {
    const phone = buildCanonicalProductId(identityInput({
      title: "Samsung Galaxy S24 Ultra 256GB",
      brand: "Samsung",
      model: "S24 Ultra",
      categoryPath: ["Phones", "Smartphones"],
    }));
    const caseProduct = buildCanonicalProductId(identityInput({
      title: "CASE FOR SAMSUNG S24 ULTRA",
      brand: "Samsung",
      model: "S24 Ultra",
      categoryPath: ["Accessories", "Cases"],
    }));

    expect(caseProduct).not.toBe(phone);
  });

  it("matches Redmi Watch 5 across Xiaomi/Redmi naming and wearable categories", () => {
    const qalaa = buildCanonicalProductId(identityInput({
      title: "Redmi Watch 5",
      brand: "Redmi",
      model: "Watch 5",
      categoryPath: ["Wearables", "Smart Watches"],
    }));
    const jibal = buildCanonicalProductId(identityInput({
      title: "Xiaomi Redmi Watch 5 - 2.07 Inch - Square AMOLED - Battery lasts up to 24 days",
      brand: "Xiaomi",
      categoryPath: ["Smart watches & Wearable Devices", "Smart Watches"],
    }));
    const elryan = buildCanonicalProductId(identityInput({
      title: "ساعة شاومي ريدمي Watch 5 شاشة AMOLED",
      brand: "Xiaomi",
      categoryPath: ["ساعات ذكية"],
    }));

    expect(jibal).toBe(qalaa);
    expect(elryan).toBe(qalaa);
  });

  it("ignores store-internal SKUs when matching Redmi Watch 5 offers", () => {
    const qalaa = buildCanonicalProductId(identityInput({
      title: "Redmi Watch 5",
      sku: "STO-ITEM-2025-04860",
      categoryPath: "Smartwatches",
    }));
    const jibal = buildCanonicalProductId(identityInput({
      title: "Redmi Watch 5",
      sku: "6941812784556",
    }));

    expect(qalaa).toBe(jibal);
  });

  it("keeps Redmi Watch 5 and Redmi Watch 5 Lite as separate products", () => {
    const watch5 = buildCanonicalProductId(identityInput({
      title: "Redmi Watch 5",
      brand: "Redmi",
      categoryPath: ["Wearables", "Smart Watches"],
    }));
    const watch5Lite = buildCanonicalProductId(identityInput({
      title: "Xiaomi Redmi Watch 5 Lite",
      brand: "Xiaomi",
      categoryPath: ["Wearables", "Smart Watches"],
    }));

    expect(watch5Lite).not.toBe(watch5);
  });
});
