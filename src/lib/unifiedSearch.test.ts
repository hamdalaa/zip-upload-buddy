import { describe, expect, it } from "vitest";
import { buildAutocomplete, searchShops } from "@/lib/unifiedSearch";
import type { ProductIndex, Shop } from "@/lib/types";

describe("unified search relevance", () => {
  it("ranks direct mac products ahead of loose substring matches in autocomplete", () => {
    const products = [
      {
        id: "macbook",
        canonicalProductId: "canon-macbook",
        shopId: "shop-1",
        shopName: "Apple House",
        area: "شارع الصناعة",
        category: "Computing",
        name: "MacBook Air M3",
        slug: "macbook-air-m3",
        brand: "Apple",
        inStock: true,
        crawledAt: "2026-04-20T10:00:00.000Z",
      },
      {
        id: "machine-mouse",
        canonicalProductId: "canon-machine",
        shopId: "shop-2",
        shopName: "PC Hub",
        area: "شارع الصناعة",
        category: "Accessories",
        name: "Machine Gaming Mouse",
        slug: "machine-gaming-mouse",
        brand: "Generic",
        inStock: true,
        crawledAt: "2026-04-20T10:00:00.000Z",
      },
      {
        id: "watch",
        canonicalProductId: "canon-watch",
        shopId: "shop-3",
        shopName: "Apple Corner",
        area: "شارع الربيعي",
        category: "Smart Devices",
        name: "Apple Watch Series 10",
        slug: "apple-watch-series-10",
        brand: "Apple",
        inStock: true,
        crawledAt: "2026-04-20T10:00:00.000Z",
      },
    ] as ProductIndex[];

    const suggestions = buildAutocomplete("mac", [], products, 3);

    expect(suggestions[0]?.label).toBe("MacBook Air M3");
  });

  it("ranks shops with direct name matches ahead of broader partial matches", () => {
    const shops: Shop[] = [
      {
        id: "shop-1",
        slug: "mac-house",
        seedKey: "mac-house",
        name: "Mac House",
        area: "شارع الصناعة",
        category: "Computing",
        discoverySource: "manual",
        verified: true,
        verificationStatus: "verified",
        createdAt: "2026-04-20T10:00:00.000Z",
        updatedAt: "2026-04-20T10:00:00.000Z",
      },
      {
        id: "shop-2",
        slug: "machine-center",
        seedKey: "machine-center",
        name: "Machine Center",
        area: "شارع الصناعة",
        category: "Accessories",
        discoverySource: "manual",
        verified: true,
        verificationStatus: "verified",
        createdAt: "2026-04-20T10:00:00.000Z",
        updatedAt: "2026-04-20T10:00:00.000Z",
      },
    ];

    const result = searchShops(shops, { q: "mac", sort: "relevance" });

    expect(result.shops[0]?.name).toBe("Mac House");
  });
});
