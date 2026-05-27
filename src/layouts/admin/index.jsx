import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMediaQuery } from "@/lib/use-media-query";
import PageFallback from "../../shared/ui/PageFallback";
import { useAuth } from "../../context/AuthContext.jsx";
import ComingSoonPage from "../../pages/ComingSoonPage";
import { flatNavItems, navSections } from "./navConfig";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const DashboardPage = lazy(
  () => import("../../pages/overview/DashboardPage.jsx"),
);
const ProductsPage = lazy(
  () => import("../../features/products/ProductsPage.jsx"),
);
const CollectionsPage = lazy(
  () => import("../../features/collections/CollectionsPage.jsx"),
);
const CartPage = lazy(() => import("../../pages/sales/CartPage.jsx"));
const CheckoutPage = lazy(() => import("../../pages/sales/CheckoutPage.jsx"));
const OrdersPage = lazy(() => import("../../pages/sales/OrdersPage.jsx"));
const OrderDetailPage = lazy(
  () => import("../../features/orders/OrderDetailPage.jsx"),
);
const ShippingPage = lazy(
  () => import("../../features/shipping/ShippingPage.jsx"),
);
const WebsiteBuilderPage = lazy(
  () => import("../../components/website-builder/WebsiteBuilderPage.jsx"),
);
const StorePage = lazy(() => import("../../pages/settings/StorePage.jsx"));
const ProfilePage = lazy(() => import("../../pages/settings/ProfilePage.jsx"));

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMobile = !isDesktop;

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const defaultOpenKey =
    navSections.find((section) =>
      section.children.some((item) => item.to === location.pathname),
    )?.key ?? "overview";

  const [openKeys, setOpenKeys] = useState([defaultOpenKey]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const activeSection = navSections.find((section) =>
      section.children.some(
        (item) =>
          location.pathname === item.to ||
          (item.to !== "/" && location.pathname.startsWith(`${item.to}/`)),
      ),
    );
    if (activeSection) {
      setOpenKeys((prev) =>
        prev.includes(activeSection.key) ? prev : [activeSection.key],
      );
    }
  }, [location.pathname]);

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const activeMenuKey =
    flatNavItems
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find(
        (item) =>
          location.pathname === item.to ||
          (item.to !== "/dashboard" &&
            location.pathname.startsWith(`${item.to}/`)),
      )?.to ?? "/dashboard";

  const currentRouteLabel =
    flatNavItems.find(
      (item) =>
        location.pathname === item.to ||
        (item.to !== "/dashboard" &&
          location.pathname.startsWith(`${item.to}/`)),
    )?.label ?? "Dashboard";

  const sidebar = (
    <Sidebar
      activeMenuKey={activeMenuKey}
      openKeys={openKeys}
      onOpenChange={setOpenKeys}
      onLogout={onLogout}
    />
  );

  return (
    <div className="flex min-h-screen">
      {!isMobile ? (
        <aside className="sticky top-0 h-screen w-[280px] shrink-0 overflow-auto border-r bg-card/60 p-4 backdrop-blur">
          {sidebar}
        </aside>
      ) : null}

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-[320px] p-4">
          <SheetHeader className="p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
          </SheetHeader>
          {sidebar}
        </SheetContent>
      </Sheet>

      <main className="flex h-screen flex-1 flex-col overflow-hidden p-4 md:p-5">
        <Topbar
          isMobile={isMobile}
          currentRouteLabel={currentRouteLabel}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 overflow-y-auto pb-6">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route index element={<DashboardPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="collections" element={<CollectionsPage />} />
              <Route path="cart" element={<CartPage />} />
              <Route path="checkout" element={<CheckoutPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:orderId" element={<OrderDetailPage />} />
              <Route path="shipping" element={<ShippingPage />} />
              <Route
                path="store/website-builder"
                element={<WebsiteBuilderPage />}
              />
              <Route path="store" element={<StorePage />} />
              <Route path="profile" element={<ProfilePage />} />

              <Route path="analytics" element={<ComingSoonPage />} />
              <Route path="inventory" element={<ComingSoonPage />} />
              <Route path="discounts" element={<ComingSoonPage />} />
              <Route path="campaigns" element={<ComingSoonPage />} />
              <Route path="content-pages" element={<ComingSoonPage />} />
              <Route path="abandoned-carts" element={<ComingSoonPage />} />
              <Route path="subscriptions" element={<ComingSoonPage />} />
              <Route path="customers" element={<ComingSoonPage />} />
              <Route path="payments" element={<ComingSoonPage />} />
              <Route path="returns" element={<ComingSoonPage />} />
              <Route path="tax" element={<ComingSoonPage />} />
              <Route path="b2b-companies" element={<ComingSoonPage />} />
              <Route
                path="wholesale-price-lists"
                element={<ComingSoonPage />}
              />
              <Route path="integrations" element={<ComingSoonPage />} />
              <Route path="webhooks" element={<ComingSoonPage />} />
              <Route path="automations" element={<ComingSoonPage />} />
              <Route path="security" element={<ComingSoonPage />} />
              <Route path="audit" element={<ComingSoonPage />} />
              <Route path="localization" element={<ComingSoonPage />} />
              <Route path="multi-currency" element={<ComingSoonPage />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  );
}
