import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const prefetchBrandDetail = vi.fn(() => Promise.resolve());
const prefetchCityDetail = vi.fn(() => Promise.resolve());
const prefetchCityList = vi.fn(() => Promise.resolve());
const prefetchProductFull = vi.fn(() => Promise.resolve());
const prefetchStoreDetail = vi.fn(() => Promise.resolve());

const loadAboutRoute = vi.fn(() => Promise.resolve({}));
const loadBrandRoute = vi.fn(() => Promise.resolve({}));
const loadBrandsRoute = vi.fn(() => Promise.resolve({}));
const loadCityPageRoute = vi.fn(() => Promise.resolve({}));
const loadCityShopViewRoute = vi.fn(() => Promise.resolve({}));
const loadIraqCitiesRoute = vi.fn(() => Promise.resolve({}));
const loadProductDetailRoute = vi.fn(() => Promise.resolve({}));
const loadShopViewRoute = vi.fn(() => Promise.resolve({}));
const loadStreetPageRoute = vi.fn(() => Promise.resolve({}));
const loadUnifiedSearchRoute = vi.fn(() => Promise.resolve({}));

vi.mock("./catalogQueries", () => ({
  prefetchBrandDetail,
  prefetchCityDetail,
  prefetchCityList,
  prefetchProductFull,
  prefetchStoreDetail,
}));

vi.mock("./performance", () => ({
  canRunSpeculativeWork: () => true,
}));

vi.mock("./routeLoaders", () => ({
  loadAboutRoute,
  loadBrandRoute,
  loadBrandsRoute,
  loadCityPageRoute,
  loadCityShopViewRoute,
  loadIraqCitiesRoute,
  loadProductDetailRoute,
  loadShopViewRoute,
  loadStreetPageRoute,
  loadUnifiedSearchRoute,
}));

describe("prefetchRouteForPath", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches both route code and data for product pages", async () => {
    const { prefetchRouteForPath } = await import("./routePrefetch");

    await prefetchRouteForPath("/product/unified_123");

    expect(loadProductDetailRoute).toHaveBeenCalledTimes(1);
    expect(prefetchProductFull).toHaveBeenCalledWith("unified_123");
  });

  it("prefetches brand and city targets with the correct route loaders", async () => {
    const { prefetchRouteForPath } = await import("./routePrefetch");

    await prefetchRouteForPath("/brand/asus");
    await prefetchRouteForPath("/city/baghdad");

    expect(loadBrandRoute).toHaveBeenCalledTimes(1);
    expect(prefetchBrandDetail).toHaveBeenCalledWith("asus");
    expect(loadCityPageRoute).toHaveBeenCalledTimes(1);
    expect(prefetchCityDetail).toHaveBeenCalledWith("baghdad");
  });
});
