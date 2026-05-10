import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  createTaxRule,
  deleteTaxRule,
  getInvoices,
  getTaxRules,
  updateTaxRule,
} from "../services/api.js";

export default function TaxPage() {
  const [rules, setRules] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [editingRule, setEditingRule] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  function formatCurrency(value) {
    return `$${Number(value || 0).toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  async function loadData() {
    setIsLoading(true);
    const [ruleRows, invoiceRows] = await Promise.all([
      getTaxRules(),
      getInvoices(),
    ]);
    setRules(ruleRows);
    setInvoices(invoiceRows);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData().catch((err) => {
      setNotice({
        type: "error",
        message: err.message || "Failed to load tax data.",
      });
      setIsLoading(false);
    });
  }, []);

  async function onCreate(values) {
    setNotice({ type: "", message: "" });
    try {
      await createTaxRule(values);
      form.resetFields();
      await loadData();
      setNotice({ type: "success", message: "Tax rule created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create tax rule.",
      });
    }
  }

  function openEdit(record) {
    setEditingRule(record);
    editForm.setFieldsValue({
      name: record.name,
      regionCode: record.regionCode,
      taxRate: record.taxRate,
      taxBehavior: record.taxBehavior,
      priority: record.priority,
      isDefault: record.isDefault,
      isActive: record.isActive,
    });
  }

  async function onUpdate(values) {
    if (!editingRule) return;
    setNotice({ type: "", message: "" });
    try {
      await updateTaxRule(editingRule.id, values);
      setEditingRule(null);
      await loadData();
      setNotice({ type: "success", message: "Tax rule updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update tax rule.",
      });
    }
  }

  async function onDelete(record) {
    setNotice({ type: "", message: "" });
    try {
      await deleteTaxRule(record.id);
      await loadData();
      setNotice({ type: "success", message: "Tax rule deleted." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to delete tax rule.",
      });
    }
  }

  const ruleColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Region", dataIndex: "regionCode", key: "regionCode" },
    { title: "Rate %", dataIndex: "taxRate", key: "taxRate" },
    {
      title: "Behavior",
      dataIndex: "taxBehavior",
      key: "taxBehavior",
      render: (value) =>
        value === "inclusive" ? (
          <Tag color="gold">inclusive</Tag>
        ) : (
          <Tag color="blue">exclusive</Tag>
        ),
    },
    { title: "Priority", dataIndex: "priority", key: "priority" },
    {
      title: "Default",
      dataIndex: "isDefault",
      key: "isDefault",
      render: (value) =>
        value ? <Tag color="cyan">default</Tag> : <Tag>-</Tag>,
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
        <Space>
          <Button size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Button size="small" danger onClick={() => onDelete(record)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  const invoiceColumns = [
    { title: "Invoice", dataIndex: "invoiceNumber", key: "invoiceNumber" },
    { title: "Order", dataIndex: "orderNumber", key: "orderNumber" },
    {
      title: "Behavior",
      dataIndex: "taxBehavior",
      key: "taxBehavior",
      render: (value) =>
        value === "inclusive" ? (
          <Tag color="gold">inclusive</Tag>
        ) : (
          <Tag color="blue">exclusive</Tag>
        ),
    },
    {
      title: "Tax Rate",
      dataIndex: "taxRate",
      key: "taxRate",
      render: (value) => `${Number(value || 0).toFixed(2)}%`,
    },
    {
      title: "Taxable",
      dataIndex: "taxableAmount",
      key: "taxableAmount",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Tax",
      dataIndex: "taxAmount",
      key: "taxAmount",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Total",
      dataIndex: "total",
      key: "total",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag>{value || "issued"}</Tag>,
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <Spin />
      </Card>
    );
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Tax and Invoices
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Maintain tax rules and generated invoice records.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Card title="Add Tax Rule">
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreate}
          requiredMark={false}
        >
          <Space wrap style={{ width: "100%" }}>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true }]}
              style={{ minWidth: 220 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="regionCode"
              label="Region Code"
              rules={[{ required: true }]}
              style={{ minWidth: 180 }}
            >
              <Input placeholder="Indonesia" />
            </Form.Item>
            <Form.Item
              name="taxRate"
              label="Tax Rate %"
              initialValue={11}
              style={{ minWidth: 160 }}
            >
              <InputNumber
                min={0}
                max={100}
                step={0.01}
                style={{ width: "100%" }}
              />
            </Form.Item>
            <Form.Item
              name="taxBehavior"
              label="Tax Behavior"
              initialValue="exclusive"
              style={{ minWidth: 180 }}
            >
              <Select
                options={[
                  { value: "exclusive", label: "Tax Exclusive" },
                  { value: "inclusive", label: "Tax Inclusive" },
                ]}
              />
            </Form.Item>
            <Form.Item
              name="priority"
              label="Priority"
              initialValue={100}
              style={{ minWidth: 140 }}
            >
              <InputNumber min={1} max={999} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="isDefault"
              label="Default"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="isActive"
              label="Active"
              valuePropName="checked"
              initialValue
            >
              <Switch />
            </Form.Item>
            <Form.Item label=" ">
              <Button type="primary" htmlType="submit">
                Create
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card title="Tax Rules">
        {rules.length ? (
          <Table
            rowKey="id"
            columns={ruleColumns}
            dataSource={rules}
            pagination={{ pageSize: 6 }}
          />
        ) : (
          <Empty
            description="No tax rules yet. Create your first rule."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
      <Card title="Invoices">
        {invoices.length ? (
          <Table
            rowKey="id"
            columns={invoiceColumns}
            dataSource={invoices}
            pagination={{ pageSize: 6 }}
          />
        ) : (
          <Empty
            description="No invoices generated yet."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      <Modal
        title="Edit Tax Rule"
        open={Boolean(editingRule)}
        onCancel={() => setEditingRule(null)}
        onOk={() => editForm.submit()}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={onUpdate}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="regionCode"
            label="Region Code"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="taxRate" label="Tax Rate %">
            <InputNumber
              min={0}
              max={100}
              step={0.01}
              style={{ width: "100%" }}
            />
          </Form.Item>
          <Form.Item name="taxBehavior" label="Tax Behavior">
            <Select
              options={[
                { value: "exclusive", label: "Tax Exclusive" },
                { value: "inclusive", label: "Tax Inclusive" },
              ]}
            />
          </Form.Item>
          <Form.Item name="priority" label="Priority">
            <InputNumber min={1} max={999} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="isDefault" label="Default" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
