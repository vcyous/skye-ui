import {
  BoxPlotOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Divider,
  List,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
      .then((data) => setState({ loading: false, data: data, error: "" }))
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
        <Space>
          <Spin />
          <Typography.Text>Loading dashboard...</Typography.Text>
        </Space>
      </Card>
    );
  }

  if (state.error || !state.data) {
    return <Card>{state.error || "No data"}</Card>;
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
    {
      name: "Not paid",
      value: data.topStatuses?.not_paid || 0,
      fill: "var(--amber)",
    },
    {
      name: "Need ship",
      value: data.topStatuses?.need_ship || 0,
      fill: "var(--horizon)",
    },
    {
      name: "Ongoing shipped",
      value: data.topStatuses?.ongoing_shipped || 0,
      fill: "var(--sage)",
    },
  ];

  const pipelineStages = [
    {
      label: "Awaiting payment",
      count: data.topStatuses?.not_paid || 0,
      color: "var(--amber)",
    },
    {
      label: "Ready to ship",
      count: data.topStatuses?.need_ship || 0,
      color: "var(--horizon)",
    },
    {
      label: "In transit",
      count: data.topStatuses?.ongoing_shipped || 0,
      color: "var(--sage)",
    },
  ];

  const quickActions = [
    { label: "Add a product", to: "/products", desc: "Expand your catalog" },
    {
      label: "Create a collection",
      to: "/collections",
      desc: "Organize products",
    },
    { label: "View orders", to: "/orders", desc: "Manage order lifecycle" },
    {
      label: "Customize your store",
      to: "/store/website-builder",
      desc: "Edit your storefront",
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Overview
          </Typography.Title>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            Today &mdash;{" "}
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Typography.Text>
        </div>
        <Space>
          <Link to="/orders">
            <Button>View orders</Button>
          </Link>
          <Link to="/products">
            <Button type="primary">Add product</Button>
          </Link>
        </Space>
      </div>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Total sales today"
            value={formatCurrency(data.todaysSales)}
            delta="+12.4%"
            icon={<DollarOutlined />}
            color="var(--sage)"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Gross revenue"
            value={formatCurrency(data.grossRevenue)}
            delta="+8.1%"
            icon={<ShoppingCartOutlined />}
            color="var(--horizon-ink)"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Total orders"
            value={formatNumber(data.orders || 0)}
            delta="+5.3%"
            icon={<ShoppingOutlined />}
            color="var(--sunset)"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <KpiCard
            title="Products"
            value={formatNumber(data.products || 0)}
            icon={<BoxPlotOutlined />}
            color="var(--amber)"
          />
        </Col>
      </Row>

      {pendingOrders.length > 0 && (
        <Card
          styles={{ body: { padding: "12px 16px" } }}
          style={{
            border: "1px solid var(--amber)",
            background: "var(--amber-soft)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 8,
            }}
          >
            <Space>
              <Tag color="warning" style={{ margin: 0 }}>
                Action needed
              </Tag>
              <Typography.Text strong style={{ color: "var(--amber-ink)" }}>
                {pendingOrders.length} order
                {pendingOrders.length > 1 ? "s" : ""} waiting to ship
              </Typography.Text>
            </Space>
            <Link to="/orders">
              <Button
                type="text"
                size="small"
                style={{ color: "var(--amber)" }}
              >
                View all →
              </Button>
            </Link>
          </div>
          <List
            size="small"
            dataSource={pendingOrders.slice(0, 3)}
            renderItem={(order) => (
              <List.Item
                style={{ padding: "4px 0", borderBottom: "none" }}
                extra={
                  <Link to={`/orders/${order.id}`}>
                    <Button size="small" type="primary">
                      Ship now
                    </Button>
                  </Link>
                }
              >
                <List.Item.Meta
                  title={
                    <Typography.Text style={{ fontSize: 13 }}>
                      #{order.orderNumber} &mdash;{" "}
                      {order.customerName ?? "Guest"}
                    </Typography.Text>
                  }
                />
              </List.Item>
            )}
          />

          {pendingOrders.length > 3 && (
            <Link to="/orders">
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                + {pendingOrders.length - 3} more orders
              </Typography.Text>
            </Link>
          )}
        </Card>
      )}

      <Suspense
        fallback={
          <Card>
            <Space>
              <Spin />
              <Typography.Text>Loading charts...</Typography.Text>
            </Space>
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

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card
            title="Order pipeline"
            styles={{ body: { padding: 0 } }}
            extra={
              <Link to="/orders">
                <Button type="text" size="small">
                  View all
                </Button>
              </Link>
            }
          >
            {pipelineStages.map((item, i) => (
              <div key={item.label}>
                {i > 0 && <Divider style={{ margin: 0 }} />}
                <div
                  style={{
                    padding: "12px 20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Space>
                    <div
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        background: item.color,
                      }}
                    />

                    <Typography.Text style={{ fontSize: 13 }}>
                      {item.label}
                    </Typography.Text>
                  </Space>
                  <Typography.Text strong style={{ fontSize: 13 }}>
                    {item.count}
                  </Typography.Text>
                </div>
              </div>
            ))}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Quick actions">
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              {quickActions.map((action) => (
                <Link to={action.to} key={action.to}>
                  <div
                    style={{
                      padding: "10px 12px",
                      border: "1px solid var(--line-strong)",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      cursor: "pointer",
                      transition: "border-color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = "var(--sage)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = "var(--line-strong)")
                    }
                  >
                    <Space direction="vertical" size={0}>
                      <Typography.Text strong style={{ fontSize: 13 }}>
                        {action.label}
                      </Typography.Text>
                      <Typography.Text
                        type="secondary"
                        style={{ fontSize: 12 }}
                      >
                        {action.desc}
                      </Typography.Text>
                    </Space>
                    <Typography.Text type="secondary">→</Typography.Text>
                  </div>
                </Link>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </section>
  );
}
