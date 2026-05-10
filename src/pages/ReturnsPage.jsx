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
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  createReturnRequest,
  getOrders,
  getRefunds,
  getReturns,
  processRefund,
  updateReturnStatus,
} from "../services/api.js";

const RETURN_REASON_OPTIONS = [
  { value: "wrong_size", label: "Wrong Size" },
  { value: "wrong_item", label: "Wrong Item" },
  { value: "damaged", label: "Damaged" },
  { value: "defective", label: "Defective" },
  { value: "not_as_described", label: "Not As Described" },
  { value: "changed_mind", label: "Changed Mind" },
  { value: "late_delivery", label: "Late Delivery" },
  { value: "other", label: "Other" },
];

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [requestOpen, setRequestOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [requestForm] = Form.useForm();
  const [refundForm] = Form.useForm();

  async function loadData() {
    setIsLoading(true);
    const [returnRows, refundRows, orderRows] = await Promise.all([
      getReturns(),
      getRefunds(),
      getOrders("all"),
    ]);
    setReturns(returnRows);
    setRefunds(refundRows);
    setOrders(orderRows);
    setIsLoading(false);
  }

  useEffect(() => {
    loadData().catch((err) => {
      setNotice({
        type: "error",
        message: err.message || "Failed to load returns.",
      });
      setIsLoading(false);
    });
  }, []);

  async function onCreateReturn(values) {
    setNotice({ type: "", message: "" });
    try {
      await createReturnRequest(values);
      requestForm.resetFields();
      setRequestOpen(false);
      await loadData();
      setNotice({ type: "success", message: "Return request created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create return request.",
      });
    }
  }

  async function onUpdateReturn(record, status) {
    setNotice({ type: "", message: "" });
    try {
      await updateReturnStatus(record.id, status);
      await loadData();
      setNotice({ type: "success", message: `Return marked ${status}.` });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update return.",
      });
    }
  }

  async function onRefund(values) {
    setNotice({ type: "", message: "" });
    try {
      await processRefund(values);
      refundForm.resetFields();
      setRefundOpen(false);
      await loadData();
      setNotice({ type: "success", message: "Refund processed." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to process refund.",
      });
    }
  }

  function openRefundModal() {
    setRefundOpen(true);
    if (returns.length) {
      refundForm.setFieldValue("returnId", returns[0].id);
    }
    refundForm.setFieldValue("reasonCode", "other");
  }

  const returnStatusColor = {
    pending: "gold",
    approved: "blue",
    received: "cyan",
    rejected: "red",
    refunded: "green",
  };

  const returnColumns = [
    { title: "RMA", dataIndex: "rmaNumber", key: "rmaNumber" },
    { title: "Order", dataIndex: "orderNumber", key: "orderNumber" },
    {
      title: "Reason Code",
      dataIndex: "reasonCode",
      key: "reasonCode",
      render: (value) => (
        <Tag>{String(value || "other").replaceAll("_", " ")}</Tag>
      ),
    },
    { title: "Reason", dataIndex: "reason", key: "reason" },
    {
      title: "Refunded",
      dataIndex: "refundedAmount",
      key: "refundedAmount",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag color={returnStatusColor[value] || "blue"}>{value}</Tag>
      ),
    },
    {
      title: "Requested",
      dataIndex: "requestedAt",
      key: "requestedAt",
      render: (value) => (value ? new Date(value).toLocaleString() : "-"),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Select
          size="small"
          style={{ width: 170 }}
          placeholder="Change status"
          options={(record.availableStatuses || [])
            .filter((status) => status !== record.status)
            .map((status) => ({
              value: status,
              label: status,
            }))}
          onChange={(value) => onUpdateReturn(record, value)}
        />
      ),
    },
  ];

  const refundColumns = [
    { title: "RMA", dataIndex: "rmaNumber", key: "rmaNumber" },
    {
      title: "Type",
      dataIndex: "refundType",
      key: "refundType",
      render: (value) => (
        <Tag color={value === "full" ? "green" : "gold"}>{value}</Tag>
      ),
    },
    {
      title: "Amount",
      dataIndex: "amount",
      key: "amount",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Reason",
      dataIndex: "reasonCode",
      key: "reasonCode",
      render: (value) => String(value || "other").replaceAll("_", " "),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "Created",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => new Date(value).toLocaleString(),
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
          Returns and Refunds
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Review return requests and process refunds against completed orders.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Card
        title="Actions"
        extra={
          <Space>
            <Button onClick={() => setRequestOpen(true)}>Create Return</Button>
            <Button type="primary" onClick={openRefundModal}>
              Process Refund
            </Button>
          </Space>
        }
      >
        <Typography.Text type="secondary">
          Use return requests to track post-purchase issues and process refunds
          against recorded transactions.
        </Typography.Text>
      </Card>

      <Card title="Return Requests">
        {returns.length ? (
          <Table
            rowKey="id"
            columns={returnColumns}
            dataSource={returns}
            pagination={{ pageSize: 6 }}
          />
        ) : (
          <Empty
            description="No return requests yet."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>
      <Card title="Refunds">
        {refunds.length ? (
          <Table
            rowKey="id"
            columns={refundColumns}
            dataSource={refunds}
            pagination={{ pageSize: 6 }}
          />
        ) : (
          <Empty
            description="No refunds processed yet."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        )}
      </Card>

      <Modal
        title="Create Return Request"
        open={requestOpen}
        onCancel={() => setRequestOpen(false)}
        onOk={() => requestForm.submit()}
        destroyOnClose
      >
        <Form form={requestForm} layout="vertical" onFinish={onCreateReturn}>
          <Form.Item name="orderId" label="Order" rules={[{ required: true }]}>
            <Select
              options={orders.map((item) => ({
                value: item.id,
                label: item.orderNumber,
              }))}
            />
          </Form.Item>
          <Form.Item name="reason" label="Reason">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            name="reasonCode"
            label="Reason Code"
            initialValue="other"
            rules={[{ required: true }]}
          >
            <Select options={RETURN_REASON_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Process Refund"
        open={refundOpen}
        onCancel={() => setRefundOpen(false)}
        onOk={() => refundForm.submit()}
        destroyOnClose
      >
        <Form form={refundForm} layout="vertical" onFinish={onRefund}>
          <Form.Item
            name="returnId"
            label="Return"
            rules={[{ required: true }]}
          >
            <Select
              options={returns.map((item) => ({
                value: item.id,
                label: `${item.rmaNumber} · ${item.orderNumber}`,
              }))}
            />
          </Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}>
            <InputNumber min={0.01} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            name="reasonCode"
            label="Reason Code"
            initialValue="other"
            rules={[{ required: true }]}
          >
            <Select options={RETURN_REASON_OPTIONS} />
          </Form.Item>
          <Form.Item name="note" label="Refund Note">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
