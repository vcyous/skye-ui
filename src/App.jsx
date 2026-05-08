import {
  App as AntApp,
  theme as antdTheme,
  Button,
  Card,
  ConfigProvider,
  Flex,
  Layout,
  Menu,
  Space,
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

const DashboardPage = lazy(() => import("./pages/DashboardPage.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const OrdersPage = lazy(() => import("./pages/OrdersPage.jsx"));
const ProductsPage = lazy(() => import("./pages/ProductsPage.jsx"));
const RegisterPage = lazy(() => import("./pages/RegisterPage.jsx"));
const StorePage = lazy(() => import("./pages/StorePage.jsx"));

const links = [
  { to: "/", label: "Homepage/Dashboard" },
  { to: "/products", label: "Product" },
  { to: "/orders", label: "Orders" },
  { to: "/store", label: "Store Management" },
];

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
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

  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const menuItems = links.map((link) => ({
    key: link.to,
    label: <NavLink to={link.to}>{link.label}</NavLink>,
  }));

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
          <Layout.Sider
            breakpoint="lg"
            collapsedWidth="0"
            width={280}
            className="app-sider"
          >
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
              selectedKeys={[location.pathname || "/"]}
              items={menuItems}
              className="app-menu"
            />

            <div className="app-sider-footer">
              <Typography.Text className="app-user-email">
                {user?.email || ""}
              </Typography.Text>
              <Button block onClick={onLogout}>
                Logout
              </Button>
            </div>
          </Layout.Sider>

          <Layout.Content className="app-content">
            <Card className="app-topbar">
              <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
                <div>
                  <Typography.Text className="app-kicker">
                    Workspace
                  </Typography.Text>
                  <Typography.Title level={5} className="app-topbar-title">
                    Commerce Overview
                  </Typography.Title>
                </div>
                <Flex align="center" gap={10} wrap="wrap">
                  <Button
                    onClick={() =>
                      setColorMode((prev) =>
                        prev === "light" ? "dark" : "light",
                      )
                    }
                  >
                    {colorMode === "light" ? "Dark mode" : "Light mode"}
                  </Button>
                  <Typography.Text type="secondary">
                    System healthy
                  </Typography.Text>
                </Flex>
              </Flex>
            </Card>

            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/orders" element={<OrdersPage />} />
                <Route path="/store" element={<StorePage />} />
              </Routes>
            </Suspense>
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
