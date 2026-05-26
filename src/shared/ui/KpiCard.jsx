import { ArrowUpOutlined } from "@ant-design/icons";
import { Card, Space, Statistic, Typography } from "antd";

export default function KpiCard({ title, value, delta, icon, color }) {
  return (
    <Card styles={{ body: { padding: "16px 20px" } }}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 13, display: "block", marginBottom: 6 }}
          >
            {title}
          </Typography.Text>
          <Statistic
            value={value}
            valueStyle={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}
          />

          {delta && (
            <Space size={4} style={{ marginTop: 4 }}>
              <ArrowUpOutlined style={{ color: "var(--sage)", fontSize: 11 }} />
              <Typography.Text style={{ fontSize: 12, color: "var(--sage)" }}>
                {delta} vs last period
              </Typography.Text>
            </Space>
          )}
        </div>
        {icon ? (
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--white)",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
