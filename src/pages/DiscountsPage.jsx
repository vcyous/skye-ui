import {
  Alert,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import {
  createDiscount,
  deleteDiscount,
  getDiscounts,
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
];

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  async function loadData(nextStatus = statusFilter) {
    const rows = await getDiscounts(nextStatus);
    setDiscounts(rows);
  }

  useEffect(() => {
    loadData().catch((err) => {
      setNotice({
        type: "error",
        message: err.message || "Failed to load discounts.",
      });
    });
  }, [statusFilter]);

  function normalizePayload(values) {
    return {
      ...values,
      startsAt: values.startsAt ? values.startsAt.toISOString() : null,
      endsAt: values.endsAt ? values.endsAt.toISOString() : null,
    };
  }

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
      title: "Uses",
      key: "uses",
      render: (_, record) => `${record.usesCount}/${record.maxUses || "∞"}`,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Period",
      key: "period",
      render: (_, record) => {
        const start = record.startsAt
          ? new Date(record.startsAt).toLocaleDateString()
          : "-";
        const end = record.endsAt
          ? new Date(record.endsAt).toLocaleDateString()
          : "-";
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

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Discounts
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Configure discount rules for variants and catalog promotions.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Card title="Create Discount">
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreate}
          requiredMark={false}
        >
          <Space wrap style={{ width: "100%" }}>
            <Form.Item
              name="code"
              label="Code"
              rules={[{ required: true, message: "Code is required." }]}
              style={{ minWidth: 150 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: "Title is required." }]}
              style={{ minWidth: 260 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="discountType"
              label="Type"
              initialValue="percentage"
              rules={[{ required: true }]}
              style={{ minWidth: 180 }}
            >
              <Select options={typeOptions} />
            </Form.Item>
            <Form.Item
              name="value"
              label="Value"
              rules={[{ required: true, message: "Value is required." }]}
              style={{ minWidth: 140 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="status"
              label="Status"
              initialValue="draft"
              style={{ minWidth: 160 }}
            >
              <Select options={statusOptions} />
            </Form.Item>
            <Form.Item label=" " style={{ minWidth: 140 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                block
              >
                Create
              </Button>
            </Form.Item>
          </Space>
          <Space wrap style={{ width: "100%" }}>
            <Form.Item
              name="description"
              label="Description"
              style={{ minWidth: 320 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="minPurchaseAmount"
              label="Min Purchase"
              style={{ minWidth: 150 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="maxUses"
              label="Max Uses"
              style={{ minWidth: 120 }}
            >
              <InputNumber min={1} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="startsAt"
              label="Starts At"
              style={{ minWidth: 180 }}
            >
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="endsAt" label="Ends At" style={{ minWidth: 180 }}>
              <DatePicker showTime style={{ width: "100%" }} />
            </Form.Item>
          </Space>
        </Form>
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
        <Table
          rowKey="id"
          columns={columns}
          dataSource={discounts}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Modal
        title="Edit Discount"
        open={Boolean(editingDiscount)}
        onCancel={() => setEditingDiscount(null)}
        onOk={() => editForm.submit()}
        okText="Save changes"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={onUpdate}>
          <Form.Item name="code" label="Code" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="title" label="Title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item
            name="discountType"
            label="Type"
            rules={[{ required: true }]}
          >
            <Select options={typeOptions} />
          </Form.Item>
          <Form.Item name="value" label="Value" rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="minPurchaseAmount" label="Min Purchase">
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="maxUses" label="Max Uses">
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="startsAt" label="Starts At">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="endsAt" label="Ends At">
            <DatePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="status" label="Status">
            <Select options={statusOptions} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
