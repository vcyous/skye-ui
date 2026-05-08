import {
  Card,
  Col,
  Descriptions,
  List,
  Row,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getOrderDetail } from "../services/api.js";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    getOrderDetail(orderId)
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((err) =>
        setState({
          loading: false,
          data: null,
          error: err.message || "Failed to load order.",
        }),
      );
  }, [orderId]);

  if (state.loading) {
    return <Card>Loading order detail...</Card>;
  }

  if (state.error) {
    return <Card>{state.error}</Card>;
  }

  const order = state.data;
  const columns = [
    { title: "Product", dataIndex: "productTitle", key: "productTitle" },
    { title: "Variant", dataIndex: "variantTitle", key: "variantTitle" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    { title: "Qty", dataIndex: "quantity", key: "quantity" },
    {
      title: "Unit Price",
      dataIndex: "unitPrice",
      key: "unitPrice",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Line Total",
      dataIndex: "lineTotal",
      key: "lineTotal",
      render: (value) => formatCurrency(value),
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Order {order.orderNumber}
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Track customer, items, totals, and timeline in one place.
        </Typography.Text>
      </header>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Order Items">
            <Table
              rowKey="id"
              columns={columns}
              dataSource={order.items}
              pagination={false}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Order Summary">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Status">
                <Tag color="blue">{order.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Payment">
                <Tag>{order.paymentStatus}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Customer">
                {order.customerName}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {order.customerEmail || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {order.customerPhone || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Subtotal">
                {formatCurrency(order.subtotalAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Discount">
                {formatCurrency(order.discountAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Shipping">
                {formatCurrency(order.shippingAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Tax">
                {formatCurrency(order.taxAmount)}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                {formatCurrency(order.totalAmount)}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Shipping Address">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Name">
                {order.shippingAddress.fullName || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {order.shippingAddress.addressLine1 || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="City">
                {order.shippingAddress.city || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Postal Code">
                {order.shippingAddress.postalCode || "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Country">
                {order.shippingAddress.country || "-"}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Timeline">
            <List
              dataSource={order.timeline}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={`${item.status} · ${new Date(item.createdAt).toLocaleString()}`}
                    description={item.note || "No note"}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="Invoice">
            {order.invoice ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Invoice Number">
                  {order.invoice.invoiceNumber}
                </Descriptions.Item>
                <Descriptions.Item label="Subtotal">
                  {formatCurrency(order.invoice.subtotal)}
                </Descriptions.Item>
                <Descriptions.Item label="Tax">
                  {formatCurrency(order.invoice.taxAmount)}
                </Descriptions.Item>
                <Descriptions.Item label="Discount">
                  {formatCurrency(order.invoice.discountAmount)}
                </Descriptions.Item>
                <Descriptions.Item label="Total">
                  {formatCurrency(order.invoice.total)}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Typography.Text type="secondary">
                No invoice generated yet.
              </Typography.Text>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Transactions">
            <List
              dataSource={order.transactions}
              locale={{ emptyText: "No transactions yet." }}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={`${item.paymentMethodName} · ${formatCurrency(item.amount)}`}
                    description={`${item.status} · ${item.gatewayTransactionId || "No gateway id"}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Shipments">
            <List
              dataSource={order.shipments}
              locale={{ emptyText: "No shipments yet." }}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={`${item.shippingMethodName} · ${item.status}`}
                    description={`${item.carrier || "No carrier"} · ${item.trackingNumber || "No tracking"}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="Returns">
            <List
              dataSource={order.returns}
              locale={{ emptyText: "No returns recorded." }}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={`${item.rmaNumber} · ${item.status}`}
                    description={item.reason || "No reason provided"}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Refunds">
            <List
              dataSource={order.refunds}
              locale={{ emptyText: "No refunds processed." }}
              renderItem={(item) => (
                <List.Item key={item.id}>
                  <List.Item.Meta
                    title={`${formatCurrency(item.amount)} · ${item.status}`}
                    description={new Date(item.createdAt).toLocaleString()}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </section>
  );
}
