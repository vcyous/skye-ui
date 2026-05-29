import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";
import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import ComingSoonPage from "../../pages/ComingSoonPage";
import PageFallback from "../../shared/ui/PageFallback";
import { navItems } from "./navConfig";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const DashboardPage = lazy(
  () => import("../../pages/overview/DashboardPage.jsx"),
);
const ProductsPage = lazy(
  () => import("../../features/products/ProductsPage.jsx"),
);
const OrdersPage = lazy(() => import("../../pages/sales/OrdersPage.jsx"));
const WebsiteBuilderPage = lazy(
  () => import("../../components/website-builder/WebsiteBuilderPage.jsx"),
);
const CollectionsPage = lazy(
  () => import("../../features/collections/CollectionsPage.jsx"),
);
const SettingsPage = lazy(
  () => import("../../pages/settings/SettingsPage.jsx"),
);

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const currentRouteLabel =
    navItems.find((item) =>
      item.end
        ? location.pathname === item.to
        : location.pathname === item.to ||
          location.pathname.startsWith(`${item.to}/`),
    )?.label ?? "Dashboard";

  const sidebar = <Sidebar onLogout={onLogout} />;

  return (
    <div className="flex min-h-screen">
      {isDesktop ? (
        <aside className="sticky top-0 h-screen w-56 shrink-0 overflow-auto border-r bg-card p-4">
          {sidebar}
        </aside>
      ) : null}

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-56 p-4">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Navigasi</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      <main className="flex h-screen flex-1 flex-col overflow-hidden">
        <Topbar
          isMobile={!isDesktop}
          currentRouteLabel={currentRouteLabel}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mx-auto max-w-5xl">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route index element={<DashboardPage />} />
                <Route path="products/*" element={<ProductsPage />} />
                <Route path="collections" element={<CollectionsPage />} />
                <Route path="orders/*" element={<OrdersPage />} />
                <Route path="theme" element={<WebsiteBuilderPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="*" element={<ComingSoonPage />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
