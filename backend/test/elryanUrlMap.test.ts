import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadElryanUrlMap, resetElryanUrlMapCacheForTests, resolveElryanMappedUrl } from "../shared/elryan/urlMap.js";

describe("ElRyan URL map", () => {
  const originalPath = process.env.CATALOG_ELRYAN_URL_MAP_PATH;

  afterEach(() => {
    if (originalPath === undefined) delete process.env.CATALOG_ELRYAN_URL_MAP_PATH;
    else process.env.CATALOG_ELRYAN_URL_MAP_PATH = originalPath;
    resetElryanUrlMapCacheForTests();
  });

  it("maps API url_path and slug keys to full sitemap URLs", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "elryan-url-map-"));
    const file = path.join(dir, "real_product_urls.json");
    fs.writeFileSync(
      file,
      JSON.stringify([
        {
          url: "https://www.elryan.com/ar/electronics/phones/apple-iphone-15-pro.html",
        },
      ]),
    );

    process.env.CATALOG_ELRYAN_URL_MAP_PATH = file;
    resetElryanUrlMapCacheForTests();

    const map = loadElryanUrlMap();
    expect(map?.size).toBeGreaterThan(0);
    expect(resolveElryanMappedUrl(["apple-iphone-15-pro.html"])).toBe(
      "https://www.elryan.com/ar/electronics/phones/apple-iphone-15-pro.html",
    );
    expect(resolveElryanMappedUrl(["electronics/phones/apple-iphone-15-pro.html"])).toBe(
      "https://www.elryan.com/ar/electronics/phones/apple-iphone-15-pro.html",
    );
    expect(resolveElryanMappedUrl(["missing.html"])).toBeUndefined();
  });
});
