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
  RobotOutlined,
  SafetyOutlined,
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

const LoginPage = lazy(() => import("./pages/auth/LoginPage.jsx"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage.jsx"));
const OnboardingPage = lazy(
  () => import("./pages/onboarding/OnboardingPage.jsx"),
);

const DashboardPage = lazy(() => import("./pages/overview/DashboardPage.jsx"));

const ProductsPage = lazy(() => import("./pages/catalog/ProductsPage.jsx"));
const CollectionsPage = lazy(
  () => import("./pages/catalog/CollectionsPage.jsx"),
);

const CartPage = lazy(() => import("./pages/sales/CartPage.jsx"));
const CheckoutPage = lazy(() => import("./pages/sales/CheckoutPage.jsx"));
const OrdersPage = lazy(() => import("./pages/sales/OrdersPage.jsx"));
const OrderDetailPage = lazy(() => import("./pages/sales/OrderDetailPage.jsx"));

const ShippingPage = lazy(() => import("./pages/operations/ShippingPage.jsx"));

const StorePage = lazy(() => import("./pages/settings/StorePage.jsx"));
const WebsiteBuilderPage = lazy(
  () => import("./components/website-builder/WebsiteBuilderPage.jsx"),
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
const ProfilePage = lazy(() => import("./pages/settings/ProfilePage.jsx"));
import ComingSoonPage from "./pages/ComingSoonPage.js";

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
    key: "builder",
    label: "Website",
    icon: <AppstoreOutlined />,
    children: [
      {
        to: "/store/website-builder",
        label: "Website Builder",
        icon: <AppstoreOutlined />,
      },
      {
        to: "/store",
        label: "Store Settings",
        icon: <ShopOutlined />,
      },
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
    key: "wholesale",
    label: "B2B & Wholesale",
    icon: <ShoppingCartOutlined />,
    children: [
      { to: "/b2b-companies", label: "Companies", icon: <TeamOutlined /> },
      {
        to: "/wholesale-price-lists",
        label: "Price Lists",
        icon: <TagsOutlined />,
      },
      {
        to: "/integrations",
        label: "Integrations",
        icon: <AppstoreOutlined />,
      },
      { to: "/webhooks", label: "APIs & Webhooks", icon: <FileTextOutlined /> },
    ],
  },
  {
    key: "automation",
    label: "Automation",
    icon: <RobotOutlined />,
    children: [
      { to: "/automations", label: "Workflows", icon: <RobotOutlined /> },
    ],
  },
  {
    key: "security",
    label: "Security & Compliance",
    icon: <SafetyOutlined />,
    children: [
      { to: "/security", label: "Security Settings", icon: <SafetyOutlined /> },
      { to: "/audit", label: "Audit Logs", icon: <AuditOutlined /> },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: <SettingOutlined />,
    children: [
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
  const { user, logout, store } = useAuth();
  const { t, activeLocale, settings, setLocale } = useLocalization();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const defaultOpenSection =
    menuSections.find((section) =>
      section.children.some((item) => item.to === location.pathname),
    )?.key || "overview";
  const [openKeys, setOpenKeys] = useState([defaultOpenSection]);

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
            {store?.name || "Skye"}
          </Typography.Title>
          <Badge
            status={store?.isPublished ? "success" : "default"}
            text={
              <Typography.Text style={{ fontSize: 11 }} type="secondary">
                {store?.isPublished ? "Published" : "Draft"}
              </Typography.Text>
            }
          />
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
    <Layout className="app-shell">
      {!isMobile ? (
        <Layout.Sider width="fit-content" className="app-sider">
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
        <Card className="app-topbar" styles={{ body: { padding: "10px 16px" } }}>
          <Flex justify="space-between" align="center" gap={12}>
            <Space size={10} align="center">
              {isMobile ? (
                <Button size="small" onClick={() => setMobileNavOpen(true)}>Menu</Button>
              ) : null}
              <Space size={6} align="center">
                <div className="app-logo-mark" style={{ width: 28, height: 28, fontSize: "0.72rem" }}>SK</div>
                <Typography.Text strong style={{ fontSize: 14 }}>
                  {isMobile ? currentRouteLabel : (store?.name || "Skye")}
                </Typography.Text>
              </Space>
            </Space>
            <Flex align="center" gap={8} wrap="nowrap">
              <Tag color="processing" style={{ margin: 0 }}>{t("app.liveOps", "Live Ops")}</Tag>
              <Badge
                status="processing"
                text={t("app.realtimeSync", "Realtime sync")}
              />
              <Select
                size="small"
                value={activeLocale}
                style={{ minWidth: 100 }}
                onChange={(value) => setLocale(value, true)}
                options={(settings?.enabledLocales || ["id", "en"]).map(
                  (localeCode) => ({
                    value: localeCode,
                    label: localeCode,
                  }),
                )}
              />
              <Avatar size="small" className="app-user-avatar">
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
              {/* MVP 1 — active routes */}
              <Route path="/" element={<DashboardPage />} />
              <Route path="/products" element={<ProductsPage />} />
              <Route path="/collections" element={<CollectionsPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/orders" element={<OrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetailPage />} />
              <Route path="/shipping" element={<ShippingPage />} />
              <Route
                path="/store/website-builder"
                element={<WebsiteBuilderPage />}
              />
              <Route path="/store" element={<StorePage />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* Coming soon — not yet in MVP 1 */}
              <Route path="/analytics" element={<ComingSoonPage />} />
              <Route path="/inventory" element={<ComingSoonPage />} />
              <Route path="/discounts" element={<ComingSoonPage />} />
              <Route path="/campaigns" element={<ComingSoonPage />} />
              <Route path="/content-pages" element={<ComingSoonPage />} />
              <Route path="/abandoned-carts" element={<ComingSoonPage />} />
              <Route path="/subscriptions" element={<ComingSoonPage />} />
              <Route path="/customers" element={<ComingSoonPage />} />
              <Route path="/payments" element={<ComingSoonPage />} />
              <Route path="/returns" element={<ComingSoonPage />} />
              <Route path="/tax" element={<ComingSoonPage />} />
              <Route path="/b2b-companies" element={<ComingSoonPage />} />
              <Route path="/wholesale-price-lists" element={<ComingSoonPage />} />
              <Route path="/integrations" element={<ComingSoonPage />} />
              <Route path="/webhooks" element={<ComingSoonPage />} />
              <Route path="/automations" element={<ComingSoonPage />} />
              <Route path="/security" element={<ComingSoonPage />} />
              <Route path="/audit" element={<ComingSoonPage />} />
              <Route path="/localization" element={<ComingSoonPage />} />
              <Route path="/multi-currency" element={<ComingSoonPage />} />
            </Routes>
          </Suspense>
        </div>
      </Layout.Content>
    </Layout>
  );
}

function PageFallback() {
  return <Card className="page-fallback">Loading page...</Card>;
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#0D5C53",
          colorSuccess: "#15803D",
          colorWarning: "#D97706",
          colorError: "#DC2626",
          colorInfo: "#0D5C53",
          colorTextBase: "#111827",
          colorBgBase: "#FFFFFF",
          colorPrimaryBg: "#E8F3F1",
          colorPrimaryBgHover: "#D1E7E3",
          colorPrimaryBorder: "#A3C9C2",
          colorPrimaryBorderHover: "#7AB0A7",
          colorPrimaryHover: "#0A4A42",
          colorPrimaryActive: "#073A33",
          colorPrimaryText: "#0D5C53",
          colorPrimaryTextHover: "#0A4A42",
          colorPrimaryTextActive: "#073A33",
          colorSuccessBg: "#ECF7EF",
          colorSuccessBgHover: "#D9F0E0",
          colorSuccessBorder: "#9DD6AF",
          colorSuccessBorderHover: "#6BBD84",
          colorSuccessHover: "#116532",
          colorSuccessActive: "#0A4F28",
          colorSuccessText: "#15803D",
          colorSuccessTextHover: "#116532",
          colorSuccessTextActive: "#0A4F28",
          colorWarningBg: "#FFF7ED",
          colorWarningBgHover: "#FFEDD5",
          colorWarningBorder: "#FDBA74",
          colorWarningBorderHover: "#FB923C",
          colorWarningHover: "#B45309",
          colorWarningActive: "#92400E",
          colorWarningText: "#D97706",
          colorWarningTextHover: "#B45309",
          colorWarningTextActive: "#92400E",
          colorErrorBg: "#FEF2F2",
          colorErrorBgHover: "#FEE2E2",
          colorErrorBorder: "#FCA5A5",
          colorErrorBorderHover: "#F87171",
          colorErrorHover: "#B91C1C",
          colorErrorActive: "#991B1B",
          colorErrorText: "#DC2626",
          colorErrorTextHover: "#B91C1C",
          colorErrorTextActive: "#991B1B",
          colorInfoBg: "#E8F3F1",
          colorInfoBgHover: "#D1E7E3",
          colorInfoBorder: "#A3C9C2",
          colorInfoBorderHover: "#7AB0A7",
          colorInfoHover: "#0A4A42",
          colorInfoActive: "#073A33",
          colorInfoText: "#0D5C53",
          colorInfoTextHover: "#0A4A42",
          colorInfoTextActive: "#073A33",
          colorText: "#111827",
          colorTextSecondary: "#374151",
          colorTextTertiary: "#6B7280",
          colorTextQuaternary: "#9CA3AF",
          colorTextDisabled: "#9CA3AF",
          colorBgContainer: "#FFFFFF",
          colorBgElevated: "#FFFFFF",
          colorBgLayout: "#EDF4F2",
          colorBgSpotlight: "#111827",
          colorBgMask: "rgba(17, 24, 39, 0.45)",
          colorBorder: "#D1DBDB",
          colorBorderSecondary: "#E5E7EB",
          borderRadius: 8,
          borderRadiusXS: 2,
          borderRadiusSM: 4,
          borderRadiusLG: 12,
          padding: 16,
          paddingSM: 12,
          paddingLG: 24,
          margin: 16,
          marginSM: 12,
          marginLG: 24,
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
          boxShadowSecondary: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          fontFamily: "Manrope, sans-serif",
        },
      }}
    >
      <AntApp>
        <Suspense fallback={<PageFallback />}>
          <Routes>
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
              path="/*"
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
