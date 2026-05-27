import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute.jsx";
import PageFallback from "./shared/ui/PageFallback";
import AppLayout from "./layouts/admin";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const LoginPage = lazy(() => import("./pages/auth/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage.jsx"));
const OnboardingPage = lazy(
  () => import("./pages/onboarding/OnboardingPage.jsx"),
);
const MarketingPage = lazy(() => import("./pages/marketing/MarketingPage.jsx"));

const StorefrontLayout = lazy(
  () => import("./pages/storefront/StorefrontLayout.jsx"),
);
const StorefrontHomePage = lazy(
  () => import("./pages/storefront/StorefrontHomePage.jsx"),
);
const StorefrontCatalogPage = lazy(
  () => import("./pages/storefront/StorefrontCatalogPage.jsx"),
);
const StorefrontProductPage = lazy(
  () => import("./pages/storefront/StorefrontProductPage.jsx"),
);
const StorefrontCartPage = lazy(
  () => import("./pages/storefront/StorefrontCartPage.jsx"),
);
const StorefrontCheckoutPage = lazy(
  () => import("./pages/storefront/StorefrontCheckoutPage.jsx"),
);
const StorefrontOrderConfirmationPage = lazy(
  () => import("./pages/storefront/StorefrontOrderConfirmationPage.jsx"),
);

export default function App() {
  return (
    <TooltipProvider>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<MarketingPage />} />
          <Route path="/landing" element={<Navigate to="/" replace />} />

          {/* Public storefront — /s/:slug/* */}
          <Route path="/s/:slug" element={<StorefrontLayout />}>
            <Route index element={<StorefrontHomePage />} />
            <Route path="katalog" element={<StorefrontCatalogPage />} />
            <Route path="p/:handle" element={<StorefrontProductPage />} />
            <Route path="keranjang" element={<StorefrontCartPage />} />
            <Route path="checkout" element={<StorefrontCheckoutPage />} />
            <Route path="order/:orderId" element={<StorefrontOrderConfirmationPage />} />
          </Route>

          {/* Auth */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Merchant dashboard */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
      <Toaster />
    </TooltipProvider>
  );
}
