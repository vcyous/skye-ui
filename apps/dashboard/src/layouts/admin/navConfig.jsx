import {
  ClipboardList,
  FolderOpen,
  LayoutDashboard,
  Package,
  Palette,
  Settings,
} from "lucide-react";

const iconClass = "size-4";

export const navItems = [
  {
    to: "/dashboard",
    label: "Beranda",
    icon: <LayoutDashboard className={iconClass} />,
    end: true,
  },
  {
    to: "/dashboard/products",
    label: "Produk",
    icon: <Package className={iconClass} />,
  },
  {
    to: "/dashboard/collections",
    label: "Koleksi",
    icon: <FolderOpen className={iconClass} />,
  },
  {
    to: "/dashboard/orders",
    label: "Order",
    icon: <ClipboardList className={iconClass} />,
  },
  {
    to: "/dashboard/theme",
    label: "Tema",
    icon: <Palette className={iconClass} />,
  },
  {
    to: "/dashboard/settings",
    label: "Pengaturan",
    icon: <Settings className={iconClass} />,
  },
];
