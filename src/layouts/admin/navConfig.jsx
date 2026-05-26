import {
  AppstoreOutlined,
  DashboardOutlined,
  DropboxOutlined,
  ProfileOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  TagsOutlined,
  TruckOutlined,
  UserOutlined,
} from "@ant-design/icons";

export const navSections = [
  {
    key: "overview",
    label: "Overview",
    icon: <DashboardOutlined />,
    children: [
      { to: "/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    ],
  },
  {
    key: "website",
    label: "Website",
    icon: <AppstoreOutlined />,
    children: [
      {
        to: "/dashboard/store/website-builder",
        label: "Website Builder",
        icon: <AppstoreOutlined />,
      },
      {
        to: "/dashboard/store",
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
      {
        to: "/dashboard/products",
        label: "Products",
        icon: <DropboxOutlined />,
      },
      {
        to: "/dashboard/collections",
        label: "Collections",
        icon: <TagsOutlined />,
      },
    ],
  },
  {
    key: "sales",
    label: "Sales & Orders",
    icon: <ShoppingCartOutlined />,
    children: [
      { to: "/dashboard/cart", label: "Cart", icon: <ShoppingOutlined /> },
      { to: "/dashboard/orders", label: "Orders", icon: <ProfileOutlined /> },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    icon: <TruckOutlined />,
    children: [
      { to: "/dashboard/shipping", label: "Shipping", icon: <TruckOutlined /> },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: <SettingOutlined />,
    children: [
      { to: "/dashboard/profile", label: "Profile", icon: <UserOutlined /> },
    ],
  },
];

export const flatNavItems = navSections.flatMap((s) => s.children);
