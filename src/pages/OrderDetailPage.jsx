import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useLocalization } from "../context/LocalizationContext.jsx";
import {
  addOrderInternalNote,
  getOrderDetail,
  getOrderLifecycleOptions,
  updateOrderLifecycleState,
} from "../services/api.js";

export default function OrderDetailPage() {
  const { formatCurrency, formatDate } = useLocalization();
  const { orderId } = useParams();
  const [state, setState] = useState({ loading: true, data: null, error: "" });
  const [saving, setSaving] = useState(false);
  const [internalNote, setInternalNote] = useState("");

  const loadOrder = () => {
    getOrderDetail(orderId)
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((err) =>
        setState({
          loading: false,
          data: null,
          error: err.message || "Failed to load order.",
        }),
      );
  };

  useEffect(() => {
    setState({ loading: true, data: null, error: "" });
    loadOrder();
  }, [orderId]);

  async function applyLifecyclePatch(patch) {
    setSaving(true);
    try {
      await updateOrderLifecycleState(orderId, patch);
      await loadOrder();
      message.success("Order lifecycle updated.");
    } catch (err) {
      message.error(err.message || "Failed to update order lifecycle.");
    } finally {
      setSaving(false);
    }
  }

  async function submitInternalNote() {
    const text = internalNote.trim();
    if (!text) {
      message.warning("Please enter an internal note first.");
      return;
    }

    setSaving(true);
    try {
      await addOrderInternalNote(orderId, text);
      setInternalNote("");
      await loadOrder();
      message.success("Internal note added.");
    } catch (err) {
      message.error(err.message || "Failed to add internal note.");
    } finally {
      setSaving(false);
    }
  }

  if (state.loading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  if (state.error) {
    return <Alert type="error" showIcon message={state.error} />;
  }

  const order = state.data;
  const lifecycleOptions = getOrderLifecycleOptions({
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
  });
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
          <Card title="Lifecycle Controls" style={{ marginBottom: 16 }}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Space wrap>
                <Typography.Text strong>Order Status</Typography.Text>
                <Select
                  style={{ width: 240 }}
                  value={order.status}
                  disabled={saving}
                  onChange={(value) =>
                    applyLifecyclePatch({
                      status: value,
                      note: `Order status changed from ${order.status} to ${value}`,
                    })
                  }
                  options={lifecycleOptions.status.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
              </Space>
              <Space wrap>
                <Typography.Text strong>Payment Status</Typography.Text>
                <Select
                  style={{ width: 240 }}
                  value={order.paymentStatus}
                  disabled={saving}
                  onChange={(value) =>
                    applyLifecyclePatch({
                      paymentStatus: value,
                      note: `Payment status changed to ${value}`,
                    })
                  }
                  options={lifecycleOptions.paymentStatus.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
              </Space>
              <Space wrap>
                <Typography.Text strong>Fulfillment Status</Typography.Text>
                <Select
                  style={{ width: 240 }}
                  value={order.fulfillmentStatus || "unfulfilled"}
                  disabled={saving}
                  onChange={(value) =>
                    applyLifecyclePatch({
                      fulfillmentStatus: value,
                      note: `Fulfillment status changed to ${value}`,
                    })
                  }
                  options={lifecycleOptions.fulfillmentStatus.map((item) => ({
                    value: item,
                    label: item,
                  }))}
                />
              </Space>
              <Input.TextArea
                rows={3}
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
                placeholder="Add internal note to timeline"
              />
              <Button onClick={submitInternalNote} loading={saving}>
                Add Internal Note
              </Button>
            </Space>
          </Card>

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
              <Descriptions.Item label="Fulfillment">
                <Tag color="green">
                  {order.fulfillmentStatus || "unfulfilled"}
                </Tag>
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
                {formatCurrency(
                  order.displaySubtotalAmount ?? order.subtotalAmount,
                  order.displayCurrencyCode || order.currencyCode || "USD",
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Discount">
                {formatCurrency(
                  order.displayDiscountAmount ?? order.discountAmount,
                  order.displayCurrencyCode || order.currencyCode || "USD",
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Shipping">
                {formatCurrency(
                  order.displayShippingAmount ?? order.shippingAmount,
                  order.displayCurrencyCode || order.currencyCode || "USD",
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Tax">
                {formatCurrency(
                  order.displayTaxAmount ?? order.taxAmount,
                  order.displayCurrencyCode || order.currencyCode || "USD",
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Total">
                {formatCurrency(
                  order.displayTotalAmount ?? order.totalAmount,
                  order.displayCurrencyCode || order.currencyCode || "USD",
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Display Currency">
                <Tag>
                  {order.displayCurrencyCode || order.currencyCode || "USD"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="FX Snapshot">
                {order.currencySnapshot
                  ? `${order.currencySnapshot.fxRate} (${order.currencySnapshot.fxSource})`
                  : "Not available"}
              </Descriptions.Item>
              <Descriptions.Item label="Subscription Context">
                {order.subscriptionContext ? (
                  <Space direction="vertical" size={0}>
                    <Typography.Text>
                      {order.subscriptionContext.planName || "Subscription"}
                    </Typography.Text>
                    <Space>
                      <Tag>
                        {order.subscriptionContext.isRenewal
                          ? "renewal"
                          : "first charge"}
                      </Tag>
                      <Tag>{order.subscriptionContext.status}</Tag>
                    </Space>
                    <Typography.Text type="secondary">
                      Next billing:{" "}
                      {order.subscriptionContext.nextBillingAt
                        ? formatDate(order.subscriptionContext.nextBillingAt, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "-"}
                    </Typography.Text>
                  </Space>
                ) : (
                  "Not a subscription order"
                )}
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
                    title={`${item.status} · ${formatDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}`}
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
                  {formatCurrency(
                    order.invoice.subtotal,
                    order.displayCurrencyCode || order.currencyCode || "USD",
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Taxable Amount">
                  {formatCurrency(
                    order.invoice.taxableAmount,
                    order.displayCurrencyCode || order.currencyCode || "USD",
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Tax Behavior">
                  <Tag
                    color={
                      order.invoice.taxBehavior === "inclusive"
                        ? "gold"
                        : "blue"
                    }
                  >
                    {order.invoice.taxBehavior}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Tax Rate">
                  {Number(order.invoice.taxRate || 0).toFixed(2)}%
                </Descriptions.Item>
                <Descriptions.Item label="Tax">
                  {formatCurrency(
                    order.invoice.taxAmount,
                    order.displayCurrencyCode || order.currencyCode || "USD",
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Discount">
                  {formatCurrency(
                    order.invoice.discountAmount,
                    order.displayCurrencyCode || order.currencyCode || "USD",
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Invoice Status">
                  <Tag>{order.invoice.status || "issued"}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Total">
                  {formatCurrency(
                    order.invoice.total,
                    order.displayCurrencyCode || order.currencyCode || "USD",
                  )}
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
                    title={`${item.paymentMethodName} · ${formatCurrency(item.amount, item.currencyCode || order.displayCurrencyCode || "USD")}`}
                    description={`${item.status} · ref ${item.gatewayTransactionId || "-"} · attempts ${item.attemptCount || 0}${
                      item.failureCode ? ` · ${item.failureCode}` : ""
                    }`}
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
                    description={`${item.reason || "No reason provided"} · ${String(item.reasonCode || "other").replaceAll("_", " ")}`}
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
                    title={`${formatCurrency(item.amount, order.displayCurrencyCode || order.currencyCode || "USD")} · ${item.status} · ${item.refundType || "partial"}`}
                    description={`${formatDate(item.createdAt, { dateStyle: "medium", timeStyle: "short" })}${item.note ? ` · ${item.note}` : ""}`}
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
