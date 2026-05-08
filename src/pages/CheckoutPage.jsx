import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { createOrderFromCart, getCheckoutSnapshot } from "../services/api.js";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { refreshCart } = useCart();
  const [snapshot, setSnapshot] = useState({
    cart: { items: [], subtotal: 0 },
    discounts: [],
    paymentMethods: [],
    shippingMethods: [],
    taxRules: [],
  });
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    getCheckoutSnapshot()
      .then((data) => setSnapshot(data))
      .catch((err) => {
        setNotice({
          type: "error",
          message: err.message || "Failed to load checkout.",
        });
      });
  }, []);

  async function onSubmit(values) {
    setNotice({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      const order = await createOrderFromCart(values);
      await refreshCart();
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      setNotice({ type: "error", message: err.message || "Checkout failed." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Checkout
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Confirm customer, address, and pricing before creating the order.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Customer and Shipping">
            <Form
              form={form}
              layout="vertical"
              onFinish={onSubmit}
              requiredMark={false}
            >
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="customerName"
                    label="Customer Name"
                    rules={[
                      { required: true, message: "Customer name is required." },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="customerEmail"
                    label="Customer Email"
                    rules={[{ type: "email", message: "Enter a valid email." }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="customerPhone" label="Customer Phone">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="country"
                    label="Country"
                    initialValue="Indonesia"
                    rules={[
                      { required: true, message: "Country is required." },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item
                    name="addressLine1"
                    label="Address"
                    rules={[
                      { required: true, message: "Address is required." },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="city"
                    label="City"
                    rules={[{ required: true, message: "City is required." }]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="postalCode"
                    label="Postal Code"
                    rules={[
                      { required: true, message: "Postal code is required." },
                    ]}
                  >
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="paymentMethodId"
                    label="Payment Method"
                    rules={[
                      { required: true, message: "Choose a payment method." },
                    ]}
                  >
                    <Select
                      placeholder="Select payment method"
                      options={snapshot.paymentMethods.map((item) => ({
                        value: item.id,
                        label: item.displayName,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="shippingMethodId"
                    label="Shipping Method"
                    rules={[
                      { required: true, message: "Choose a shipping method." },
                    ]}
                  >
                    <Select
                      placeholder="Select shipping method"
                      options={snapshot.shippingMethods.map((item) => ({
                        value: item.id,
                        label: `${item.name} (${formatCurrency(item.baseRate)})`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="discountCode" label="Discount Code">
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      options={snapshot.discounts.map((item) => ({
                        value: item.code,
                        label: `${item.code} - ${item.title}`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="note" label="Order Note">
                    <Input.TextArea rows={3} />
                  </Form.Item>
                </Col>
              </Row>

              <Space wrap style={{ marginBottom: 16 }}>
                {snapshot.taxRules.length ? (
                  snapshot.taxRules.map((item) => (
                    <Tag key={item.id} color="blue">
                      {item.name}: {item.taxRate}% for {item.regionCode}
                    </Tag>
                  ))
                ) : (
                  <Typography.Text type="secondary">
                    No active tax rules configured. Manual tax defaults to 0.
                  </Typography.Text>
                )}
              </Space>

              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                disabled={!snapshot.cart.items.length}
              >
                Create Order
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Order Summary">
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {snapshot.cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <Typography.Text>
                    {item.productName} x {item.quantity}
                  </Typography.Text>
                  <Typography.Text strong>
                    {formatCurrency(item.lineTotal)}
                  </Typography.Text>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography.Text type="secondary">Subtotal</Typography.Text>
                <Typography.Text strong>
                  {formatCurrency(snapshot.cart.subtotal)}
                </Typography.Text>
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Typography.Text type="secondary">
                  Available payment methods
                </Typography.Text>
                {snapshot.paymentMethods.map((item) => (
                  <Tag key={item.id}>{item.displayName}</Tag>
                ))}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <Typography.Text type="secondary">
                  Available shipping methods
                </Typography.Text>
                {snapshot.shippingMethods.map((item) => (
                  <Tag key={item.id}>
                    {item.name}: {formatCurrency(item.baseRate)}
                  </Tag>
                ))}
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </section>
  );
}
