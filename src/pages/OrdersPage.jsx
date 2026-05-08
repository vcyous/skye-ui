import { Button, Card, Col, Row, Select, Space, Tag, Typography } from "antd";
import { useEffect, useMemo, useState } from "react";
import { getOrders, updateOrderStatus } from "../services/api.js";

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

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OrdersPage() {
  const [selected, setSelected] = useState("semua_orders");
  const [orders, setOrders] = useState([]);

  const loadOrders = () => getOrders(selected).then(setOrders);

  useEffect(() => {
    loadOrders();
  }, [selected]);

  const totalValue = useMemo(
    () =>
      orders
        .reduce(
          (sum, order) => sum + Number(order.total ?? order.total_price),
          0,
        )
        .toFixed(2),
    [orders],
  );

  async function markAs(orderId, status) {
    await updateOrderStatus(orderId, status);
    await loadOrders();
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
          <Card title="Total Orders">{orders.length}</Card>
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
          <Typography.Text type="secondary">
            Switch filter to focus by process stage.
          </Typography.Text>
        </Space>
      </Card>

      <Row gutter={[12, 12]}>
        {orders.map((order) => (
          <Col xs={24} md={12} xl={8} key={order.id}>
            <Card title={order.orderNumber ?? order.order_number}>
              <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
                {order.customerName ?? order.customer_name}
              </Typography.Paragraph>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                {formatCurrency(order.total ?? order.total_price)}
              </Typography.Title>
              <Tag color="blue">{order.status}</Tag>
              <Space wrap style={{ marginTop: 12 }}>
                <Button onClick={() => markAs(order.id, "need_ship")}>
                  Need Ship
                </Button>
                <Button onClick={() => markAs(order.id, "ongoing_shipped")}>
                  Ship
                </Button>
                <Button onClick={() => markAs(order.id, "receive")}>
                  Receive
                </Button>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
}
