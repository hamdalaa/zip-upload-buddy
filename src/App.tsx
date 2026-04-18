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
import Index from "./pages/Index.tsx";
import Results from "./pages/Results.tsx";
import ShopView from "./pages/ShopView.tsx";
import Brand from "./pages/Brand.tsx";
import Brands from "./pages/Brands.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import NotFound from "./pages/NotFound.tsx";
import { SinaaPage, RubaiePage } from "./pages/StreetPage.tsx";
import IraqCities from "./pages/IraqCities.tsx";
import CityPage from "./pages/CityPage.tsx";
import CityShopView from "./pages/CityShopView.tsx";

const queryClient = new QueryClient();

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
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/results" element={<Results />} />
              <Route path="/sinaa" element={<SinaaPage />} />
              <Route path="/rubaie" element={<RubaiePage />} />
              <Route path="/iraq" element={<IraqCities />} />
              <Route path="/city/:slug" element={<CityPage />} />
              <Route path="/city/:slug/shop/:shopId" element={<CityShopView />} />
              <Route path="/shop-view/:shopId" element={<ShopView />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/brand/:slug" element={<Brand />} />
              <Route path="/dashboard" element={<Dashboard />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <CompareBar />
            <CommandPalette />
          </BrowserRouter>
        </UserPrefsProvider>
      </DataStoreProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
