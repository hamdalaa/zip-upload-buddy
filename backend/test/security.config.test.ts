import { describe, expect, it } from "vitest";
import { assertProductionTrustProxy } from "../shared/config.js";

describe("security configuration", () => {
  it("requires trusted proxy support in production", () => {
    expect(() =>
      assertProductionTrustProxy({
        nodeEnv: "production",
        trustProxy: false,
      }),
    ).toThrow(/CATALOG_TRUST_PROXY=true/);

    expect(() =>
      assertProductionTrustProxy({
        nodeEnv: "production",
        trustProxy: true,
      }),
    ).not.toThrow();
  });
});
