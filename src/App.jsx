import { App as AntApp, ConfigProvider } from "antd";
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute.jsx";
import PageFallback from "./components/ui/PageFallback";
import AppLayout from "./layouts/admin";
import skyeTheme from "./lib/theme";

const LoginPage = lazy(() => import("./pages/auth/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage.jsx"));
const OnboardingPage = lazy(
  () => import("./pages/onboarding/OnboardingPage.jsx"),
);
const StorefrontPreviewPage = lazy(
  () => import("./pages/storefront/StorefrontPreviewPage.jsx"),
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
const MarketingPage = lazy(() => import("./pages/marketing/MarketingPage.jsx"));

export default function App() {
  return (
    <ConfigProvider theme={skyeTheme}>
      <AntApp>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<MarketingPage />} />
            <Route path="/landing" element={<Navigate to="/" replace />} />
            <Route path="/preview" element={<StorefrontPreviewPage />} />
            <Route
              path="/storefront/product/:handle"
              element={<StorefrontProductPage />}
            />
            <Route path="/storefront/cart" element={<StorefrontCartPage />} />
            <Route
              path="/storefront/checkout"
              element={<StorefrontCheckoutPage />}
            />
            <Route
              path="/storefront/order-confirmed/:orderId"
              element={<StorefrontOrderConfirmationPage />}
            />

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
        </Suspense>
      </AntApp>
    </ConfigProvider>
  );
}
