import {
  ExportOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocalization } from "../../context/LocalizationContext";
import {
  getOrderLifecycleOptions,
  getOrders,
  updateOrderLifecycleState,
} from "../../services/api";
import type { OrderSummary } from "../../services/orderService";

const STATUS_TABS = [
  { key: "semua_orders", label: "All" },
  { key: "not_paid", label: "Unpaid" },
  { key: "need_ship", label: "Unfulfilled" },
  { key: "ongoing_shipped", label: "In transit" },
  { key: "receive", label: "Delivered" },
  { key: "cancelled", label: "Cancelled" },
];

const PAYMENT_TAG: Record<string, { color: string; label: string }> = {
  paid: { color: "success", label: "Paid" },
  pending: { color: "warning", label: "Pending" },
  refunded: { color: "default", label: "Refunded" },
  failed: { color: "error", label: "Failed" },
};

const FULFILLMENT_TAG: Record<string, { color: string; label: string }> = {
  fulfilled: { color: "success", label: "Fulfilled" },
  unfulfilled: { color: "warning", label: "Unfulfilled" },
  partial: { color: "processing", label: "Partial" },
  shipped: { color: "processing", label: "Shipped" },
};

export default function OrdersPage() {
  const { formatCurrency } = useLocalization();
  const { message } = App.useApp();
  const [selected, setSelected] = useState<string>("semua_orders");
  const [search, setSearch] = useState<string>("");
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [updatingId, setUpdatingId] = useState<string>("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOrders(selected);
      setOrders(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [selected]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => {
      const haystack = [
        order.orderNumber,
        order.customerName,
        order.status,
        order.paymentStatus,
        order.fulfillmentStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(term);
    });
  }, [orders, search]);

  async function updateLifecycle(order: OrderSummary, patch: Record<string, string>) {
    setUpdatingId(order.id);
    try {
      await updateOrderLifecycleState(order.id, patch);
      await loadOrders();
      message.success("Order updated.");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "Failed to update order.");
    } finally {
      setUpdatingId("");
    }
  }

  const columns: ColumnsType<OrderSummary> = [
    {
      title: "Order",
      key: "order",
      render: (_: unknown, record: OrderSummary) => (
        <Link
          to={`/orders/${record.id}`}
          style={{ fontWeight: 500, color: "#0D5C53" }}
        >
          #{record.orderNumber ?? record.order_number}
        </Link>
      ),
    },
    {
      title: "Date",
      key: "date",
      render: (_: unknown, record: OrderSummary) => {
        const raw = record.created_at ?? record.createdAt;
        if (!raw) return "—";
        return (
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {new Date(raw).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Typography.Text>
        );
      },
    },
    {
      title: "Customer",
      key: "customer",
      render: (_: unknown, record: OrderSummary) => (
        <Typography.Text style={{ fontSize: 13 }}>
          {record.customerName ?? record.customer_name ?? "Guest"}
        </Typography.Text>
      ),
    },
    {
      title: "Total",
      key: "total",
      render: (_: unknown, record: OrderSummary) => (
        <Typography.Text strong style={{ fontSize: 13 }}>
          {formatCurrency(
            record.displayTotal ?? record.total ?? record.total_price,
            record.displayCurrencyCode || record.currencyCode || "USD",
          )}
        </Typography.Text>
      ),
    },
    {
      title: "Payment",
      key: "payment",
      render: (_: unknown, record: OrderSummary) => {
        const info = PAYMENT_TAG[record.paymentStatus || "pending"] ?? { color: "default", label: record.paymentStatus || "Pending" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "Fulfillment",
      key: "fulfillment",
      render: (_: unknown, record: OrderSummary) => {
        const info = FULFILLMENT_TAG[record.fulfillmentStatus || "unfulfilled"] ?? { color: "default", label: record.fulfillmentStatus || "Unfulfilled" };
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, record: OrderSummary) => {
        const options = getOrderLifecycleOptions({
          status: record.status,
          paymentStatus: record.paymentStatus,
          fulfillmentStatus: record.fulfillmentStatus,
        });
        return (
          <Select
            size="small"
            value={record.status}
            disabled={updatingId === record.id}
            loading={updatingId === record.id}
            onChange={(value) =>
              updateLifecycle(record, {
                status: value,
                note: `Status changed from ${record.status} to ${value}`,
              })
            }
            options={options.status.map((item) => ({ value: item, label: item }))}
            style={{ width: 150 }}
          />
        );
      },
    },
    {
      title: "",
      key: "actions",
      width: 80,
      render: (_: unknown, record: OrderSummary) => (
        <Link to={`/orders/${record.id}`}>
          <Button type="link" size="small" style={{ padding: 0, fontSize: 13 }}>
            View
          </Button>
        </Link>
      ),
    },
  ];

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { semua_orders: orders.length };
    for (const o of orders) {
      if (o.paymentStatus === "pending" || o.paymentStatus === "not_paid") {
        counts["not_paid"] = (counts["not_paid"] || 0) + 1;
      }
      if (o.fulfillmentStatus === "unfulfilled") {
        counts["need_ship"] = (counts["need_ship"] || 0) + 1;
      }
    }
    return counts;
  }, [orders]);

  return (
    <section style={{ display: "grid", gap: 0 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Orders
        </Typography.Title>
        <Space>
          <Button icon={<ExportOutlined />}>Export</Button>
        </Space>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          showIcon
          style={{ marginBottom: 12 }}
          action={<Button size="small" onClick={loadOrders}>Retry</Button>}
        />
      )}

      <Card bodyStyle={{ padding: 0 }}>
        {/* Status tabs */}
        <div style={{ borderBottom: "1px solid #f0f0f0", paddingLeft: 16 }}>
          <Tabs
            activeKey={selected}
            onChange={setSelected}
            size="small"
            items={STATUS_TABS.map((tab) => ({
              key: tab.key,
              label: (
                <span>
                  {tab.label}
                  {tabCounts[tab.key] != null && (
                    <span style={{ marginLeft: 6, color: "#999", fontSize: 12 }}>
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </span>
              ),
            }))}
          />
        </div>

        {/* Filter bar */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 8, alignItems: "center" }}>
          <Input
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Search orders"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
          <div style={{ marginLeft: "auto" }}>
            <Badge count={visibleOrders.length} showZero color="#8c8c8c" overflowCount={9999}>
              <Typography.Text type="secondary" style={{ fontSize: 13, paddingRight: 8 }}>
                orders
              </Typography.Text>
            </Badge>
          </div>
        </div>

        <Table
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={visibleOrders}
          pagination={{
            pageSize: 20,
            showSizeChanger: false,
            showTotal: (total) => `${total} orders`,
          }}
          size="middle"
          locale={{
            emptyText: (
              <div style={{ padding: "32px 0" }}>
                <Typography.Text type="secondary">No orders found</Typography.Text>
              </div>
            ),
          }}
        />
      </Card>
    </section>
  );
}
