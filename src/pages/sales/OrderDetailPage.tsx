import {
  ArrowLeftOutlined,
  CarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from "@ant-design/icons";
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useLocalization } from "../../context/LocalizationContext";
import {
  addOrderInternalNote,
  createShipment,
  getOrderDetail,
  getOrderFulfillmentItems,
  getOrderLifecycleOptions,
  updateOrderLifecycleState,
} from "../../services/api";
import type { OrderDetail } from "../../services/orderService";
import type { FulfillmentItem } from "../../services/shippingService";

interface ShipmentFormValues {
  carrier: string;
  trackingNumber: string;
  note?: string;
}

const FULFILLMENT_STATUS_BADGE: Record<string, "success" | "warning" | "processing" | "default"> = {
  fulfilled: "success",
  unfulfilled: "warning",
  partial: "processing",
  shipped: "processing",
};

export default function OrderDetailPage() {
  const { formatCurrency } = useLocalization();
  const { message } = App.useApp();
  const { orderId } = useParams<{ orderId: string }>();
  const [state, setState] = useState<{
    loading: boolean;
    data: OrderDetail | null;
    error: string;
  }>({ loading: true, data: null, error: "" });
  const [saving, setSaving] = useState<boolean>(false);
  const [internalNote, setInternalNote] = useState<string>("");
  const [fulfillmentItems, setFulfillmentItems] = useState<FulfillmentItem[]>([]);
  const [shipmentModalOpen, setShipmentModalOpen] = useState<boolean>(false);
  const [isShipping, setIsShipping] = useState<boolean>(false);
  const [shipmentForm] = Form.useForm<ShipmentFormValues>();

  const loadOrder = () => {
    Promise.all([getOrderDetail(orderId!), getOrderFulfillmentItems(orderId!)])
      .then(([orderData, fulfillment]) => {
        setState({ loading: false, data: orderData as OrderDetail, error: "" });
        setFulfillmentItems(fulfillment as FulfillmentItem[]);
      })
      .catch((err: unknown) =>
        setState({
          loading: false,
          data: null,
          error: err instanceof Error ? err.message : "Failed to load order.",
        }),
      );
  };

  useEffect(() => {
    setState({ loading: true, data: null, error: "" });
    loadOrder();
  }, [orderId]);

  async function applyLifecyclePatch(patch: Record<string, string>) {
    setSaving(true);
    try {
      await updateOrderLifecycleState(orderId!, patch);
      await loadOrder();
      message.success("Order updated.");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "Failed to update order.");
    } finally {
      setSaving(false);
    }
  }

  async function submitInternalNote() {
    const text = internalNote.trim();
    if (!text) return;
    setSaving(true);
    try {
      await addOrderInternalNote(orderId!, text);
      setInternalNote("");
      await loadOrder();
      message.success("Note added.");
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "Failed to add note.");
    } finally {
      setSaving(false);
    }
  }

  async function onCreateShipment(values: ShipmentFormValues) {
    if (!orderId) return;
    setIsShipping(true);
    try {
      const unshipped = fulfillmentItems.filter((item) => item.remainingQty > 0);
      await createShipment({
        orderId,
        carrier: values.carrier,
        trackingNumber: values.trackingNumber,
        note: values.note,
        items: unshipped.map((item) => ({
          orderItemId: item.id,
          quantity: item.remainingQty,
        })),
      });
      setShipmentModalOpen(false);
      shipmentForm.resetFields();
      message.success("Shipment created.");
      loadOrder();
    } catch (err: unknown) {
      message.error(err instanceof Error ? err.message : "Failed to create shipment.");
    } finally {
      setIsShipping(false);
    }
  }

  if (state.loading) {
    return (
      <Card>
        <Space><Spin /><Typography.Text>Loading order...</Typography.Text></Space>
      </Card>
    );
  }

  if (state.error) {
    return <Alert type="error" showIcon message={state.error} />;
  }

  const order = state.data;
  const lifecycleOptions = getOrderLifecycleOptions({
    status: order?.status,
    paymentStatus: order?.paymentStatus,
    fulfillmentStatus: order?.fulfillmentStatus,
  });

  const hasUnshipped = fulfillmentItems.some((item) => item.remainingQty > 0);

  const itemColumns = [
    {
      title: "Product",
      key: "product",
      render: (_: unknown, record: OrderDetail["items"][0]) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong style={{ fontSize: 13 }}>{record.productTitle}</Typography.Text>
          {record.variantTitle && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{record.variantTitle}</Typography.Text>
          )}
          {record.sku && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>SKU: {record.sku}</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 60,
      render: (value: number) => <Typography.Text style={{ fontSize: 13 }}>{value}</Typography.Text>,
    },
    {
      title: "Price",
      key: "price",
      width: 100,
      render: (_: unknown, record: OrderDetail["items"][0]) => (
        <Typography.Text style={{ fontSize: 13 }}>
          {formatCurrency(record.unitPrice)}
        </Typography.Text>
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 110,
      render: (_: unknown, record: OrderDetail["items"][0]) => (
        <Typography.Text strong style={{ fontSize: 13 }}>
          {formatCurrency(record.lineTotal)}
        </Typography.Text>
      ),
    },
    {
      title: "Fulfillment",
      key: "fulfillment",
      width: 120,
      render: (_: unknown, record: OrderDetail["items"][0]) => {
        const fi = fulfillmentItems.find((item) => item.id === record.id);
        if (!fi) return <Tag>—</Tag>;
        return fi.remainingQty === 0 ? (
          <Tag icon={<CheckCircleOutlined />} color="success">Fulfilled</Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            {fi.allocatedQty}/{fi.orderedQty} shipped
          </Tag>
        );
      },
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Link to="/orders">
          <Button type="text" icon={<ArrowLeftOutlined />} style={{ padding: "0 8px" }} />
        </Link>
        <div style={{ flex: 1 }}>
          <Space align="center">
            <Typography.Title level={4} style={{ margin: 0 }}>
              Order #{order?.orderNumber}
            </Typography.Title>
            <Badge
              status={order?.paymentStatus === "paid" ? "success" : "warning"}
              text={
                <Typography.Text style={{ fontSize: 13, textTransform: "capitalize" }}>
                  {order?.paymentStatus || "pending"}
                </Typography.Text>
              }
            />
            <Badge
              status={FULFILLMENT_STATUS_BADGE[order?.fulfillmentStatus || "unfulfilled"] ?? "default"}
              text={
                <Typography.Text style={{ fontSize: 13, textTransform: "capitalize" }}>
                  {order?.fulfillmentStatus || "unfulfilled"}
                </Typography.Text>
              }
            />
          </Space>
          {order?.createdAt && (
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {new Date(order.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography.Text>
          )}
        </div>
        {hasUnshipped && (
          <Button type="primary" icon={<CarOutlined />} onClick={() => setShipmentModalOpen(true)}>
            Create shipment
          </Button>
        )}
      </div>

      <Row gutter={[16, 16]}>
        {/* Left column — main content */}
        <Col xs={24} lg={16}>
          {/* Items card */}
          <Card
            title="Items"
            bodyStyle={{ padding: 0 }}
            style={{ marginBottom: 12 }}
            extra={!hasUnshipped && <Tag color="success" icon={<CheckCircleOutlined />}>Fully shipped</Tag>}
          >
            <Table
              rowKey="id"
              columns={itemColumns}
              dataSource={order?.items ?? []}
              pagination={false}
              size="middle"
            />
            {/* Order totals */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0" }}>
              {[
                { label: "Subtotal", value: order?.displaySubtotalAmount ?? order?.subtotalAmount ?? 0 },
                { label: "Shipping", value: order?.displayShippingAmount ?? order?.shippingAmount ?? 0 },
                { label: "Discount", value: -(order?.displayDiscountAmount ?? order?.discountAmount ?? 0) },
                { label: "Tax", value: order?.displayTaxAmount ?? order?.taxAmount ?? 0 },
              ].map((row) => (
                <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>{row.label}</Typography.Text>
                  <Typography.Text style={{ fontSize: 13 }}>
                    {formatCurrency(Math.abs(row.value), order?.displayCurrencyCode || "USD")}
                  </Typography.Text>
                </div>
              ))}
              <Divider style={{ margin: "8px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography.Text strong>Total</Typography.Text>
                <Typography.Text strong style={{ fontSize: 15 }}>
                  {formatCurrency(
                    order?.displayTotalAmount ?? order?.totalAmount ?? 0,
                    order?.displayCurrencyCode || order?.currencyCode || "USD",
                  )}
                </Typography.Text>
              </div>
            </div>
          </Card>

          {/* Payment status card */}
          <Card title="Payment" style={{ marginBottom: 12 }}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography.Text style={{ fontSize: 13 }}>Payment status</Typography.Text>
                <Select
                  size="small"
                  value={order?.paymentStatus}
                  disabled={saving}
                  onChange={(value) =>
                    applyLifecyclePatch({ paymentStatus: value, note: `Payment status → ${value}` })
                  }
                  options={lifecycleOptions.paymentStatus.map((item) => ({ value: item, label: item }))}
                  style={{ width: 180 }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography.Text style={{ fontSize: 13 }}>Order status</Typography.Text>
                <Select
                  size="small"
                  value={order?.status}
                  disabled={saving}
                  onChange={(value) =>
                    applyLifecyclePatch({ status: value, note: `Order status → ${value}` })
                  }
                  options={lifecycleOptions.status.map((item) => ({ value: item, label: item }))}
                  style={{ width: 180 }}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Typography.Text style={{ fontSize: 13 }}>Fulfillment status</Typography.Text>
                <Select
                  size="small"
                  value={order?.fulfillmentStatus || "unfulfilled"}
                  disabled={saving}
                  onChange={(value) =>
                    applyLifecyclePatch({ fulfillmentStatus: value, note: `Fulfillment → ${value}` })
                  }
                  options={lifecycleOptions.fulfillmentStatus.map((item) => ({ value: item, label: item }))}
                  style={{ width: 180 }}
                />
              </div>
            </Space>
          </Card>

          {/* Shipments + Transactions */}
          <Row gutter={[12, 12]} style={{ marginBottom: 12 }}>
            <Col xs={24} md={12}>
              <Card title="Shipments" bodyStyle={{ padding: 0 }}>
                <List
                  dataSource={order?.shipments as Array<Record<string, unknown>>}
                  locale={{ emptyText: <div style={{ padding: "16px", textAlign: "center" }}><Typography.Text type="secondary">No shipments yet</Typography.Text></div> }}
                  renderItem={(item: Record<string, unknown>) => (
                    <List.Item key={item.id as string} style={{ padding: "10px 16px" }}>
                      <List.Item.Meta
                        title={<Typography.Text strong style={{ fontSize: 13 }}>{item.carrier as string || "Unknown"} · {item.status as string}</Typography.Text>}
                        description={<Typography.Text type="secondary" style={{ fontSize: 12 }}>Tracking: {item.trackingNumber as string || "—"}</Typography.Text>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="Transactions" bodyStyle={{ padding: 0 }}>
                <List
                  dataSource={order?.transactions as Array<Record<string, unknown>>}
                  locale={{ emptyText: <div style={{ padding: "16px", textAlign: "center" }}><Typography.Text type="secondary">No transactions yet</Typography.Text></div> }}
                  renderItem={(item: Record<string, unknown>) => (
                    <List.Item key={item.id as string} style={{ padding: "10px 16px" }}>
                      <List.Item.Meta
                        title={<Typography.Text strong style={{ fontSize: 13 }}>{item.paymentMethodName as string} · {formatCurrency(item.amount as number)}</Typography.Text>}
                        description={<Tag color={item.status === "success" ? "success" : "default"}>{item.status as string}</Tag>}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>

          {/* Timeline */}
          <Card title="Order timeline">
            {(order?.timeline ?? []).length === 0 ? (
              <Typography.Text type="secondary">No events yet.</Typography.Text>
            ) : (
              <Timeline
                items={(order?.timeline ?? []).map((event) => ({
                  color:
                    event.status === "shipped" ? "green"
                    : event.status === "delivered" ? "blue"
                    : event.status === "cancelled" ? "red"
                    : "gray",
                  children: (
                    <div>
                      <Typography.Text strong style={{ textTransform: "capitalize", fontSize: 13 }}>
                        {event.status.replace(/_/g, " ")}
                      </Typography.Text>
                      {event.note && (
                        <Typography.Text type="secondary" style={{ fontSize: 13 }}> — {event.note}</Typography.Text>
                      )}
                      <br />
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        {new Date(event.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                      </Typography.Text>
                    </div>
                  ),
                }))}
              />
            )}
            <Divider style={{ marginBottom: 12 }} />
            <Space.Compact style={{ width: "100%" }}>
              <Input
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                placeholder="Leave a comment..."
                onPressEnter={submitInternalNote}
              />
              <Button onClick={submitInternalNote} loading={saving}>
                Post
              </Button>
            </Space.Compact>
          </Card>
        </Col>

        {/* Right sidebar */}
        <Col xs={24} lg={8}>
          {/* Customer */}
          <Card title="Customer" style={{ marginBottom: 12 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {order?.customerName || "Guest"}
            </Typography.Text>
            <br />
            {order?.customerEmail && (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {order.customerEmail}
              </Typography.Text>
            )}
            {order?.customerPhone && (
              <>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {order.customerPhone}
                </Typography.Text>
              </>
            )}
          </Card>

          {/* Shipping address */}
          <Card title="Shipping address" style={{ marginBottom: 12 }}>
            {order?.shippingAddress ? (
              <Space direction="vertical" size={2}>
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {order.shippingAddress.fullName}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 13 }}>{order.shippingAddress.addressLine1}</Typography.Text>
                {Boolean(order.shippingAddress.addressLine2) && (
                  <Typography.Text style={{ fontSize: 13 }}>{String(order.shippingAddress.addressLine2)}</Typography.Text>
                )}
                <Typography.Text style={{ fontSize: 13 }}>
                  {[order.shippingAddress.city, order.shippingAddress.postalCode].filter(Boolean).join(", ")}
                </Typography.Text>
                <Typography.Text style={{ fontSize: 13 }}>{order.shippingAddress.country}</Typography.Text>
              </Space>
            ) : (
              <Typography.Text type="secondary">No address provided.</Typography.Text>
            )}
          </Card>

          {/* Tags / meta */}
          <Card title="Order details" bodyStyle={{ padding: "12px 16px" }}>
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              {order?.subscriptionContext && (
                <div>
                  <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Subscription</Typography.Text>
                  <Space>
                    <Tag color="purple">{order.subscriptionContext.planName || "Subscription"}</Tag>
                    <Tag>{order.subscriptionContext.isRenewal ? "Renewal" : "First charge"}</Tag>
                  </Space>
                </div>
              )}
              <div>
                <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 2 }}>Currency</Typography.Text>
                <Tag>{order?.displayCurrencyCode || order?.currencyCode || "USD"}</Tag>
                {order?.currencySnapshot && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {" "}FX: {order.currencySnapshot.fxRate}
                  </Typography.Text>
                )}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Create Shipment Modal */}
      <Modal
        title="Create shipment"
        open={shipmentModalOpen}
        onOk={() => shipmentForm.submit()}
        onCancel={() => setShipmentModalOpen(false)}
        confirmLoading={isShipping}
        okText="Create shipment"
      >
        <Form form={shipmentForm} layout="vertical" onFinish={onCreateShipment}>
          <Form.Item name="carrier" label="Carrier" rules={[{ required: true }]}>
            <Select
              options={[
                { value: "JNE", label: "JNE" },
                { value: "J&T", label: "J&T Express" },
                { value: "SiCepat", label: "SiCepat" },
                { value: "Anteraja", label: "Anteraja" },
                { value: "Pos Indonesia", label: "Pos Indonesia" },
                { value: "other", label: "Other" },
              ]}
              placeholder="Select carrier"
            />
          </Form.Item>
          <Form.Item name="trackingNumber" label="Tracking number" rules={[{ required: true }]}>
            <Input placeholder="e.g. JNE1234567890" />
          </Form.Item>
          <Form.Item name="note" label="Note (optional)">
            <Input.TextArea rows={2} placeholder="Handling instructions, etc." />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
