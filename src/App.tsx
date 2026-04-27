import { lazy, Suspense } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppRuntimeChrome } from "@/components/AppRuntimeChrome";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataStoreProvider } from "@/lib/dataStore";
import { UserPrefsProvider } from "@/lib/userPrefs";
import { ThemeProvider } from "@/lib/theme";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { queryClient } from "@/lib/queryClient";
import {
  loadAboutRoute,
  loadAdminLoginRoute,
  loadAnswerEngineRoute,
  loadBrandRoute,
  loadBrandsRoute,
  loadCityPageRoute,
  loadCityShopViewRoute,
  loadDashboardRoute,
  loadIraqCitiesRoute,
  loadNotFoundRoute,
  loadProductDetailRoute,
  loadShopViewRoute,
  loadStreetPageRoute,
  loadUnifiedSearchRoute,
} from "@/lib/routeLoaders";
import Index from "./pages/Index.tsx";

// Lazy-load secondary routes to keep the initial bundle small.
// NOTE: /results was merged into /search — legacy URLs redirect via <ResultsRedirect />.
const ShopView = lazy(loadShopViewRoute);
const Brand = lazy(loadBrandRoute);
const Brands = lazy(loadBrandsRoute);
const Dashboard = lazy(loadDashboardRoute);
const AdminLogin = lazy(loadAdminLoginRoute);
const NotFound = lazy(loadNotFoundRoute);
const StreetPages = lazy(() =>
  loadStreetPageRoute().then((m) => ({ default: m.SinaaPage })),
);
const RubaiePage = lazy(() =>
  loadStreetPageRoute().then((m) => ({ default: m.RubaiePage })),
);
const StreetsIndex = lazy(() =>
  loadStreetPageRoute().then((m) => ({ default: m.StreetsIndexPage })),
);
const IraqCities = lazy(loadIraqCitiesRoute);
const CityPage = lazy(loadCityPageRoute);
const CityShopView = lazy(loadCityShopViewRoute);
const About = lazy(loadAboutRoute);
const AnswerEngine = lazy(loadAnswerEngineRoute);
const UnifiedSearch = lazy(loadUnifiedSearchRoute);
const ProductDetail = lazy(loadProductDetailRoute);

// Permanent redirect from the legacy /results route to the unified /search page.
// Preserves all query params (q, area, category, sort, etc.) so old links keep working.
const ResultsRedirect = () => {
  const { search } = useLocation();
  return <Navigate to={`/search${search}`} replace />;
};

const RouteFallback = () => (
  <div className="container flex min-h-[60vh] items-center justify-center">
    <div className="w-full max-w-3xl space-y-4">
      <div className="h-5 w-32 rounded-full bg-muted skeleton-shimmer" />
      <div className="h-24 rounded-3xl bg-muted skeleton-shimmer" />
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="h-28 rounded-2xl bg-muted skeleton-shimmer" />
        <div className="h-28 rounded-2xl bg-muted skeleton-shimmer" />
        <div className="h-28 rounded-2xl bg-muted skeleton-shimmer" />
      </div>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider delayDuration={120}>
        <DataStoreProvider>
          <UserPrefsProvider>
          <BrowserRouter>
            <ScrollToTop />
            <ErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/results" element={<ResultsRedirect />} />
                  <Route path="/search" element={<UnifiedSearch />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/street" element={<StreetsIndex />} />
                  <Route path="/streets" element={<StreetsIndex />} />
                  <Route path="/sinaa" element={<StreetPages />} />
                  <Route path="/rubaie" element={<RubaiePage />} />
                  <Route path="/iraq" element={<IraqCities />} />
                  <Route path="/city/:slug" element={<CityPage />} />
                  <Route path="/city/:slug/shop/:shopId" element={<CityShopView />} />
                  <Route path="/shop-view/:shopId" element={<ShopView />} />
                  <Route path="/brands" element={<Brands />} />
                  <Route path="/brand/:slug" element={<Brand />} />
                  <Route path="/67" element={<AdminLogin />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/answers" element={<AnswerEngine />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            <AppRuntimeChrome />
          </BrowserRouter>
          </UserPrefsProvider>
        </DataStoreProvider>
      </TooltipProvider>
      </ThemeProvider>
  </QueryClientProvider>
);

export default App;
