import {
  Avatar,
  Badge,
  Button,
  Card,
  Flex,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLocalization } from "../../context/LocalizationContext.jsx";

export default function Topbar({
  isMobile,
  currentRouteLabel,
  onOpenMobileNav,
}) {
  const { user, store } = useAuth();
  const { t, activeLocale, settings, setLocale } = useLocalization();

  return (
    <Card className="app-topbar" styles={{ body: { padding: "10px 16px" } }}>
      <Flex justify="space-between" align="center" gap={12}>
        <Space size={10} align="center">
          {isMobile ? (
            <Button size="small" onClick={onOpenMobileNav}>
              Menu
            </Button>
          ) : null}
          <Space size={6} align="center">
            <div
              className="app-logo-mark"
              style={{ width: 28, height: 28, fontSize: "0.72rem" }}
            >
              SK
            </div>
            <Typography.Text strong style={{ fontSize: 14 }}>
              {isMobile ? currentRouteLabel : store?.name || "Skye"}
            </Typography.Text>
          </Space>
        </Space>

        <Flex align="center" gap={8} wrap="nowrap">
          <Tag color="processing" style={{ margin: 0 }}>
            {t("app.liveOps", "Live Ops")}
          </Tag>
          <Badge
            status="processing"
            text={t("app.realtimeSync", "Realtime sync")}
          />

          <Select
            size="small"
            value={activeLocale}
            style={{ minWidth: 100 }}
            onChange={(value) => setLocale(value, true)}
            options={(settings?.enabledLocales || ["id", "en"]).map((code) => ({
              value: code,
              label: code,
            }))}
          />

          <Avatar size="small" className="app-user-avatar">
            {String(user?.email || "U")
              .slice(0, 1)
              .toUpperCase()}
          </Avatar>
        </Flex>
      </Flex>
    </Card>
  );
}
