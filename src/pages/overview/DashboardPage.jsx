import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Box, DollarSign, Loader2, ShoppingBag, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocalization } from "../../context/LocalizationContext";
import { getDashboardSummary, getOrders } from "../../services/api";
import KpiCard from "../../shared/ui/KpiCard";

const DashboardCharts = lazy(
  () => import("../../components/DashboardCharts.jsx"),
);

export default function DashboardPage() {
  const { formatCurrency, formatNumber } = useLocalization();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [pendingOrders, setPendingOrders] = useState([]);

  useEffect(() => {
    getDashboardSummary()
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((err) =>
        setState({
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : "Failed",
        }),
      );
    getOrders("need_ship")
      .then((rows) => setPendingOrders(rows))
      .catch(() => null);
  }, []);

  if (state.loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-4">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <span className="text-sm">Loading dashboard...</span>
        </CardContent>
      </Card>
    );
  }

  if (state.error || !state.data) {
    return (
      <Card>
        <CardContent className="p-4">{state.error || "No data"}</CardContent>
      </Card>
    );
  }

  const { data } = state;

  const totalPipeline =
    (data.topStatuses?.not_paid || 0) +
    (data.topStatuses?.need_ship || 0) +
    (data.topStatuses?.ongoing_shipped || 0);

  const shippedShare = totalPipeline
    ? Math.round(
        ((data.topStatuses?.ongoing_shipped || 0) / totalPipeline) * 100,
      )
    : 0;

  const trendSeries = [
    { day: "Sun", sales: Number(data.todaysSales) * 0.56 },
    { day: "Mon", sales: Number(data.todaysSales) * 0.69 },
    { day: "Tue", sales: Number(data.todaysSales) * 0.73 },
    { day: "Wed", sales: Number(data.todaysSales) * 0.82 },
    { day: "Thu", sales: Number(data.todaysSales) * 0.94 },
    { day: "Fri", sales: Number(data.todaysSales) * 1.06 },
    { day: "Sat", sales: Number(data.todaysSales) },
  ];

  const statusSeries = [
    { name: "Not paid", value: data.topStatuses?.not_paid || 0, fill: "#d97706" },
    { name: "Need ship", value: data.topStatuses?.need_ship || 0, fill: "#eab308" },
    {
      name: "Ongoing shipped",
      value: data.topStatuses?.ongoing_shipped || 0,
      fill: "#059669",
    },
  ];

  const pipelineStages = [
    { label: "Awaiting payment", count: data.topStatuses?.not_paid || 0, color: "bg-amber-500" },
    { label: "Ready to ship", count: data.topStatuses?.need_ship || 0, color: "bg-yellow-500" },
    { label: "In transit", count: data.topStatuses?.ongoing_shipped || 0, color: "bg-emerald-500" },
  ];

  const quickActions = [
    { label: "Add a product", to: "/products", desc: "Expand your catalog" },
    { label: "Create a collection", to: "/collections", desc: "Organize products" },
    { label: "View orders", to: "/orders", desc: "Manage order lifecycle" },
    {
      label: "Customize your store",
      to: "/store/website-builder",
      desc: "Edit your storefront",
    },
  ];

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Overview</h2>
          <p className="text-xs text-muted-foreground">
            Today —{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/orders">
            <Button variant="outline">View orders</Button>
          </Link>
          <Link to="/products">
            <Button>Add product</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Total sales today"
          value={formatCurrency(data.todaysSales)}
          delta="+12.4%"
          icon={<DollarSign className="size-5" />}
          color="#059669"
        />
        <KpiCard
          title="Gross revenue"
          value={formatCurrency(data.grossRevenue)}
          delta="+8.1%"
          icon={<ShoppingCart className="size-5" />}
          color="#0f172a"
        />
        <KpiCard
          title="Total orders"
          value={formatNumber(data.orders || 0)}
          delta="+5.3%"
          icon={<ShoppingBag className="size-5" />}
          color="#f59e0b"
        />
        <KpiCard
          title="Products"
          value={formatNumber(data.products || 0)}
          icon={<Box className="size-5" />}
          color="#d97706"
        />
      </div>

      {pendingOrders.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                  Action needed
                </Badge>
                <span className="font-semibold text-amber-900">
                  {pendingOrders.length} order
                  {pendingOrders.length > 1 ? "s" : ""} waiting to ship
                </span>
              </div>
              <Link to="/orders">
                <Button variant="ghost" size="sm" className="text-amber-900">
                  View all →
                </Button>
              </Link>
            </div>
            <ul className="space-y-1">
              {pendingOrders.slice(0, 3).map((order) => (
                <li
                  key={order.id}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm">
                    #{order.orderNumber} — {order.customerName ?? "Guest"}
                  </span>
                  <Link to={`/orders/${order.id}`}>
                    <Button size="sm">Ship now</Button>
                  </Link>
                </li>
              ))}
            </ul>
            {pendingOrders.length > 3 && (
              <Link to="/orders">
                <span className="text-xs text-muted-foreground">
                  + {pendingOrders.length - 3} more orders
                </span>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <Suspense
        fallback={
          <Card>
            <CardContent className="flex items-center gap-2 p-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
              <span className="text-sm">Loading charts...</span>
            </CardContent>
          </Card>
        }
      >
        <DashboardCharts
          todaysSales={data.todaysSales}
          trendSeries={trendSeries}
          statusSeries={statusSeries}
          shippedShare={shippedShare}
        />
      </Suspense>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Order pipeline</CardTitle>
            <Link to="/orders">
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            {pipelineStages.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between px-5 py-3 ${
                  i > 0 ? "border-t" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`size-2 rounded-full ${item.color}`} />
                  <span className="text-sm">{item.label}</span>
                </div>
                <span className="text-sm font-semibold">{item.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {quickActions.map((action) => (
                <Link to={action.to} key={action.to}>
                  <div className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:border-foreground/40">
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">
                        {action.label}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {action.desc}
                      </span>
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
