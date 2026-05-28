import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute.jsx";
import PageFallback from "./shared/ui/PageFallback";
import AppLayout from "./layouts/admin";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "./context/AuthContext";
import { APP_ORIGIN, isLandingHost } from "./lib/site";

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

function ExternalBounceToApp() {
  useEffect(() => {
    const path = window.location.pathname + window.location.search;
    window.location.replace(`${APP_ORIGIN}${path}`);
  }, []);
  return <PageFallback />;
}

function RootRedirect() {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <PageFallback />;
  return <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />;
}

function LandingApp() {
  return (
    <Routes>
      <Route path="/" element={<MarketingPage />} />

      {/* Storefront publik tetap di apex sampai pindah ke wildcard subdomain */}
      <Route path="/s/:slug" element={<StorefrontLayout />}>
        <Route index element={<StorefrontHomePage />} />
        <Route path="katalog" element={<StorefrontCatalogPage />} />
        <Route path="p/:handle" element={<StorefrontProductPage />} />
        <Route path="keranjang" element={<StorefrontCartPage />} />
        <Route path="checkout" element={<StorefrontCheckoutPage />} />
        <Route
          path="order/:orderId"
          element={<StorefrontOrderConfirmationPage />}
        />
      </Route>

      {/* Path lain (login/register/dashboard) → bounce ke dashboard subdomain */}
      <Route path="*" element={<ExternalBounceToApp />} />
    </Routes>
  );
}

function DashboardApp() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      {/* Landing tetap accessible untuk preview / dev */}
      <Route path="/landing" element={<MarketingPage />} />

      {/* Storefront publik (akan pindah ke wildcard subdomain) */}
      <Route path="/s/:slug" element={<StorefrontLayout />}>
        <Route index element={<StorefrontHomePage />} />
        <Route path="katalog" element={<StorefrontCatalogPage />} />
        <Route path="p/:handle" element={<StorefrontProductPage />} />
        <Route path="keranjang" element={<StorefrontCartPage />} />
        <Route path="checkout" element={<StorefrontCheckoutPage />} />
        <Route
          path="order/:orderId"
          element={<StorefrontOrderConfirmationPage />}
        />
      </Route>

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

      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  const renderRoutes = isLandingHost() ? <LandingApp /> : <DashboardApp />;
  return (
    <TooltipProvider>
      <Suspense fallback={<PageFallback />}>{renderRoutes}</Suspense>
      <Toaster />
    </TooltipProvider>
  );
}
