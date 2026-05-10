import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  createPaymentMethod,
  deletePaymentMethod,
  getPaymentMethods,
  getTransactions,
  getTransactionStatusOptions,
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
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [updatingTransactionId, setUpdatingTransactionId] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [editingMethod, setEditingMethod] = useState(null);
  const [transactionModal, setTransactionModal] = useState({
    open: false,
    transaction: null,
  });
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [transactionForm] = Form.useForm();

  async function loadData() {
    setLoading(true);
    setLoadError("");
    try {
      const [methodRows, transactionRows] = await Promise.all([
        getPaymentMethods(),
        getTransactions(),
      ]);
      setMethods(methodRows);
      setTransactions(transactionRows);
    } catch (err) {
      setLoadError(err.message || "Failed to load payments.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const metrics = useMemo(
    () => ({
      methods: methods.length,
      transactions: transactions.length,
      failed: transactions.filter((item) => item.status === "failed").length,
      unresolved: transactions.filter((item) =>
        ["pending", "authorized", "partially_captured"].includes(item.status),
      ).length,
    }),
    [methods, transactions],
  );

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
    setUpdatingTransactionId(record.id);
    setNotice({ type: "", message: "" });
    try {
      await updateTransactionStatus(record.id, status, {
        note: `Transaction moved to ${status}`,
      });
      await loadData();
      setNotice({ type: "success", message: `Transaction marked ${status}.` });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update transaction.",
      });
    } finally {
      setUpdatingTransactionId("");
    }
  }

  function openTransactionModal(record) {
    setTransactionModal({ open: true, transaction: record });
    transactionForm.setFieldsValue({
      status: record.status,
      captureAmount: undefined,
      referenceId: "",
      providerStatus: record.providerStatus || record.status,
      failureCode: record.failureCode || "",
      failureMessage: "",
      note: "",
    });
  }

  async function onSubmitTransactionUpdate(values) {
    const record = transactionModal.transaction;
    if (!record) {
      return;
    }

    setUpdatingTransactionId(record.id);
    setNotice({ type: "", message: "" });
    try {
      await updateTransactionStatus(record.id, values.status, values);
      setTransactionModal({ open: false, transaction: null });
      transactionForm.resetFields();
      await loadData();
      setNotice({
        type: "success",
        message: `Transaction updated to ${values.status}.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update transaction.",
      });
    } finally {
      setUpdatingTransactionId("");
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
    {
      title: "Amount",
      key: "amount",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.amount}</Typography.Text>
          <Typography.Text type="secondary">
            Captured: {record.capturedAmount}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value, record) => (
        <Space>
          <Tag color="blue">{value}</Tag>
          {record.failureCode ? (
            <Tag color="red">{record.failureCode}</Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "References",
      key: "references",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>
            {record.gatewayTransactionId || "-"}
          </Typography.Text>
          <Typography.Text type="secondary">
            Attempts: {record.attemptCount || 0}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openTransactionModal(record)}>
            Update
          </Button>
          {record.status === "failed" || record.status === "voided" ? (
            <Button
              size="small"
              loading={updatingTransactionId === record.id}
              onClick={() => onTransactionStatus(record, "pending")}
            >
              Retry
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  if (loading) {
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
          Payments
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Configure payment methods and manage transaction capture.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      {loadError ? (
        <Alert
          type="error"
          showIcon
          message={loadError}
          action={<Button onClick={loadData}>Retry</Button>}
        />
      ) : null}

      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card size="small" title="Methods">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.methods}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Transactions">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.transactions}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Failed">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.failed}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Unresolved">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.unresolved}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

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
        {methods.length ? (
          <Table
            rowKey="id"
            columns={methodColumns}
            dataSource={methods}
            pagination={{ pageSize: 6 }}
          />
        ) : (
          <Empty description="No payment methods yet. Add one to start capturing transactions." />
        )}
      </Card>

      <Card title="Transactions">
        {transactions.length ? (
          <Table
            rowKey="id"
            columns={transactionColumns}
            dataSource={transactions}
            expandable={{
              expandedRowRender: (record) =>
                record.attempts?.length ? (
                  <List
                    size="small"
                    dataSource={record.attempts}
                    renderItem={(attempt) => (
                      <List.Item key={attempt.id}>
                        <List.Item.Meta
                          title={`${attempt.eventType} · ${attempt.status}`}
                          description={`${attempt.referenceId || "-"} · ${new Date(attempt.createdAt).toLocaleString()}`}
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Typography.Text type="secondary">
                    No attempt history yet.
                  </Typography.Text>
                ),
            }}
            pagination={{ pageSize: 6 }}
          />
        ) : (
          <Empty description="No transactions recorded yet." />
        )}
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

      <Modal
        title="Update Transaction"
        open={transactionModal.open}
        onCancel={() => setTransactionModal({ open: false, transaction: null })}
        onOk={() => transactionForm.submit()}
        confirmLoading={Boolean(updatingTransactionId)}
        destroyOnClose
      >
        <Form
          form={transactionForm}
          layout="vertical"
          onFinish={onSubmitTransactionUpdate}
        >
          <Form.Item
            name="status"
            label="Target Status"
            rules={[{ required: true }]}
          >
            <Select
              options={getTransactionStatusOptions(
                transactionModal.transaction?.status || "pending",
              )}
            />
          </Form.Item>
          <Form.Item name="providerStatus" label="Provider Status">
            <Input placeholder="e.g. succeeded, requires_capture" />
          </Form.Item>
          <Form.Item
            name="captureAmount"
            label="Capture Amount (for partial/full capture)"
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="referenceId" label="Reference ID">
            <Input placeholder="Gateway reference" />
          </Form.Item>
          <Form.Item name="failureCode" label="Failure Code">
            <Input placeholder="DECLINED / TIMEOUT" />
          </Form.Item>
          <Form.Item name="failureMessage" label="Failure Message">
            <Input placeholder="Additional failure detail" />
          </Form.Item>
          <Form.Item name="note" label="Note">
            <Input placeholder="Operator note" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
