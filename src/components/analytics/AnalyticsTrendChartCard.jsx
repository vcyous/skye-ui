import { Card } from "antd";
import {
  CartesianGrid,
  Legend,
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

export default function AnalyticsTrendChartCard({ data = [] }) {
  return (
    <Card title="Trend Overview" style={{ height: "100%" }}>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 6, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#e6edf1" strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              stroke="#637381"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              yAxisId="left"
              stroke="#637381"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#637381"
              tickLine={false}
              axisLine={false}
              fontSize={12}
            />
            <Tooltip
              formatter={(value, name) => {
                if (name === "sales") {
                  return [formatCurrency(value), "Sales"];
                }
                return [
                  Number(value || 0),
                  name === "orders" ? "Orders" : "Visitors",
                ];
              }}
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #dce3e8",
                background: "#ffffff",
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="sales"
              stroke="#006c9c"
              strokeWidth={3}
              dot={false}
              name="sales"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="orders"
              stroke="#f27f0c"
              strokeWidth={2}
              dot={false}
              name="orders"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="visitors"
              stroke="#0f8b53"
              strokeWidth={2}
              dot={false}
              name="visitors"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
