import { describe, expect, it } from "vitest";
import {
  assertSafeOutboundTarget,
  normalizeAndValidateUrl,
} from "../shared/security/outboundRequestGuard.js";

describe("outbound request guard", () => {
  it("blocks unsupported outbound protocols", () => {
    expect(() => normalizeAndValidateUrl("file:///etc/passwd")).toThrow(/unsupported protocol/i);
  });

  it("blocks localhost SSRF targets", async () => {
    await expect(assertSafeOutboundTarget(new URL("http://127.0.0.1/internal"))).rejects.toThrow(/blocked outbound/i);
    await expect(assertSafeOutboundTarget(new URL("http://localhost/internal"))).rejects.toThrow(/blocked outbound/i);
  });

  it("allows reserved test hostnames under test runtime", async () => {
    await expect(assertSafeOutboundTarget(new URL("https://partner-feed.test/feed.json"))).resolves.toBeUndefined();
  });
});
