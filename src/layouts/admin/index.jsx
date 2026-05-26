import { Drawer, Grid, Layout } from "antd";
import { lazy, Suspense, useEffect, useState } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";
import PageFallback from "../../components/ui/PageFallback";
import { useAuth } from "../../context/AuthContext.jsx";
import ComingSoonPage from "../../pages/ComingSoonPage";
import { flatNavItems, navSections } from "./navConfig";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

const DashboardPage = lazy(
  () => import("../../pages/overview/DashboardPage.jsx"),
);
const ProductsPage = lazy(() => import("../../pages/catalog/ProductsPage.jsx"));
const CollectionsPage = lazy(
  () => import("../../pages/catalog/CollectionsPage.jsx"),
);
const CartPage = lazy(() => import("../../pages/sales/CartPage.jsx"));
const CheckoutPage = lazy(() => import("../../pages/sales/CheckoutPage.jsx"));
const OrdersPage = lazy(() => import("../../pages/sales/OrdersPage.jsx"));
const OrderDetailPage = lazy(
  () => import("../../pages/sales/OrderDetailPage.jsx"),
);
const ShippingPage = lazy(
  () => import("../../pages/operations/ShippingPage.jsx"),
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
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

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
    <Layout className="app-shell">
      {!isMobile ? (
        <Layout.Sider width="fit-content" className="app-sider">
          {sidebar}
        </Layout.Sider>
      ) : null}

      <Drawer
        placement="left"
        width={320}
        title="Navigation"
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        className="app-mobile-drawer"
      >
        {sidebar}
      </Drawer>

      <Layout.Content className="app-content">
        <Topbar
          isMobile={isMobile}
          currentRouteLabel={currentRouteLabel}
          onOpenMobileNav={() => setMobileNavOpen(true)}
        />

        <div className="app-content-scroll">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* MVP 1 — active routes */}
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

              {/* Coming soon — not yet in MVP 1 */}
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
      </Layout.Content>
    </Layout>
  );
}
