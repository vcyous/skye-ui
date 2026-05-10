import {
  Alert,
  Card,
  Col,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocalization } from "../context/LocalizationContext.jsx";
import {
  getOrderLifecycleOptions,
  getOrders,
  updateOrderLifecycleState,
} from "../services/api.js";

const statuses = [
  "semua_orders",
  "not_paid",
  "need_ship",
  "ongoing_shipped",
  "receive",
  "pending",
  "cancelled",
  "failed_delivery",
];

export default function OrdersPage() {
  const { formatCurrency } = useLocalization();
  const [selected, setSelected] = useState("semua_orders");
  const [search, setSearch] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState("");

  const loadOrders = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getOrders(selected);
      setOrders(data);
    } catch (err) {
      setError(err.message || "Failed to load orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [selected]);

  const visibleOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return orders;
    }

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

  const totalValue = useMemo(
    () =>
      visibleOrders
        .reduce(
          (sum, order) =>
            sum +
            Number(order.displayTotal ?? order.total ?? order.total_price),
          0,
        )
        .toFixed(2),
    [visibleOrders],
  );

  async function updateLifecycle(order, patch) {
    setUpdatingId(order.id);
    try {
      await updateOrderLifecycleState(order.id, patch);
      await loadOrders();
      message.success("Order lifecycle updated.");
    } catch (err) {
      message.error(err.message || "Failed to update order lifecycle.");
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Orders
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Manage order lifecycle and keep shipment execution under control.
        </Typography.Text>
      </header>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card title="Total Orders">{visibleOrders.length}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Total Value">{formatCurrency(totalValue)}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Selected Filter">{selected}</Card>
        </Col>
      </Row>

      <Card>
        <Space wrap>
          <Typography.Text strong>Status</Typography.Text>
          <Select
            value={selected}
            onChange={(value) => setSelected(value)}
            options={statuses.map((status) => ({
              value: status,
              label: status,
            }))}
            style={{ width: 220 }}
          />
          <Input
            allowClear
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search order, customer, or status"
            style={{ width: 280 }}
          />
        </Space>
      </Card>

      {error ? <Alert type="error" message={error} showIcon /> : null}

      {loading ? (
        <Card>
          <Spin />
        </Card>
      ) : (
        <Row gutter={[12, 12]}>
          {visibleOrders.map((order) => {
            const options = getOrderLifecycleOptions({
              status: order.status,
              paymentStatus: order.paymentStatus,
              fulfillmentStatus: order.fulfillmentStatus,
            });

            return (
              <Col xs={24} md={12} xl={8} key={order.id}>
                <Card title={order.orderNumber ?? order.order_number}>
                  <Typography.Paragraph
                    type="secondary"
                    style={{ marginTop: -8 }}
                  >
                    {order.customerName ?? order.customer_name}
                  </Typography.Paragraph>
                  <Typography.Title level={4} style={{ marginTop: 0 }}>
                    {formatCurrency(
                      order.displayTotal ?? order.total ?? order.total_price,
                      order.displayCurrencyCode || order.currencyCode || "USD",
                    )}
                  </Typography.Title>
                  <Tag color="blue">{order.status}</Tag>
                  <Tag color="gold">{order.paymentStatus || "pending"}</Tag>
                  <Tag color="green">
                    {order.fulfillmentStatus || "unfulfilled"}
                  </Tag>
                  {order.subscriptionId ? (
                    <Tag color="purple">
                      {order.isSubscriptionRenewal
                        ? "Subscription renewal"
                        : "Subscription"}
                    </Tag>
                  ) : null}
                  {order.subscriptionStatus ? (
                    <Tag>{order.subscriptionStatus}</Tag>
                  ) : null}
                  <Space
                    direction="vertical"
                    style={{ width: "100%", marginTop: 12 }}
                  >
                    <Space wrap>
                      <Typography.Text type="secondary">Order</Typography.Text>
                      <Select
                        size="small"
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(value) =>
                          updateLifecycle(order, {
                            status: value,
                            note: `Order status changed from ${order.status} to ${value}`,
                          })
                        }
                        options={options.status.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                        style={{ width: 180 }}
                      />
                    </Space>
                    <Space wrap>
                      <Typography.Text type="secondary">
                        Payment
                      </Typography.Text>
                      <Select
                        size="small"
                        value={order.paymentStatus || "pending"}
                        disabled={updatingId === order.id}
                        onChange={(value) =>
                          updateLifecycle(order, {
                            paymentStatus: value,
                            note: `Payment status changed to ${value}`,
                          })
                        }
                        options={options.paymentStatus.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                        style={{ width: 180 }}
                      />
                    </Space>
                    <Space wrap>
                      <Typography.Text type="secondary">
                        Fulfillment
                      </Typography.Text>
                      <Select
                        size="small"
                        value={order.fulfillmentStatus || "unfulfilled"}
                        disabled={updatingId === order.id}
                        onChange={(value) =>
                          updateLifecycle(order, {
                            fulfillmentStatus: value,
                            note: `Fulfillment status changed to ${value}`,
                          })
                        }
                        options={options.fulfillmentStatus.map((item) => ({
                          value: item,
                          label: item,
                        }))}
                        style={{ width: 180 }}
                      />
                    </Space>
                    <Link to={`/orders/${order.id}`}>View Detail</Link>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </section>
  );
}
