import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "../context/LocalizationContext.jsx";
import {
  createSubscription,
  createSubscriptionPlan,
  deleteSubscriptionPlan,
  getCustomers,
  getSubscriptionPlans,
  getSubscriptions,
  processRecurringSubscriptionBilling,
  updateSubscriptionPlan,
  updateSubscriptionStatus,
} from "../services/api.js";

const planCycleOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const billingAnchorOptions = [
  { value: "signup", label: "Signup date" },
  { value: "calendar_day", label: "Calendar day" },
  { value: "week_start", label: "Week start" },
];

const subscriptionStatusFilterOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "active" },
  { value: "trialing", label: "trialing" },
  { value: "past_due", label: "past_due" },
  { value: "paused", label: "paused" },
  { value: "cancelled", label: "cancelled" },
];

export default function SubscriptionsPage() {
  const { formatCurrency, formatDate } = useLocalization();
  const [isLoading, setIsLoading] = useState(true);
  const [isBillingRun, setIsBillingRun] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");

  const [editingPlan, setEditingPlan] = useState(null);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isPlanSaving, setIsPlanSaving] = useState(false);

  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isSubscriptionSaving, setIsSubscriptionSaving] = useState(false);

  const [planForm] = Form.useForm();
  const [subscriptionForm] = Form.useForm();

  async function loadData(nextStatus = statusFilter) {
    setIsLoading(true);
    setError("");
    try {
      const [planRows, subscriptionRows, customerRows] = await Promise.all([
        getSubscriptionPlans(),
        getSubscriptions({ status: nextStatus }),
        getCustomers(),
      ]);
      setPlans(planRows);
      setSubscriptions(subscriptionRows);
      setCustomers(customerRows);
    } catch (err) {
      setError(err.message || "Failed to load subscription data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(statusFilter);
  }, [statusFilter]);

  const kpis = useMemo(() => {
    const activeCount = subscriptions.filter(
      (item) => item.status === "active",
    ).length;
    const pastDueCount = subscriptions.filter(
      (item) => item.status === "past_due",
    ).length;
    const monthlyRevenue = subscriptions
      .filter((item) => item.status === "active" || item.status === "trialing")
      .reduce((sum, item) => sum + Number(item.priceAmount || 0), 0);

    return {
      plans: plans.length,
      activeCount,
      pastDueCount,
      monthlyRevenue,
    };
  }, [plans, subscriptions]);

  function openCreatePlanModal() {
    setEditingPlan(null);
    planForm.resetFields();
    planForm.setFieldsValue({
      billingCycle: "monthly",
      billingInterval: 1,
      billingAnchor: "signup",
      currencyCode: "USD",
      trialDays: 0,
      maxRetryAttempts: 3,
      retryIntervalHours: 24,
      isActive: true,
    });
    setIsPlanModalOpen(true);
  }

  function openEditPlanModal(plan) {
    setEditingPlan(plan);
    planForm.setFieldsValue({
      name: plan.name,
      description: plan.description,
      billingCycle: plan.billingCycle,
      billingInterval: plan.billingInterval,
      billingAnchor: plan.billingAnchor,
      billingAnchorDay: plan.billingAnchorDay,
      priceAmount: plan.priceAmount,
      currencyCode: plan.currencyCode,
      trialDays: plan.trialDays,
      maxRetryAttempts: plan.maxRetryAttempts,
      retryIntervalHours: plan.retryIntervalHours,
      isActive: plan.isActive,
    });
    setIsPlanModalOpen(true);
  }

  async function onSavePlan(values) {
    setIsPlanSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingPlan) {
        await updateSubscriptionPlan(editingPlan.id, values);
        setNotice("Subscription plan updated.");
      } else {
        await createSubscriptionPlan(values);
        setNotice("Subscription plan created.");
      }
      setIsPlanModalOpen(false);
      await loadData(statusFilter);
    } catch (err) {
      setError(err.message || "Failed to save subscription plan.");
    } finally {
      setIsPlanSaving(false);
    }
  }

  async function onDeletePlan(planId) {
    setError("");
    setNotice("");
    try {
      await deleteSubscriptionPlan(planId);
      setNotice("Subscription plan removed.");
      await loadData(statusFilter);
    } catch (err) {
      setError(err.message || "Failed to delete subscription plan.");
    }
  }

  function openCreateSubscriptionModal() {
    subscriptionForm.resetFields();
    subscriptionForm.setFieldsValue({
      status: "active",
      startsAt: new Date().toISOString(),
    });
    setIsSubscriptionModalOpen(true);
  }

  async function onCreateSubscription(values) {
    setIsSubscriptionSaving(true);
    setError("");
    setNotice("");
    try {
      await createSubscription(values);
      setNotice("Subscription created.");
      setIsSubscriptionModalOpen(false);
      await loadData(statusFilter);
    } catch (err) {
      setError(err.message || "Failed to create subscription.");
    } finally {
      setIsSubscriptionSaving(false);
    }
  }

  async function onUpdateSubscriptionStatus(subscription, action) {
    setError("");
    setNotice("");
    try {
      await updateSubscriptionStatus(subscription.id, {
        action,
        note: `Subscription ${action} from admin dashboard`,
      });
      setNotice(`Subscription ${action} applied.`);
      await loadData(statusFilter);
    } catch (err) {
      setError(err.message || `Failed to ${action} subscription.`);
    }
  }

  async function onRunBilling() {
    setIsBillingRun(true);
    setError("");
    setNotice("");
    try {
      const result = await processRecurringSubscriptionBilling();
      setNotice(
        `Recurring billing run complete: ${result.processed} processed, ${result.paid} paid, ${result.failed} failed.`,
      );
      await loadData(statusFilter);
    } catch (err) {
      setError(err.message || "Failed to run recurring billing cycle.");
    } finally {
      setIsBillingRun(false);
    }
  }

  const planColumns = [
    {
      title: "Plan",
      key: "plan",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">
            {record.description || "No description"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Cycle",
      key: "cycle",
      render: (_, record) => `${record.billingInterval} ${record.billingCycle}`,
    },
    {
      title: "Price",
      key: "price",
      render: (_, record) =>
        formatCurrency(record.priceAmount, record.currencyCode),
    },
    {
      title: "Retry",
      key: "retry",
      render: (_, record) =>
        `${record.maxRetryAttempts}x / ${record.retryIntervalHours}h`,
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) =>
        record.isActive ? <Tag color="green">active</Tag> : <Tag>inactive</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditPlanModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete subscription plan?"
            description="Existing subscriptions using this plan must be migrated first."
            onConfirm={() => onDeletePlan(record.id)}
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const subscriptionColumns = [
    {
      title: "Customer",
      key: "customer",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.customerName}</Typography.Text>
          <Typography.Text type="secondary">
            {record.customerEmail || "-"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Plan",
      dataIndex: "planName",
      key: "planName",
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Space>
          <Tag
            color={
              record.status === "active"
                ? "green"
                : record.status === "past_due"
                  ? "volcano"
                  : "default"
            }
          >
            {record.status}
          </Tag>
          <Tag>{record.dunningStatus}</Tag>
        </Space>
      ),
    },
    {
      title: "Next Billing",
      key: "nextBillingAt",
      render: (_, record) =>
        formatDate(record.nextBillingAt, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
    },
    {
      title: "Amount",
      key: "amount",
      render: (_, record) =>
        formatCurrency(record.priceAmount, record.currencyCode),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button
            size="small"
            disabled={
              record.status === "paused" || record.status === "cancelled"
            }
            onClick={() => onUpdateSubscriptionStatus(record, "pause")}
          >
            Pause
          </Button>
          <Button
            size="small"
            disabled={
              record.status !== "paused" && record.status !== "past_due"
            }
            onClick={() => onUpdateSubscriptionStatus(record, "resume")}
          >
            Resume
          </Button>
          <Button
            size="small"
            danger
            disabled={record.status === "cancelled"}
            onClick={() => onUpdateSubscriptionStatus(record, "cancel")}
          >
            Cancel
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          Subscriptions & Recurring Billing
        </Typography.Title>
        <Typography.Text type="secondary">
          Configure plans, manage active subscriptions, and run recurring
          billing with retry visibility.
        </Typography.Text>
      </div>

      {error ? <Alert type="error" showIcon message={error} /> : null}
      {notice ? <Alert type="success" showIcon message={notice} /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Plans" value={kpis.plans} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Active" value={kpis.activeCount} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Past due" value={kpis.pastDueCount} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Recurring value"
              value={kpis.monthlyRevenue}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Subscription Plans"
        extra={
          <Button type="primary" onClick={openCreatePlanModal}>
            New plan
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={plans}
          columns={planColumns}
          pagination={{ pageSize: 6 }}
          locale={{
            emptyText: (
              <Empty
                description="No subscription plans yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={openCreatePlanModal}>
                  Create first plan
                </Button>
              </Empty>
            ),
          }}
        />
      </Card>

      <Card
        title="Customer Subscriptions"
        extra={
          <Space wrap>
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={subscriptionStatusFilterOptions}
              style={{ width: 180 }}
            />
            <Button onClick={openCreateSubscriptionModal}>
              New subscription
            </Button>
            <Button
              type="primary"
              onClick={onRunBilling}
              loading={isBillingRun}
            >
              Run recurring billing
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={subscriptions}
          columns={subscriptionColumns}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 920 }}
          locale={{
            emptyText: (
              <Empty
                description="No subscriptions for this filter"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ),
          }}
        />
      </Card>

      <Modal
        title={editingPlan ? "Edit plan" : "Create plan"}
        open={isPlanModalOpen}
        onCancel={() => setIsPlanModalOpen(false)}
        onOk={() => planForm.submit()}
        confirmLoading={isPlanSaving}
        okText={editingPlan ? "Save changes" : "Create plan"}
      >
        <Form form={planForm} layout="vertical" onFinish={onSavePlan}>
          <Form.Item name="name" label="Plan name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="billingCycle"
                label="Billing cycle"
                rules={[{ required: true }]}
              >
                <Select options={planCycleOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="billingInterval"
                label="Cycle interval"
                rules={[{ required: true }]}
              >
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="billingAnchor"
                label="Billing anchor"
                rules={[{ required: true }]}
              >
                <Select options={billingAnchorOptions} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="billingAnchorDay" label="Anchor day (optional)">
                <InputNumber min={1} max={31} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="priceAmount"
                label="Price"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="currencyCode"
                label="Currency"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="trialDays" label="Trial days">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="maxRetryAttempts" label="Max retries">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="retryIntervalHours"
                label="Retry interval (hours)"
              >
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title="Create subscription"
        open={isSubscriptionModalOpen}
        onCancel={() => setIsSubscriptionModalOpen(false)}
        onOk={() => subscriptionForm.submit()}
        confirmLoading={isSubscriptionSaving}
      >
        <Form
          form={subscriptionForm}
          layout="vertical"
          onFinish={onCreateSubscription}
        >
          <Form.Item
            name="customerId"
            label="Customer"
            rules={[{ required: true }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={customers.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.email || "no-email"})`,
              }))}
            />
          </Form.Item>
          <Form.Item name="planId" label="Plan" rules={[{ required: true }]}>
            <Select
              options={plans.map((item) => ({
                value: item.id,
                label: `${item.name} - ${formatCurrency(item.priceAmount, item.currencyCode)}`,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="status"
            label="Initial status"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "trialing", label: "trialing" },
                { value: "active", label: "active" },
                { value: "paused", label: "paused" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="startsAt"
            label="Starts at (ISO datetime)"
            rules={[{ required: true }]}
          >
            <Input placeholder="2026-05-11T08:00:00.000Z" />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
