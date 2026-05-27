import {
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  Package,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  User,
} from "lucide-react";

const iconClass = "size-4";

export const navSections = [
  {
    key: "overview",
    label: "Overview",
    icon: <LayoutDashboard className={iconClass} />,
    children: [
      {
        to: "/dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className={iconClass} />,
      },
    ],
  },
  {
    key: "website",
    label: "Website",
    icon: <LayoutGrid className={iconClass} />,
    children: [
      {
        to: "/dashboard/store/website-builder",
        label: "Website Builder",
        icon: <LayoutGrid className={iconClass} />,
      },
      {
        to: "/dashboard/store",
        label: "Store Settings",
        icon: <Store className={iconClass} />,
      },
    ],
  },
  {
    key: "catalog",
    label: "Catalog",
    icon: <LayoutGrid className={iconClass} />,
    children: [
      {
        to: "/dashboard/products",
        label: "Products",
        icon: <Package className={iconClass} />,
      },
      {
        to: "/dashboard/collections",
        label: "Collections",
        icon: <Tags className={iconClass} />,
      },
    ],
  },
  {
    key: "sales",
    label: "Sales & Orders",
    icon: <ShoppingCart className={iconClass} />,
    children: [
      {
        to: "/dashboard/cart",
        label: "Cart",
        icon: <ShoppingBag className={iconClass} />,
      },
      {
        to: "/dashboard/orders",
        label: "Orders",
        icon: <ClipboardList className={iconClass} />,
      },
    ],
  },
  {
    key: "operations",
    label: "Operations",
    icon: <Truck className={iconClass} />,
    children: [
      {
        to: "/dashboard/shipping",
        label: "Shipping",
        icon: <Truck className={iconClass} />,
      },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    icon: <Settings className={iconClass} />,
    children: [
      {
        to: "/dashboard/profile",
        label: "Profile",
        icon: <User className={iconClass} />,
      },
    ],
  },
];

export const flatNavItems = navSections.flatMap((s) => s.children);
