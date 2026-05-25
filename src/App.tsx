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

const DashboardPage = lazy(() => import("./pages/overview/DashboardPage.jsx"));
const AnalyticsPage = lazy(() => import("./pages/overview/AnalyticsPage.jsx"));

const ProductsPage = lazy(() => import("./pages/catalog/ProductsPage.jsx"));
const CollectionsPage = lazy(
  () => import("./pages/catalog/CollectionsPage.jsx"),
);
const InventoryPage = lazy(() => import("./pages/catalog/InventoryPage.jsx"));
const DiscountsPage = lazy(() => import("./pages/catalog/DiscountsPage.jsx"));
const CampaignsPage = lazy(() => import("./pages/catalog/CampaignsPage.jsx"));
const ContentPagesPage = lazy(
  () => import("./pages/catalog/ContentPagesPage.jsx"),
);

const CartPage = lazy(() => import("./pages/sales/CartPage.jsx"));
const AbandonedCartsPage = lazy(
  () => import("./pages/sales/AbandonedCartsPage.jsx"),
);
const CheckoutPage = lazy(() => import("./pages/sales/CheckoutPage.jsx"));
const OrdersPage = lazy(() => import("./pages/sales/OrdersPage.jsx"));
const OrderDetailPage = lazy(() => import("./pages/sales/OrderDetailPage.jsx"));
const SubscriptionsPage = lazy(
  () => import("./pages/sales/SubscriptionsPage.jsx"),
);
const CustomersPage = lazy(() => import("./pages/sales/CustomersPage.jsx"));
const PaymentsPage = lazy(() => import("./pages/sales/PaymentsPage.jsx"));
const ReturnsPage = lazy(() => import("./pages/sales/ReturnsPage.jsx"));

const ShippingPage = lazy(() => import("./pages/operations/ShippingPage.jsx"));
const TaxPage = lazy(() => import("./pages/operations/TaxPage.jsx"));

const B2bCompaniesPage = lazy(() => import("./pages/b2b/B2bCompaniesPage.jsx"));
const WholesalePriceListsPage = lazy(
  () => import("./pages/b2b/WholesalePriceListsPage.jsx"),
);
const IntegrationsPage = lazy(() => import("./pages/b2b/IntegrationsPage.jsx"));
const WebhooksPage = lazy(() => import("./pages/b2b/WebhooksPage.jsx"));

const AutomationsPage = lazy(
  () => import("./pages/automation/AutomationsPage.jsx"),
);

const SecurityPage = lazy(() => import("./pages/security/SecurityPage.jsx"));
const AuditPage = lazy(() => import("./pages/security/AuditPage.jsx"));

const StorePage = lazy(() => import("./pages/settings/StorePage.jsx"));
const WebsiteBuilderPage = lazy(
  () =>
    import("./components/website-builder/WebsiteBuilderPage.jsx"),
);
const LocalizationPage = lazy(
  () => import("./pages/settings/LocalizationPage.jsx"),
);
const MultiCurrencyPage = lazy(
  () => import("./pages/settings/MultiCurrencyPage.jsx"),
);
const ProfilePage = lazy(() => import("./pages/settings/ProfilePage.jsx"));

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
        token: {
          colorPrimary: '#0D5C53',
          colorSuccess: '#15803D',
          colorWarning: '#D97706',
          colorError: '#DC2626',
          colorInfo: '#0D5C53',
          colorTextBase: '#111827',
          colorBgBase: '#FFFFFF',
          colorPrimaryBg: '#E8F3F1',
          colorPrimaryBgHover: '#D1E7E3',
          colorPrimaryBorder: '#A3C9C2',
          colorPrimaryBorderHover: '#7AB0A7',
          colorPrimaryHover: '#0A4A42',
          colorPrimaryActive: '#073A33',
          colorPrimaryText: '#0D5C53',
          colorPrimaryTextHover: '#0A4A42',
          colorPrimaryTextActive: '#073A33',
          colorSuccessBg: '#ECF7EF',
          colorSuccessBgHover: '#D9F0E0',
          colorSuccessBorder: '#9DD6AF',
          colorSuccessBorderHover: '#6BBD84',
          colorSuccessHover: '#116532',
          colorSuccessActive: '#0A4F28',
          colorSuccessText: '#15803D',
          colorSuccessTextHover: '#116532',
          colorSuccessTextActive: '#0A4F28',
          colorWarningBg: '#FFF7ED',
          colorWarningBgHover: '#FFEDD5',
          colorWarningBorder: '#FDBA74',
          colorWarningBorderHover: '#FB923C',
          colorWarningHover: '#B45309',
          colorWarningActive: '#92400E',
          colorWarningText: '#D97706',
          colorWarningTextHover: '#B45309',
          colorWarningTextActive: '#92400E',
          colorErrorBg: '#FEF2F2',
          colorErrorBgHover: '#FEE2E2',
          colorErrorBorder: '#FCA5A5',
          colorErrorBorderHover: '#F87171',
          colorErrorHover: '#B91C1C',
          colorErrorActive: '#991B1B',
          colorErrorText: '#DC2626',
          colorErrorTextHover: '#B91C1C',
          colorErrorTextActive: '#991B1B',
          colorInfoBg: '#E8F3F1',
          colorInfoBgHover: '#D1E7E3',
          colorInfoBorder: '#A3C9C2',
          colorInfoBorderHover: '#7AB0A7',
          colorInfoHover: '#0A4A42',
          colorInfoActive: '#073A33',
          colorInfoText: '#0D5C53',
          colorInfoTextHover: '#0A4A42',
          colorInfoTextActive: '#073A33',
          colorText: '#111827',
          colorTextSecondary: '#374151',
          colorTextTertiary: '#6B7280',
          colorTextQuaternary: '#9CA3AF',
          colorTextDisabled: '#9CA3AF',
          colorBgContainer: '#FFFFFF',
          colorBgElevated: '#FFFFFF',
          colorBgLayout: '#EDF4F2',
          colorBgSpotlight: '#111827',
          colorBgMask: 'rgba(17, 24, 39, 0.45)',
          colorBorder: '#D1DBDB',
          colorBorderSecondary: '#E5E7EB',
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
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          fontFamily: "Manrope, sans-serif",
        },
      }}
    >
      <AntApp>
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
                  <Route
                    path="/store/website-builder"
                    element={<WebsiteBuilderPage />}
                  />
                  <Route path="/store" element={<StorePage />} />
                  <Route path="/b2b-companies" element={<B2bCompaniesPage />} />
                  <Route
                    path="/wholesale-price-lists"
                    element={<WholesalePriceListsPage />}
                  />
                  <Route path="/integrations" element={<IntegrationsPage />} />
                  <Route path="/webhooks" element={<WebhooksPage />} />
                  <Route path="/automations" element={<AutomationsPage />} />
                  <Route path="/security" element={<SecurityPage />} />
                  <Route path="/audit" element={<AuditPage />} />
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
