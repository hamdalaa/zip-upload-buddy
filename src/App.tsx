import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DataStoreProvider } from "@/lib/dataStore";
import { UserPrefsProvider } from "@/lib/userPrefs";
import { CompareBar } from "@/components/CompareBar";
import { CommandPalette } from "@/components/CommandPalette";
import { WelcomeTour } from "@/components/WelcomeTour";
import { ScrollToTop } from "@/components/ScrollToTop";
import { BottomTabBar } from "@/components/BottomTabBar";
import { PullToRefresh } from "@/components/PullToRefresh";
import Index from "./pages/Index.tsx";

// Lazy-load secondary routes to keep the initial bundle small.
const Results = lazy(() => import("./pages/Results.tsx"));
const ShopView = lazy(() => import("./pages/ShopView.tsx"));
const Brand = lazy(() => import("./pages/Brand.tsx"));
const Brands = lazy(() => import("./pages/Brands.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));
const StreetPages = lazy(() =>
  import("./pages/StreetPage.tsx").then((m) => ({ default: m.SinaaPage })),
);
const RubaiePage = lazy(() =>
  import("./pages/StreetPage.tsx").then((m) => ({ default: m.RubaiePage })),
);
const IraqCities = lazy(() => import("./pages/IraqCities.tsx"));
const CityPage = lazy(() => import("./pages/CityPage.tsx"));
const CityShopView = lazy(() => import("./pages/CityShopView.tsx"));
const About = lazy(() => import("./pages/About.tsx"));
const UnifiedSearch = lazy(() => import("./pages/UnifiedSearch.tsx"));
const ProductDetail = lazy(() => import("./pages/ProductDetail.tsx"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider delayDuration={200}>
      <DataStoreProvider>
        <UserPrefsProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <WelcomeTour />
            <Suspense fallback={<RouteFallback />}>
              <PullToRefresh>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/results" element={<Results />} />
                  <Route path="/search" element={<UnifiedSearch />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/sinaa" element={<StreetPages />} />
                  <Route path="/rubaie" element={<RubaiePage />} />
                  <Route path="/iraq" element={<IraqCities />} />
                  <Route path="/city/:slug" element={<CityPage />} />
                  <Route path="/city/:slug/shop/:shopId" element={<CityShopView />} />
                  <Route path="/shop-view/:shopId" element={<ShopView />} />
                  <Route path="/brands" element={<Brands />} />
                  <Route path="/brand/:slug" element={<Brand />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/about" element={<About />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </PullToRefresh>
            </Suspense>
            <CompareBar />
            <CommandPalette />
            <BottomTabBar />
          </BrowserRouter>
        </UserPrefsProvider>
      </DataStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
