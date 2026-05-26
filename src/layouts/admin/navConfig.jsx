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

export const navSections = [
  {
    key: "overview",
    label: "Overview",
    icon: <DashboardOutlined />,
    children: [
      { to: "/", label: "Dashboard", icon: <DashboardOutlined /> },
      { to: "/analytics", label: "Analytics", icon: <BarChartOutlined /> },
    ],
  },
  {
    key: "website",
    label: "Website",
    icon: <AppstoreOutlined />,
    children: [
      {
        to: "/store/website-builder",
        label: "Website Builder",
        icon: <AppstoreOutlined />,
      },
      { to: "/store", label: "Store Settings", icon: <ShopOutlined /> },
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
      { to: "/campaigns", label: "Campaigns", icon: <NotificationOutlined /> },
      {
        to: "/content-pages",
        label: "SEO & Content",
        icon: <FileTextOutlined />,
      },
    ],
  },
  {
    key: "sales",
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
    key: "b2b",
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

export const flatNavItems = navSections.flatMap((s) => s.children);
