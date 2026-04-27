import {
  prefetchBrandDetail,
  prefetchCityDetail,
  prefetchCityList,
  prefetchProductFull,
  prefetchStoreDetail,
} from "./catalogQueries";
import {
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
} from "./routeLoaders";
import { canRunSpeculativeWork } from "./performance";

const prefetchedPaths = new Set<string>();
let activePrefetches = 0;
const MAX_ACTIVE_PREFETCHES = 2;

function safeDecode(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export async function prefetchRouteForPath(path: string) {
  if (!path.startsWith("/")) return;
  if (prefetchedPaths.has(path)) return;
  if (!canRunSpeculativeWork()) return;
  if (activePrefetches >= MAX_ACTIVE_PREFETCHES) return;
  prefetchedPaths.add(path);
  activePrefetches += 1;

  try {
    const pathname = path.split("?")[0];
    const productMatch = pathname.match(/^\/product\/([^/]+)$/);
    const brandMatch = pathname.match(/^\/brand\/([^/]+)$/);
    const shopMatch = pathname.match(/^\/shop-view\/([^/]+)$/);
    const cityShopMatch = pathname.match(/^\/city\/([^/]+)\/shop\/([^/]+)$/);
    const cityMatch = pathname.match(/^\/city\/([^/]+)$/);

    const tasks: Array<Promise<unknown>> = [];

    if (pathname === "/search" || pathname === "/results") {
      tasks.push(loadUnifiedSearchRoute());
    } else if (productMatch) {
      const productId = safeDecode(productMatch[1]);
      tasks.push(loadProductDetailRoute(), prefetchProductFull(productId));
    } else if (brandMatch) {
      const slug = safeDecode(brandMatch[1]);
      tasks.push(loadBrandRoute(), prefetchBrandDetail(slug));
    } else if (shopMatch) {
      const shopId = safeDecode(shopMatch[1]);
      tasks.push(loadShopViewRoute(), prefetchStoreDetail(shopId));
    } else if (cityShopMatch) {
      const slug = safeDecode(cityShopMatch[1]);
      tasks.push(loadCityShopViewRoute(), prefetchCityDetail(slug));
    } else if (cityMatch) {
      const slug = safeDecode(cityMatch[1]);
      tasks.push(loadCityPageRoute(), prefetchCityDetail(slug));
    } else if (pathname === "/iraq") {
      tasks.push(loadIraqCitiesRoute(), prefetchCityList());
    } else if (pathname === "/brands") {
      tasks.push(loadBrandsRoute());
    } else if (pathname === "/about") {
      tasks.push(loadAboutRoute());
    } else if (pathname === "/street" || pathname === "/streets" || pathname === "/sinaa" || pathname === "/rubaie") {
      tasks.push(loadStreetPageRoute());
    }

    if (tasks.length === 0) return;
    await Promise.allSettled(tasks);
  } finally {
    activePrefetches = Math.max(0, activePrefetches - 1);
  }
}
