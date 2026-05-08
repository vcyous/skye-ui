import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  getTransactions,
  updatePaymentMethod,
  updateTransactionStatus,
} from "../services/api.js";

const providerOptions = [
  { value: "stripe", label: "Stripe" },
  { value: "paypal", label: "PayPal" },
  { value: "manual", label: "Manual" },
];

export default function PaymentsPage() {
  const [methods, setMethods] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [editingMethod, setEditingMethod] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  async function loadData() {
    const [methodRows, transactionRows] = await Promise.all([
      getPaymentMethods(),
      getTransactions(),
    ]);
    setMethods(methodRows);
    setTransactions(transactionRows);
  }

  useEffect(() => {
    loadData().catch((err) => {
      setNotice({
        type: "error",
        message: err.message || "Failed to load payments.",
      });
    });
  }, []);

  async function onCreate(values) {
    setNotice({ type: "", message: "" });
    try {
      await createPaymentMethod(values);
      form.resetFields();
      await loadData();
      setNotice({ type: "success", message: "Payment method created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create payment method.",
      });
    }
  }

  function openEdit(record) {
    setEditingMethod(record);
    editForm.setFieldsValue({
      provider: record.provider,
      displayName: record.displayName,
      isActive: record.isActive,
    });
  }

  async function onUpdate(values) {
    if (!editingMethod) return;
    setNotice({ type: "", message: "" });
    try {
      await updatePaymentMethod(editingMethod.id, values);
      setEditingMethod(null);
      await loadData();
      setNotice({ type: "success", message: "Payment method updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update payment method.",
      });
    }
  }

  async function onDelete(record) {
    setNotice({ type: "", message: "" });
    try {
      await deletePaymentMethod(record.id);
      await loadData();
      setNotice({ type: "success", message: "Payment method deleted." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to delete payment method.",
      });
    }
  }

  async function onTransactionStatus(record, status) {
    setNotice({ type: "", message: "" });
    try {
      await updateTransactionStatus(record.id, status);
      await loadData();
      setNotice({ type: "success", message: `Transaction marked ${status}.` });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update transaction.",
      });
    }
  }

  const methodColumns = [
    { title: "Display Name", dataIndex: "displayName", key: "displayName" },
    {
      title: "Provider",
      dataIndex: "provider",
      key: "provider",
      render: (value) => <Tag>{value}</Tag>,
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
          <Popconfirm
            title="Delete this payment method?"
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

  const transactionColumns = [
    { title: "Order", dataIndex: "orderNumber", key: "orderNumber" },
    {
      title: "Method",
      dataIndex: "paymentMethodName",
      key: "paymentMethodName",
    },
    { title: "Amount", dataIndex: "amount", key: "amount" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => onTransactionStatus(record, "authorized")}
          >
            Authorize
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => onTransactionStatus(record, "captured")}
          >
            Capture
          </Button>
          <Button
            size="small"
            danger
            onClick={() => onTransactionStatus(record, "failed")}
          >
            Fail
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Payments
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Configure payment methods and manage transaction capture.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Card title="Add Payment Method">
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreate}
          requiredMark={false}
        >
          <Space wrap style={{ width: "100%" }}>
            <Form.Item
              name="displayName"
              label="Display Name"
              rules={[{ required: true }]}
              style={{ minWidth: 220 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="provider"
              label="Provider"
              initialValue="manual"
              rules={[{ required: true }]}
              style={{ minWidth: 180 }}
            >
              <Select options={providerOptions} />
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

      <Card title="Payment Methods">
        <Table
          rowKey="id"
          columns={methodColumns}
          dataSource={methods}
          pagination={{ pageSize: 6 }}
        />
      </Card>

      <Card title="Transactions">
        <Table
          rowKey="id"
          columns={transactionColumns}
          dataSource={transactions}
          pagination={{ pageSize: 6 }}
        />
      </Card>

      <Modal
        title="Edit Payment Method"
        open={Boolean(editingMethod)}
        onCancel={() => setEditingMethod(null)}
        onOk={() => editForm.submit()}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={onUpdate}>
          <Form.Item
            name="displayName"
            label="Display Name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="provider"
            label="Provider"
            rules={[{ required: true }]}
          >
            <Select options={providerOptions} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
