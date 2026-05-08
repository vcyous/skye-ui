import { Card, Col, Row, Typography } from "antd";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DashboardCharts({
  todaysSales,
  trendSeries,
  statusSeries,
  shippedShare,
}) {
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} lg={16}>
        <Card
          title="Revenue Trend"
          extra={
            <Typography.Text type="secondary">
              {formatCurrency(todaysSales)} today
            </Typography.Text>
          }
        >
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendSeries}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid stroke="#e6edf1" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  stroke="#637381"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  stroke="#637381"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  tickFormatter={(value) => `$${Math.round(value)}`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #dce3e8",
                    background: "#ffffff",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="#006c9c"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#006c9c" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Col>
      <Col xs={24} lg={8}>
        <Card title="Order Pipeline">
          <div style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={statusSeries}
                margin={{ top: 8, right: 6, left: -16, bottom: 0 }}
                layout="vertical"
              >
                <CartesianGrid
                  stroke="#e6edf1"
                  strokeDasharray="3 3"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#637381"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#637381"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  width={100}
                />
                <Tooltip
                  formatter={(value) => [value, "Orders"]}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #dce3e8",
                    background: "#ffffff",
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 8, 8]}>
                  {statusSeries.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Typography.Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
            Shipped share: <strong>{shippedShare}%</strong>
          </Typography.Paragraph>
        </Card>
      </Col>
    </Row>
  );
}
