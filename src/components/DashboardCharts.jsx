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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "../shared/format";

export default function DashboardCharts({
  todaysSales,
  trendSeries,
  statusSeries,
  shippedShare,
}) {
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Revenue Trend</CardTitle>
          <span className="text-sm text-muted-foreground">
            {formatCurrency(todaysSales)} today
          </span>
        </CardHeader>
        <CardContent>
          <div className="h-56">
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
                  stroke="#0f172a"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#0f172a" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-44">
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
          <p className="mt-3">
            Shipped share: <strong>{shippedShare}%</strong>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
