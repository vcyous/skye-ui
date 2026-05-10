import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useLocalization } from "../context/LocalizationContext.jsx";
import {
  createDiscount,
  deleteDiscount,
  getDiscounts,
  previewDiscountOutcome,
  updateDiscount,
} from "../services/api.js";

const statusOptions = ["active", "draft", "inactive", "expired"].map(
  (value) => ({
    value,
    label: value,
  }),
);

const typeOptions = [
  { value: "percentage", label: "Percentage" },
  { value: "fixed_amount", label: "Fixed Amount" },
  { value: "buy_x_get_y", label: "Buy X Get Y" },
];

const appliesToOptions = [
  { value: "order", label: "Entire order" },
  { value: "product", label: "Specific products" },
  { value: "collection", label: "Specific collections" },
];

function normalizePayload(values) {
  return {
    ...values,
    startsAt: values.startsAt ? values.startsAt.toISOString() : null,
    endsAt: values.endsAt ? values.endsAt.toISOString() : null,
    scopeProductIds: String(values.scopeProductIds || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    scopeCollectionIds: String(values.scopeCollectionIds || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  };
}

export default function DiscountsPage() {
  const { formatDate } = useLocalization();
  const [discounts, setDiscounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [previewCodes, setPreviewCodes] = useState("");
  const [previewSubtotal, setPreviewSubtotal] = useState(100);
  const [previewItemCount, setPreviewItemCount] = useState(1);

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const createDiscountType = Form.useWatch("discountType", form);
  const editDiscountType = Form.useWatch("discountType", editForm);

  async function loadData(nextStatus = statusFilter) {
    setLoadError("");
    setIsLoading(true);
    try {
      const rows = await getDiscounts(nextStatus);
      setDiscounts(rows);
    } catch (err) {
      setLoadError(err.message || "Failed to load discounts.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function onCreate(values) {
    setNotice({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      await createDiscount(normalizePayload(values));
      form.resetFields();
      await loadData();
      setNotice({ type: "success", message: "Discount created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create discount.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEdit(record) {
    setEditingDiscount(record);
    editForm.setFieldsValue({
      code: record.code,
      title: record.title,
      description: record.description,
      discountType: record.discountType,
      value: record.value,
      minPurchaseAmount: record.minPurchaseAmount || null,
      maxUses: record.maxUses,
      startsAt: record.startsAt ? dayjs(record.startsAt) : null,
      endsAt: record.endsAt ? dayjs(record.endsAt) : null,
      stackable: Boolean(record.stackable),
      priority: Number(record.priority || 100),
      appliesTo: record.appliesTo || "order",
      scopeProductIds: (record.scopeProductIds || []).join(", "),
      scopeCollectionIds: (record.scopeCollectionIds || []).join(", "),
      buyXQty: record.buyXQty || null,
      buyYQty: record.buyYQty || null,
      buyXProductId: record.buyXProductId || "",
      getYProductId: record.getYProductId || "",
      status: record.status,
    });
  }

  async function onUpdate(values) {
    if (!editingDiscount) return;
    setNotice({ type: "", message: "" });
    try {
      await updateDiscount(editingDiscount.id, normalizePayload(values));
      setEditingDiscount(null);
      await loadData();
      setNotice({ type: "success", message: "Discount updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update discount.",
      });
    }
  }

  async function onDelete(record) {
    setNotice({ type: "", message: "" });
    try {
      await deleteDiscount(record.id);
      await loadData();
      setNotice({ type: "success", message: "Discount deleted." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to delete discount.",
      });
    }
  }

  async function onRunPreview() {
    setNotice({ type: "", message: "" });
    setIsPreviewing(true);
    try {
      const result = await previewDiscountOutcome({
        subtotal: previewSubtotal,
        cartItemCount: previewItemCount,
        codes: previewCodes,
      });
      setPreviewResult(result);
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to run preview.",
      });
    } finally {
      setIsPreviewing(false);
    }
  }

  const metrics = useMemo(
    () => ({
      total: discounts.length,
      active: discounts.filter((item) => item.status === "active").length,
      stackable: discounts.filter((item) => item.stackable).length,
      bxgy: discounts.filter((item) => item.discountType === "buy_x_get_y")
        .length,
    }),
    [discounts],
  );

  const columns = [
    { title: "Code", dataIndex: "code", key: "code" },
    { title: "Title", dataIndex: "title", key: "title" },
    {
      title: "Type",
      dataIndex: "discountType",
      key: "discountType",
      render: (value) => <Tag>{value}</Tag>,
    },
    { title: "Value", dataIndex: "value", key: "value" },
    {
      title: "Stacking",
      key: "stackable",
      render: (_, record) =>
        record.stackable ? (
          <Tag color="green">stackable</Tag>
        ) : (
          <Tag>single</Tag>
        ),
    },
    {
      title: "Priority",
      dataIndex: "priority",
      key: "priority",
      render: (value) => value ?? 100,
    },
    {
      title: "Uses",
      key: "uses",
      render: (_, record) => `${record.usesCount}/${record.maxUses || "∞"}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag color={value === "active" ? "green" : "blue"}>{value}</Tag>
      ),
    },
    {
      title: "Period",
      key: "period",
      render: (_, record) => {
        const start = record.startsAt ? formatDate(record.startsAt) : "-";
        const end = record.endsAt ? formatDate(record.endsAt) : "-";
        return `${start} to ${end}`;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this discount?"
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => onDelete(record)}
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderDiscountForm = (currentType) => {
    return (
      <>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={6}>
            <Form.Item name="code" label="Code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={10}>
            <Form.Item name="title" label="Title" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name="description" label="Description">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              name="discountType"
              label="Type"
              rules={[{ required: true }]}
            >
              <Select options={typeOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item name="value" label="Value" rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={5}>
            <Form.Item
              name="status"
              label="Status"
              rules={[{ required: true }]}
            >
              <Select options={statusOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={5}>
            <Form.Item name="appliesTo" label="Applies To">
              <Select options={appliesToOptions} />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item name="priority" label="Priority">
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item
              name="stackable"
              label="Stackable"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item name="minPurchaseAmount" label="Min Purchase">
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={4}>
            <Form.Item name="maxUses" label="Max Uses">
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={5}>
            <Form.Item name="startsAt" label="Starts At">
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={5}>
            <Form.Item name="endsAt" label="Ends At">
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="scopeProductIds"
              label="Scope Product IDs (comma separated)"
            >
              <Input placeholder="uuid-1, uuid-2" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="scopeCollectionIds"
              label="Scope Collection IDs (comma separated)"
            >
              <Input placeholder="uuid-1, uuid-2" />
            </Form.Item>
          </Col>
          {currentType === "buy_x_get_y" ? (
            <>
              <Col xs={24} md={4}>
                <Form.Item
                  name="buyXQty"
                  label="Buy Qty"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={4}>
                <Form.Item
                  name="buyYQty"
                  label="Get Qty"
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="buyXProductId" label="Buy Product ID">
                  <Input />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="getYProductId" label="Get Product ID">
                  <Input />
                </Form.Item>
              </Col>
            </>
          ) : null}
        </Row>
      </>
    );
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Discounts
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Configure promotion eligibility, stacking policies, and preview
          outcomes before launch.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      {loadError ? (
        <Alert
          type="error"
          showIcon
          message="Failed to load discounts"
          description={
            <Space direction="vertical">
              <Typography.Text>{loadError}</Typography.Text>
              <Button onClick={() => loadData()}>Retry</Button>
            </Space>
          }
        />
      ) : null}

      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card size="small" title="Total">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.total}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Active">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.active}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Stackable">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.stackable}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Buy X Get Y">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.bxgy}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="Create Discount">
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreate}
          requiredMark={false}
          initialValues={{
            discountType: "percentage",
            status: "draft",
            stackable: false,
            priority: 100,
            appliesTo: "order",
          }}
        >
          {renderDiscountForm(createDiscountType)}
          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Create Discount
          </Button>
        </Form>
      </Card>

      <Card title="Discount Preview Simulator">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Codes (comma separated)"
              value={previewCodes}
              onChange={(event) => setPreviewCodes(event.target.value)}
            />
          </Col>
          <Col xs={24} md={5}>
            <InputNumber
              min={0}
              style={{ width: "100%" }}
              value={previewSubtotal}
              onChange={(value) => setPreviewSubtotal(Number(value || 0))}
              addonBefore="Subtotal"
            />
          </Col>
          <Col xs={24} md={5}>
            <InputNumber
              min={1}
              style={{ width: "100%" }}
              value={previewItemCount}
              onChange={(value) => setPreviewItemCount(Number(value || 1))}
              addonBefore="Items"
            />
          </Col>
          <Col xs={24} md={6}>
            <Button
              type="primary"
              onClick={onRunPreview}
              loading={isPreviewing}
              block
            >
              Run Preview
            </Button>
          </Col>
        </Row>

        {previewResult ? (
          <Card size="small" style={{ marginTop: 12 }}>
            <Typography.Paragraph>
              Total discount: <strong>{previewResult.totalDiscount}</strong> |
              Estimated total: <strong>{previewResult.estimatedTotal}</strong>
            </Typography.Paragraph>
            <Typography.Text strong>Applied</Typography.Text>
            <Table
              style={{ marginTop: 8 }}
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={previewResult.applied}
              columns={[
                { title: "Code", dataIndex: "code", key: "code" },
                { title: "Title", dataIndex: "title", key: "title" },
                { title: "Amount", dataIndex: "amount", key: "amount" },
                {
                  title: "Stackable",
                  dataIndex: "stackable",
                  key: "stackable",
                  render: (value) => (value ? "yes" : "no"),
                },
                { title: "Priority", dataIndex: "priority", key: "priority" },
              ]}
            />
            <Typography.Text strong style={{ display: "block", marginTop: 10 }}>
              Rejected
            </Typography.Text>
            <Table
              style={{ marginTop: 8 }}
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={previewResult.rejected}
              columns={[
                { title: "Code", dataIndex: "code", key: "code" },
                { title: "Reason", dataIndex: "reason", key: "reason" },
              ]}
            />
          </Card>
        ) : null}
      </Card>

      <Card
        title="Discount List"
        extra={
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 160 }}
            options={[{ value: "all", label: "All" }, ...statusOptions]}
          />
        }
      >
        {isLoading ? (
          <Typography.Text>Loading discounts...</Typography.Text>
        ) : discounts.length ? (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={discounts}
            pagination={{ pageSize: 8 }}
          />
        ) : (
          <Empty description="No discounts yet. Create your first promotion." />
        )}
      </Card>

      <Modal
        title="Edit Discount"
        open={Boolean(editingDiscount)}
        onCancel={() => setEditingDiscount(null)}
        onOk={() => editForm.submit()}
        okText="Save changes"
        destroyOnClose
        width={920}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={onUpdate}
          initialValues={{
            stackable: false,
            priority: 100,
            appliesTo: "order",
          }}
        >
          {renderDiscountForm(editDiscountType)}
        </Form>
      </Modal>
    </section>
  );
}
