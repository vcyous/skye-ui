import { Badge, Button, Menu, Space, Typography } from "antd";
import { NavLink } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLocalization } from "../../context/LocalizationContext.jsx";
import { flatNavItems, navSections } from "./navConfig";

export default function Sidebar({
  activeMenuKey,
  openKeys,
  onOpenChange,
  onLogout,
}) {
  const { user, store } = useAuth();
  const { t } = useLocalization();

  const menuItems = navSections.map((section) => ({
    key: section.key,
    label: section.label,
    icon: section.icon,
    children: section.children.map((link) => ({
      key: link.to,
      label: <NavLink to={link.to}>{link.label}</NavLink>,
      icon: link.icon,
    })),
  }));

  return (
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
        onOpenChange={onOpenChange}
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
}

export { flatNavItems };
