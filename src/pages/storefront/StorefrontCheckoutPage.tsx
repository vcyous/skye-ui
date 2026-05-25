import {
  App,
  Button,
  Col,
  Form,
  Input,
  Row,
  Select,
  Space,
  Spin,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { createOrderFromCart, getCheckoutSnapshot } from "../../services/api";
import type { CheckoutSnapshot } from "../../services/checkoutService";

interface CheckoutFormValues {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  addressLine1: string;
  city: string;
  postalCode: string;
  country: string;
  shippingMethodId: string;
  paymentMethodId: string;
  note?: string;
}

function formatPrice(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function StorefrontCheckoutPage() {
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { cart, refreshCart } = useCart();
  const [form] = Form.useForm<CheckoutFormValues>();
  const [snapshot, setSnapshot] = useState<Partial<CheckoutSnapshot>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!cart.items.length) {
      navigate("/storefront/cart");
      return;
    }
    getCheckoutSnapshot()
      .then((data) => setSnapshot(data))
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, [cart.items.length, navigate]);

  async function onSubmit(values: CheckoutFormValues) {
    setIsSubmitting(true);
    try {
      const order = await createOrderFromCart({
        ...values,
        checkoutState: "review",
        formData: values,
      });
      await refreshCart();
      navigate(`/storefront/order-confirmed/${order.id}`);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Checkout failed. Please try again.";
      message.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  const paymentMethods = (snapshot.paymentMethods ?? []) as Array<{
    id: string;
    displayName: string;
  }>;
  const shippingMethods = (snapshot.shippingMethods ?? []) as Array<{
    id: string;
    name: string;
    baseRate: number;
  }>;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 32 }}>
      <Button
        type="link"
        onClick={() => navigate("/storefront/cart")}
        style={{ padding: 0, marginBottom: 20 }}
      >
        ← Back to Cart
      </Button>
      <Typography.Title level={2}>Checkout</Typography.Title>

      <Row gutter={[32, 32]}>
        <Col xs={24} lg={14}>
          <Form
            form={form}
            layout="vertical"
            onFinish={onSubmit}
            requiredMark={false}
          >
            <Typography.Title level={4}>Customer Information</Typography.Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customerName"
                  label="Full Name"
                  rules={[{ required: true, message: "Name is required." }]}
                >
                  <Input placeholder="John Doe" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="customerEmail"
                  label="Email Address"
                  rules={[
                    {
                      required: true,
                      type: "email",
                      message: "Enter a valid email.",
                    },
                  ]}
                >
                  <Input placeholder="john@example.com" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="customerPhone" label="Phone Number">
                  <Input placeholder="+62 812 3456 7890" />
                </Form.Item>
              </Col>
            </Row>

            <Typography.Title level={4} style={{ marginTop: 16 }}>
              Shipping Address
            </Typography.Title>
            <Row gutter={16}>
              <Col xs={24}>
                <Form.Item
                  name="addressLine1"
                  label="Street Address"
                  rules={[{ required: true, message: "Address is required." }]}
                >
                  <Input placeholder="Jl. Sudirman No. 1" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="city"
                  label="City"
                  rules={[{ required: true, message: "City is required." }]}
                >
                  <Input placeholder="Jakarta" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="postalCode"
                  label="Postal Code"
                  rules={[
                    { required: true, message: "Postal code is required." },
                  ]}
                >
                  <Input placeholder="12190" />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item
                  name="country"
                  label="Country"
                  initialValue="Indonesia"
                  rules={[{ required: true }]}
                >
                  <Input />
                </Form.Item>
              </Col>
            </Row>

            <Typography.Title level={4} style={{ marginTop: 16 }}>
              Delivery & Payment
            </Typography.Title>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="shippingMethodId"
                  label="Shipping Method"
                  rules={[
                    { required: true, message: "Select a shipping method." },
                  ]}
                >
                  <Select
                    placeholder="Select shipping"
                    options={shippingMethods.map((m) => ({
                      value: m.id,
                      label: `${m.name} — ${formatPrice(m.baseRate)}`,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="paymentMethodId"
                  label="Payment Method"
                  rules={[
                    { required: true, message: "Select a payment method." },
                  ]}
                >
                  <Select
                    placeholder="Select payment"
                    options={paymentMethods.map((m) => ({
                      value: m.id,
                      label: m.displayName,
                    }))}
                  />
                </Form.Item>
              </Col>
              <Col xs={24}>
                <Form.Item name="note" label="Order Note (optional)">
                  <Input.TextArea
                    rows={2}
                    placeholder="Special instructions..."
                  />
                </Form.Item>
              </Col>
            </Row>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={isSubmitting}
            >
              Place Order
            </Button>
          </Form>
        </Col>

        <Col xs={24} lg={10}>
          <div style={{ background: "#F9FAFB", borderRadius: 12, padding: 24 }}>
            <Typography.Title level={4}>Order Summary</Typography.Title>
            <Space direction="vertical" style={{ width: "100%" }} size={8}>
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  style={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Typography.Text>
                    {item.productName} × {item.quantity}
                  </Typography.Text>
                  <Typography.Text strong>
                    {formatPrice(item.lineTotal)}
                  </Typography.Text>
                </div>
              ))}
              <div
                style={{
                  borderTop: "1px solid #E5E7EB",
                  paddingTop: 8,
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <Typography.Text>Subtotal</Typography.Text>
                <Typography.Text strong>
                  {formatPrice(cart.subtotal)}
                </Typography.Text>
              </div>
            </Space>
          </div>
        </Col>
      </Row>
    </div>
  );
}
