import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useLocalization } from "../context/LocalizationContext.jsx";
import {
  createOrderFromCart,
  getCheckoutSnapshot,
  revalidateCheckout,
} from "../services/api.js";

const checkoutSteps = [
  { key: "cart_review", title: "Cart" },
  { key: "customer_info", title: "Customer" },
  { key: "shipping", title: "Shipping" },
  { key: "payment", title: "Payment" },
  { key: "review", title: "Review" },
];

function resolveStepIndex(step) {
  const index = checkoutSteps.findIndex((item) => item.key === step);
  return index >= 0 ? index : 0;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { formatCurrency, activeCurrency } = useLocalization();
  const {
    refreshCart,
    checkoutRecovery,
    checkoutRecoveryError,
    saveCheckoutRecovery,
    clearCheckoutRecovery,
    refreshCheckoutRecovery,
  } = useCart();

  const [snapshot, setSnapshot] = useState({
    cart: { items: [], subtotal: 0 },
    discounts: [],
    paymentMethods: [],
    shippingMethods: [],
    taxRules: [],
    recovery: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [currentStep, setCurrentStep] = useState("cart_review");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [revalidation, setRevalidation] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [form] = Form.useForm();
  const saveTimerRef = useRef(null);

  const activeStepIndex = useMemo(
    () => resolveStepIndex(currentStep),
    [currentStep],
  );

  async function loadCheckout() {
    setLoadError("");
    setIsLoading(true);

    try {
      const data = await getCheckoutSnapshot();
      setSnapshot(data);

      const recoveryFormData =
        data?.recovery?.formData || checkoutRecovery?.formData || {};
      const nextCurrency =
        recoveryFormData.displayCurrency ||
        activeCurrency ||
        data?.currencySettings?.baseCurrency ||
        data?.store?.currencyCode ||
        "USD";
      form.setFieldsValue(recoveryFormData);
      form.setFieldsValue({
        ...recoveryFormData,
        displayCurrency: nextCurrency,
      });
      setDisplayCurrency(nextCurrency);

      const restoredStep =
        data?.recovery?.state || checkoutRecovery?.state || "cart_review";
      setCurrentStep(restoredStep);

      if (data?.recovery?.revalidation) {
        setRevalidation(data.recovery.revalidation);
      }
    } catch (err) {
      setLoadError(err.message || "Failed to load checkout.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCheckout();
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  function persistDraft(nextState = currentStep) {
    const values = form.getFieldsValue(true);
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      saveCheckoutRecovery({
        state: nextState,
        status: "in_progress",
        formData: values,
        revalidation,
        note: "Autosave checkout progress",
      }).catch(() => null);
    }, 300);
  }

  async function moveStep(direction) {
    const nextIndex = Math.max(
      0,
      Math.min(checkoutSteps.length - 1, activeStepIndex + direction),
    );
    const nextStep = checkoutSteps[nextIndex].key;

    setCurrentStep(nextStep);
    try {
      await saveCheckoutRecovery({
        state: nextStep,
        status: "in_progress",
        formData: form.getFieldsValue(true),
        revalidation,
        note: `Moved to ${nextStep}`,
      });
    } catch (err) {
      setNotice({
        type: "warning",
        message: err.message || "Failed to persist step transition.",
      });
    }
  }

  async function handleRevalidate() {
    setNotice({ type: "", message: "" });
    setIsRevalidating(true);
    const values = form.getFieldsValue(true);

    try {
      const result = await revalidateCheckout(values);
      setRevalidation(result);

      await saveCheckoutRecovery({
        state: currentStep,
        status: result.ok ? "in_progress" : "failed",
        formData: values,
        revalidation: result,
        lastError: result.ok
          ? null
          : result.issues.map((item) => item.message).join("; "),
        note: "Manual checkout revalidation",
      });

      setNotice({
        type: result.ok ? "success" : "warning",
        message: result.ok
          ? "Checkout revalidation passed."
          : "Revalidation found issues. Resolve them before submitting.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Checkout revalidation failed.",
      });
    } finally {
      setIsRevalidating(false);
    }
  }

  async function onSubmit(values) {
    setNotice({ type: "", message: "" });
    setIsSubmitting(true);

    try {
      const order = await createOrderFromCart({
        ...values,
        checkoutState: "review",
        formData: values,
        displayCurrency: values.displayCurrency,
      });

      await clearCheckoutRecovery();
      await refreshCheckoutRecovery();
      await refreshCart();
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      await saveCheckoutRecovery({
        state: "failed",
        status: "failed",
        formData: values,
        revalidation,
        lastError: err.message || "Checkout failed",
        note: "Checkout submit failed",
      }).catch(() => null);

      setNotice({
        type: "error",
        message: err.message || "Checkout failed.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <Typography.Text>Loading checkout...</Typography.Text>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <Alert
          type="error"
          showIcon
          message="Unable to load checkout"
          description={
            <Space direction="vertical">
              <Typography.Text>{loadError}</Typography.Text>
              <Button onClick={loadCheckout}>Retry</Button>
            </Space>
          }
        />
      </Card>
    );
  }

  if (!snapshot.cart.items.length) {
    return (
      <Card>
        <Empty
          description="Cart is empty. Add products before checkout."
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigate("/cart")}>
            Go to Cart
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Checkout
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Complete customer, shipping, and payment flow with recovery-safe state
          transitions.
        </Typography.Text>
      </header>

      {checkoutRecoveryError ? (
        <Alert type="warning" showIcon message={checkoutRecoveryError} />
      ) : null}

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Card title="Checkout Progress">
        <Steps current={activeStepIndex} items={checkoutSteps} />
        <Space style={{ marginTop: 12 }}>
          <Button
            onClick={() => moveStep(-1)}
            disabled={activeStepIndex <= 0 || isSubmitting}
          >
            Back
          </Button>
          <Button
            onClick={() => moveStep(1)}
            disabled={
              activeStepIndex >= checkoutSteps.length - 1 || isSubmitting
            }
          >
            Next
          </Button>
          <Tag>
            Recovery status:{" "}
            {snapshot.recovery?.status ||
              checkoutRecovery?.status ||
              "in_progress"}
          </Tag>
          <Tag color="blue">Display currency: {displayCurrency}</Tag>
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card title="Customer and Shipping">
            <Form
              form={form}
              layout="vertical"
              onFinish={onSubmit}
              onValuesChange={() => persistDraft(currentStep)}
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
                    name="displayCurrency"
                    label="Display Currency"
                    initialValue={displayCurrency}
                    rules={[
                      { required: true, message: "Choose a display currency." },
                    ]}
                  >
                    <Select
                      placeholder="Select display currency"
                      onChange={(value) => setDisplayCurrency(value)}
                      options={(
                        snapshot.currencySettings?.enabledCurrencies || [
                          snapshot.store?.currencyCode || "USD",
                        ]
                      ).map((code) => ({ value: code, label: code }))}
                    />
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
                        label: `${item.name} (${formatCurrency(
                          item.baseRate,
                          snapshot.store?.currencyCode || "USD",
                        )})`,
                      }))}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="discountCode" label="Discount Code(s)">
                    <Select
                      allowClear
                      mode="tags"
                      tokenSeparators={[","]}
                      optionFilterProp="label"
                      placeholder="Enter one or more codes"
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

              <Space>
                <Button onClick={handleRevalidate} loading={isRevalidating}>
                  Revalidate Checkout
                </Button>
                <Button type="primary" htmlType="submit" loading={isSubmitting}>
                  Create Order
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="Order Summary">
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              {revalidation?.currencyQuote?.usedFallback ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Using fallback FX rate (1:1). Add rate snapshots for better currency accuracy."
                />
              ) : null}
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
                    {formatCurrency(
                      revalidation?.currencyQuote
                        ? Number(item.lineTotal || 0) *
                            Number(revalidation.currencyQuote.rate || 1)
                        : item.lineTotal,
                      revalidation?.currencyQuote?.displayCurrency ||
                        snapshot.store?.currencyCode ||
                        "USD",
                    )}
                  </Typography.Text>
                </div>
              ))}

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography.Text type="secondary">Subtotal</Typography.Text>
                <Typography.Text strong>
                  {formatCurrency(
                    revalidation?.currencyQuote?.converted?.subtotal ??
                      snapshot.cart.subtotal,
                    revalidation?.currencyQuote?.displayCurrency ||
                      snapshot.store?.currencyCode ||
                      "USD",
                  )}
                </Typography.Text>
              </div>

              {revalidation?.pricing ? (
                <>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography.Text type="secondary">Discount</Typography.Text>
                    <Typography.Text strong>
                      {formatCurrency(
                        revalidation.currencyQuote?.converted?.discountAmount ??
                          revalidation.pricing.discountAmount,
                        revalidation.currencyQuote?.displayCurrency ||
                          snapshot.store?.currencyCode ||
                          "USD",
                      )}
                    </Typography.Text>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography.Text type="secondary">Shipping</Typography.Text>
                    <Typography.Text strong>
                      {formatCurrency(
                        revalidation.currencyQuote?.converted?.shippingAmount ??
                          revalidation.pricing.shippingAmount,
                        revalidation.currencyQuote?.displayCurrency ||
                          snapshot.store?.currencyCode ||
                          "USD",
                      )}
                    </Typography.Text>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography.Text type="secondary">Taxable</Typography.Text>
                    <Typography.Text strong>
                      {formatCurrency(
                        revalidation.currencyQuote?.converted?.taxableAmount ??
                          revalidation.pricing.taxableAmount,
                        revalidation.currencyQuote?.displayCurrency ||
                          snapshot.store?.currencyCode ||
                          "USD",
                      )}
                    </Typography.Text>
                  </div>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography.Text type="secondary">Tax</Typography.Text>
                    <Typography.Text strong>
                      {formatCurrency(
                        revalidation.currencyQuote?.converted?.taxAmount ??
                          revalidation.pricing.taxAmount,
                        revalidation.currencyQuote?.displayCurrency ||
                          snapshot.store?.currencyCode ||
                          "USD",
                      )}
                    </Typography.Text>
                  </div>
                  <Typography.Text type="secondary">
                    Tax mode: {revalidation.pricing.taxBehavior || "exclusive"}{" "}
                    ({Number(revalidation.pricing.taxRate || 0).toFixed(2)}%)
                  </Typography.Text>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <Typography.Text>Estimated Total</Typography.Text>
                    <Typography.Text strong>
                      {formatCurrency(
                        revalidation.currencyQuote?.converted?.totalAmount ??
                          revalidation.pricing.totalAmount,
                        revalidation.currencyQuote?.displayCurrency ||
                          snapshot.store?.currencyCode ||
                          "USD",
                      )}
                    </Typography.Text>
                  </div>
                </>
              ) : null}

              {revalidation?.issues?.length ? (
                <Alert
                  type="warning"
                  showIcon
                  message="Revalidation issues"
                  description={revalidation.issues
                    .map((item) => item.message)
                    .join("; ")}
                />
              ) : null}
            </Space>
          </Card>
        </Col>
      </Row>
    </section>
  );
}
