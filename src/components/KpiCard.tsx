import { Card, Flex, Statistic, Tag, Typography } from "antd";

interface KpiCardProps {
  title: React.ReactNode;
  value: string | number;
  delta?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function KpiCard({ title, value, delta, icon }: KpiCardProps) {
  return (
    <Card>
      <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
        <Typography.Text
          type="secondary"
          style={{ textTransform: "uppercase", fontWeight: 700 }}
        >
          {title}
        </Typography.Text>
        <Tag color="cyan">{icon}</Tag>
      </Flex>
      <Statistic value={value} valueStyle={{ fontSize: 26, fontWeight: 800 }} />
      <Typography.Text style={{ color: "#0f8b53", fontWeight: 700 }}>
        {delta}
      </Typography.Text>
    </Card>
  );
}
