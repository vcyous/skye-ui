import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createRecoveryMessageTemplate,
  detectAbandonedCarts,
  getAbandonedCartPerformance,
  getAbandonedCartRecoveries,
  getRecoveryMessageTemplates,
  sendAbandonedCartRecoveryMessage,
  updateAbandonedCartRecoveryStatus,
  updateRecoveryMessageTemplate,
} from "../services/api.js";

const statusOptions = [
  "all",
  "detected",
  "scheduled",
  "contacted",
  "recovered",
  "dismissed",
].map((value) => ({
  label: value === "all" ? "All statuses" : value,
  value,
}));

const ageOptions = [
  { label: "24+ hours", value: 24 },
  { label: "48+ hours", value: 48 },
  { label: "72+ hours", value: 72 },
  { label: "7+ days", value: 168 },
];

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function buildTemplatePayload(values) {
  return {
    name: String(values.name || "").trim(),
    channel: "email",
    subject: values.subject,
    body: values.body,
    isDefault: Boolean(values.isDefault),
    placeholders: ["customer_name", "item_count", "cart_value", "checkout_url"],
  };
}

export default function AbandonedCartsPage() {
  const [recoveries, setRecoveries] = useState([]);
  const [performance, setPerformance] = useState({
    summary: {
      totalDetected: 0,
      messagesSent: 0,
      openedCount: 0,
      convertedCount: 0,
      openRate: 0,
      conversionRate: 0,
      recoveredRate: 0,
    },
    trend: [],
  });
  const [templates, setTemplates] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [ageHours, setAgeHours] = useState(24);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [targetRecovery, setTargetRecovery] = useState(null);
  const [targetTemplate, setTargetTemplate] = useState(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [messageForm] = Form.useForm();
  const [templateForm] = Form.useForm();

  async function loadData(nextStatus = statusFilter, nextAgeHours = ageHours) {
    setIsLoading(true);
    setError("");
    try {
      await detectAbandonedCarts({ ageHours: nextAgeHours });
      const [recoveryRows, perfRows, templateRows] = await Promise.all([
        getAbandonedCartRecoveries({
          status: nextStatus,
          ageHours: nextAgeHours,
          autoDetect: false,
        }),
        getAbandonedCartPerformance(),
        getRecoveryMessageTemplates(),
      ]);
      setRecoveries(recoveryRows);
      setPerformance(perfRows);
      setTemplates(templateRows);
    } catch (err) {
      setError(err.message || "Failed to load abandoned cart data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(statusFilter, ageHours);
  }, [statusFilter, ageHours]);

  const defaultTemplateId = useMemo(
    () => templates.find((item) => item.isDefault)?.id,
    [templates],
  );

  function openSendModal(recovery) {
    setTargetRecovery(recovery);
    setNotice("");
    messageForm.setFieldsValue({
      templateId: defaultTemplateId || templates[0]?.id,
      scheduleAt: null,
      mode: "send",
    });
    setIsMessageModalOpen(true);
  }

  async function onSubmitMessage(values) {
    if (!targetRecovery) {
      return;
    }

    setIsSubmitting(true);
    setNotice("");
    setError("");
    try {
      await sendAbandonedCartRecoveryMessage({
        recoveryId: targetRecovery.id,
        templateId: values.templateId,
        scheduleAt:
          values.mode === "schedule" && values.scheduleAt
            ? values.scheduleAt.toISOString()
            : null,
      });

      setNotice(
        values.mode === "schedule"
          ? "Reminder scheduled."
          : "Recovery email marked as sent.",
      );
      setIsMessageModalOpen(false);
      setTargetRecovery(null);
      messageForm.resetFields();
      await loadData(statusFilter, ageHours);
    } catch (err) {
      setError(err.message || "Failed to send/schedule reminder.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onMarkRecovered(recovery) {
    setError("");
    setNotice("");
    try {
      await updateAbandonedCartRecoveryStatus(recovery.id, "recovered");
      setNotice("Recovery status set to recovered.");
      await loadData(statusFilter, ageHours);
    } catch (err) {
      setError(err.message || "Failed to update recovery status.");
    }
  }

  async function onDismiss(recovery) {
    setError("");
    setNotice("");
    try {
      await updateAbandonedCartRecoveryStatus(recovery.id, "dismissed");
      setNotice("Recovery dismissed.");
      await loadData(statusFilter, ageHours);
    } catch (err) {
      setError(err.message || "Failed to dismiss recovery.");
    }
  }

  function openTemplateModal(template = null) {
    setTargetTemplate(template);
    templateForm.resetFields();
    templateForm.setFieldsValue({
      name: template?.name || "",
      subject:
        template?.subject || "You left items in your cart, {{customer_name}}",
      body:
        template?.body ||
        "Hi {{customer_name}}, you still have {{item_count}} items worth {{cart_value}} in your cart. Complete checkout: {{checkout_url}}",
      isDefault: Boolean(template?.isDefault),
    });
    setIsTemplateModalOpen(true);
  }

  async function onSaveTemplate(values) {
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      const payload = buildTemplatePayload(values);
      if (targetTemplate) {
        await updateRecoveryMessageTemplate(targetTemplate.id, payload);
        setNotice("Template updated.");
      } else {
        await createRecoveryMessageTemplate(payload);
        setNotice("Template created.");
      }
      setIsTemplateModalOpen(false);
      setTargetTemplate(null);
      templateForm.resetFields();
      await loadData(statusFilter, ageHours);
    } catch (err) {
      setError(err.message || "Failed to save template.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const recoveryColumns = [
    {
      title: "Customer",
      key: "customer",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.customerName}</Typography.Text>
          <Typography.Text type="secondary">
            {record.customerEmail || "No email on file"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Cart",
      key: "cart",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.itemCount} items</Typography.Text>
          <Typography.Text strong>
            {formatCurrency(record.cartValue)}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Last Activity",
      dataIndex: "lastActivityAt",
      key: "lastActivityAt",
      render: (value) => new Date(value).toLocaleString(),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag
          color={
            value === "recovered"
              ? "green"
              : value === "contacted"
                ? "blue"
                : "orange"
          }
        >
          {value}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openSendModal(record)}>
            Send / Schedule
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => onMarkRecovered(record)}
          >
            Mark recovered
          </Button>
          <Button size="small" danger onClick={() => onDismiss(record)}>
            Dismiss
          </Button>
        </Space>
      ),
    },
  ];

  const templateColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Subject", dataIndex: "subject", key: "subject" },
    {
      title: "Default",
      key: "default",
      render: (_, record) =>
        record.isDefault ? <Tag color="green">Default</Tag> : <Tag>Custom</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Button size="small" onClick={() => openTemplateModal(record)}>
          Edit
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        Abandoned Cart Recovery
      </Typography.Title>
      <Typography.Text type="secondary">
        Detect abandoned checkouts, run reminder outreach, and track message
        conversion.
      </Typography.Text>

      {error ? <Alert type="error" message={error} showIcon /> : null}
      {notice ? <Alert type="success" message={notice} showIcon /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Detected"
              value={performance.summary.totalDetected}
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Messages sent"
              value={performance.summary.messagesSent}
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic title="Opened" value={performance.summary.openedCount} />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Converted"
              value={performance.summary.convertedCount}
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Open rate"
              value={performance.summary.openRate}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Recovered rate"
              value={performance.summary.recoveredRate}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recovery Performance Trend">
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={performance.trend}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#e6edf1" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="sent"
                stroke="#8c8c8c"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="opened"
                stroke="#006c9c"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="converted"
                stroke="#389e0d"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        title="Abandoned Checkout List"
        extra={
          <Space wrap>
            <Select
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
              style={{ minWidth: 170 }}
            />
            <Select
              value={ageHours}
              options={ageOptions}
              onChange={setAgeHours}
              style={{ minWidth: 160 }}
            />
            <Button onClick={() => loadData(statusFilter, ageHours)}>
              Refresh detection
            </Button>
          </Space>
        }
      >
        {!isLoading && !recoveries.length ? (
          <Empty description="No abandoned carts in this range">
            <Button onClick={() => loadData(statusFilter, ageHours)}>
              Run detection again
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={recoveries}
            columns={recoveryColumns}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 920 }}
          />
        )}
      </Card>

      <Card
        title="Recovery Templates"
        extra={
          <Button type="primary" onClick={() => openTemplateModal()}>
            New template
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={templates}
          columns={templateColumns}
          pagination={false}
        />
      </Card>

      <Modal
        title={
          targetRecovery
            ? `Recovery message: ${targetRecovery.customerName}`
            : "Recovery message"
        }
        open={isMessageModalOpen}
        onCancel={() => {
          setIsMessageModalOpen(false);
          setTargetRecovery(null);
          messageForm.resetFields();
        }}
        onOk={() => messageForm.submit()}
        confirmLoading={isSubmitting}
      >
        <Form form={messageForm} layout="vertical" onFinish={onSubmitMessage}>
          <Form.Item
            name="mode"
            label="Action mode"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "send", label: "Send now" },
                { value: "schedule", label: "Schedule reminder" },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="templateId"
            label="Template"
            rules={[{ required: true }]}
          >
            <Select
              options={templates.map((item) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            shouldUpdate={(prev, next) => prev.mode !== next.mode}
            noStyle
          >
            {({ getFieldValue }) =>
              getFieldValue("mode") === "schedule" ? (
                <Form.Item
                  name="scheduleAt"
                  label="Schedule at"
                  rules={[{ required: true }]}
                >
                  <DatePicker showTime style={{ width: "100%" }} />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={targetTemplate ? "Edit template" : "Create template"}
        open={isTemplateModalOpen}
        onCancel={() => {
          setIsTemplateModalOpen(false);
          setTargetTemplate(null);
          templateForm.resetFields();
        }}
        onOk={() => templateForm.submit()}
        confirmLoading={isSubmitting}
      >
        <Form form={templateForm} layout="vertical" onFinish={onSaveTemplate}>
          <Form.Item
            name="name"
            label="Template name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="subject"
            label="Subject"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="body" label="Body" rules={[{ required: true }]}>
            <Input.TextArea rows={5} />
          </Form.Item>
          <Typography.Text type="secondary">
            {
              "Placeholders: {{customer_name}}, {{item_count}}, {{cart_value}}, {{checkout_url}}"
            }
          </Typography.Text>
        </Form>
      </Modal>
    </Space>
  );
}
