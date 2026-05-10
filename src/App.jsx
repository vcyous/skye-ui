import {
  AppstoreOutlined,
  AuditOutlined,
  BarChartOutlined,
  CreditCardOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  DollarCircleOutlined,
  DropboxOutlined,
  FileTextOutlined,
  GiftOutlined,
  GlobalOutlined,
  MailOutlined,
  NotificationOutlined,
  ProfileOutlined,
  ReloadOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  SolutionOutlined,
  TagsOutlined,
  TeamOutlined,
  TruckOutlined,
  UserOutlined,
} from "@ant-design/icons";
import {
  App as AntApp,
  theme as antdTheme,
  Avatar,
  Badge,
  Button,
  Card,
  ConfigProvider,
  Drawer,
  Flex,
  Grid,
  Layout,
  Menu,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { lazy, Suspense, useEffect, useState } from "react";
import {
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import { useLocalization } from "./context/LocalizationContext.jsx";

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const CartPage = lazy(() => import("./pages/CartPage.jsx"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage.jsx"));
const DiscountsPage = lazy(() => import("./pages/DiscountsPage.jsx"));
const CollectionsPage = lazy(() => import("./pages/CollectionsPage.jsx"));
const InventoryPage = lazy(() => import("./pages/InventoryPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const PaymentsPage = lazy(() => import("./pages/PaymentsPage.jsx"));
const OrdersPage = lazy(() => import("./pages/OrdersPage.jsx"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage.jsx"));
const ProfilePage = lazy(() => import("./pages/ProfilePage.jsx"));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const ReturnsPage = lazy(() => import("./pages/ReturnsPage.jsx"));
const ShippingPage = lazy(() => import("./pages/ShippingPage.jsx"));
const StorePage = lazy(() => import("./pages/StorePage.jsx"));
const TaxPage = lazy(() => import("./pages/TaxPage.jsx"));
const CustomersPage = lazy(() => import("./pages/CustomersPage.jsx"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage.jsx"));
const AbandonedCartsPage = lazy(() => import("./pages/AbandonedCartsPage.jsx"));
const ContentPagesPage = lazy(() => import("./pages/ContentPagesPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage.jsx"));
const LocalizationPage = lazy(() => import("./pages/LocalizationPage.jsx"));
const MultiCurrencyPage = lazy(() => import("./pages/MultiCurrencyPage.jsx"));
const SubscriptionsPage = lazy(() => import("./pages/SubscriptionsPage.jsx"));

const menuSections = [
  {
    key: "overview",
    label: "Overview",
    icon: <DashboardOutlined />,
    children: [
      { to: "/", label: "Homepage/Dashboard", icon: <DashboardOutlined /> },
      { to: "/analytics", label: "Analytics", icon: <BarChartOutlined /> },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: <AppstoreOutlined />,
    children: [
      { to: "/products", label: "Products", icon: <DropboxOutlined /> },
      { to: "/collections", label: "Collections", icon: <TagsOutlined /> },
      { to: "/inventory", label: "Inventory", icon: <DatabaseOutlined /> },
      { to: "/discounts", label: "Discounts", icon: <GiftOutlined /> },
      {
        to: "/campaigns",
        label: "Campaigns",
        icon: <NotificationOutlined />,
      },
      {
        to: "/content-pages",
        label: "SEO & Content",
        icon: <FileTextOutlined />,
      },
    ],
  },
  {
    key: "orders",
    label: "Sales & Orders",
    icon: <ShoppingCartOutlined />,
    children: [
      { to: "/cart", label: "Cart", icon: <ShoppingOutlined /> },
      {
        to: "/abandoned-carts",
        label: "Abandoned Carts",
        icon: <MailOutlined />,
      },
      { to: "/orders", label: "Orders", icon: <ProfileOutlined /> },
      {
        to: "/subscriptions",
        label: "Subscriptions",
        icon: <SolutionOutlined />,
      },
      { to: "/customers", label: "Customers", icon: <TeamOutlined /> },
      { to: "/payments", label: "Payments", icon: <CreditCardOutlined /> },
      { to: "/returns", label: "Returns & Refunds", icon: <ReloadOutlined /> },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    icon: <TruckOutlined />,
    children: [
      { to: "/shipping", label: "Shipping", icon: <TruckOutlined /> },
      { to: "/tax", label: "Tax & Invoices", icon: <AuditOutlined /> },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: <SettingOutlined />,
    children: [
      { to: "/store", label: "Store Management", icon: <ShopOutlined /> },
      { to: "/localization", label: "Localization", icon: <GlobalOutlined /> },
      {
        to: "/multi-currency",
        label: "Multi-currency",
        icon: <DollarCircleOutlined />,
      },
      { to: "/profile", label: "Profile", icon: <UserOutlined /> },
    ],
  },
];

const flatLinks = menuSections.flatMap((section) => section.children);

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, activeLocale, settings, setLocale } = useLocalization();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const defaultOpenSection =
    menuSections.find((section) =>
      section.children.some((item) => item.to === location.pathname),
    )?.key || "overview";
  const [openKeys, setOpenKeys] = useState([defaultOpenSection]);
  const [colorMode, setColorMode] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    return localStorage.getItem("skye-theme") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", colorMode);
    localStorage.setItem("skye-theme", colorMode);
  }, [colorMode]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const activeSection = menuSections.find((section) =>
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

  const menuItems = menuSections.map((section) => ({
    key: section.key,
    label: section.label,
    icon: section.icon,
    children: section.children.map((link) => ({
      key: link.to,
      label: <NavLink to={link.to}>{link.label}</NavLink>,
      icon: link.icon,
    })),
  }));

  const activeMenuKey =
    flatLinks
      .slice()
      .sort((a, b) => b.to.length - a.to.length)
      .find(
        (item) =>
          location.pathname === item.to ||
          (item.to !== "/" && location.pathname.startsWith(`${item.to}/`)),
      )?.to || "/";

  const currentRouteLabel =
    flatLinks.find(
      (item) =>
        location.pathname === item.to ||
        (item.to !== "/" && location.pathname.startsWith(`${item.to}/`)),
    )?.label || "Dashboard";

  const sideNavigation = (
    <>
      <Space className="app-logo" align="center" size={12}>
        <div className="app-logo-mark">SK</div>
        <div>
          <Typography.Title level={4} className="app-logo-title">
            Skye Apps
          </Typography.Title>
          <Typography.Text className="app-logo-subtitle">
            Admin dashboard
          </Typography.Text>
        </div>
      </Space>

      <Menu
        mode="inline"
        selectedKeys={[activeMenuKey]}
        openKeys={openKeys}
        onOpenChange={setOpenKeys}
        items={menuItems}
        className="app-menu"
      />

      <div className="app-sider-footer">
        <Typography.Text className="app-user-email">
          {user?.email || ""}
        </Typography.Text>
        <Button block onClick={onLogout}>
          {t("app.logout", "Logout")}
        </Button>
      </div>
    </>
  );

  return (
    <ConfigProvider
      theme={{
        algorithm:
          colorMode === "dark"
            ? antdTheme.darkAlgorithm
            : antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#006c9c",
          borderRadius: 12,
          fontFamily: "Manrope, sans-serif",
        },
      }}
    >
      <AntApp>
        <Layout className="app-shell">
          {!isMobile ? (
            <Layout.Sider width={280} className="app-sider">
              {sideNavigation}
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
            {sideNavigation}
          </Drawer>

          <Layout.Content className="app-content">
            <Card className="app-topbar">
              <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                <Space size={12} align="center" wrap>
                  {isMobile ? (
                    <Button onClick={() => setMobileNavOpen(true)}>Menu</Button>
                  ) : null}
                  <div>
                    <Typography.Text className="app-kicker">
                      {t("app.workspace", "Workspace")}
                    </Typography.Text>
                    <Typography.Title level={4} className="app-topbar-title">
                      {currentRouteLabel}
                    </Typography.Title>
                    <Typography.Text className="app-topbar-subtitle">
                      {t("app.commerceControl", "Commerce control center")}
                    </Typography.Text>
                  </div>
                </Space>
                <Flex align="center" gap={10} wrap="wrap">
                  <Tag color="processing">{t("app.liveOps", "Live Ops")}</Tag>
                  <Badge
                    status="processing"
                    text={t("app.realtimeSync", "Realtime sync")}
                  />
                  <Select
                    size="small"
                    value={activeLocale}
                    style={{ minWidth: 112 }}
                    onChange={(value) => setLocale(value, true)}
                    options={(settings?.enabledLocales || ["id", "en"]).map(
                      (localeCode) => ({
                        value: localeCode,
                        label: localeCode,
                      }),
                    )}
                  />
                  <Button
                    onClick={() =>
                      setColorMode((prev) =>
                        prev === "light" ? "dark" : "light",
                      )
                    }
                  >
                    {colorMode === "light" ? "Dark mode" : "Light mode"}
                  </Button>
                  <Avatar className="app-user-avatar">
                    {String(user?.email || "U")
                      .slice(0, 1)
                      .toUpperCase()}
                  </Avatar>
                </Flex>
              </Flex>
            </Card>

            <div className="app-content-scroll">
              <Suspense fallback={<PageFallback />}>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/collections" element={<CollectionsPage />} />
                  <Route path="/inventory" element={<InventoryPage />} />
                  <Route path="/discounts" element={<DiscountsPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/content-pages" element={<ContentPagesPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route
                    path="/abandoned-carts"
                    element={<AbandonedCartsPage />}
                  />
                  <Route path="/checkout" element={<CheckoutPage />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route
                    path="/subscriptions"
                    element={<SubscriptionsPage />}
                  />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route
                    path="/orders/:orderId"
                    element={<OrderDetailPage />}
                  />
                  <Route path="/payments" element={<PaymentsPage />} />
                  <Route path="/shipping" element={<ShippingPage />} />
                  <Route path="/tax" element={<TaxPage />} />
                  <Route path="/returns" element={<ReturnsPage />} />
                  <Route path="/store" element={<StorePage />} />
                  <Route path="/localization" element={<LocalizationPage />} />
                  <Route
                    path="/multi-currency"
                    element={<MultiCurrencyPage />}
                  />
                  <Route path="/profile" element={<ProfilePage />} />
                </Routes>
              </Suspense>
            </div>
          </Layout.Content>
        </Layout>
      </AntApp>
    </ConfigProvider>
  );
}

function PageFallback() {
  return <Card className="page-fallback">Loading page...</Card>;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
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
          path="/*"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Suspense>
  );
}
