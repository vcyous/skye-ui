import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
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

export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [refunds, setRefunds] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [requestOpen, setRequestOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [requestForm] = Form.useForm();
  const [refundForm] = Form.useForm();

  async function loadData() {
    const [returnRows, refundRows, orderRows] = await Promise.all([
      getReturns(),
      getRefunds(),
      getOrders("all"),
    ]);
    setReturns(returnRows);
    setRefunds(refundRows);
    setOrders(orderRows);
  }

  useEffect(() => {
    loadData().catch((err) =>
      setNotice({
        type: "error",
        message: err.message || "Failed to load returns.",
      }),
    );
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

  const returnColumns = [
    { title: "RMA", dataIndex: "rmaNumber", key: "rmaNumber" },
    { title: "Order", dataIndex: "orderNumber", key: "orderNumber" },
    { title: "Reason", dataIndex: "reason", key: "reason" },
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
            onClick={() => onUpdateReturn(record, "approved")}
          >
            Approve
          </Button>
          <Button
            size="small"
            onClick={() => onUpdateReturn(record, "received")}
          >
            Receive
          </Button>
          <Button
            size="small"
            danger
            onClick={() => onUpdateReturn(record, "rejected")}
          >
            Reject
          </Button>
        </Space>
      ),
    },
  ];

  const refundColumns = [
    { title: "RMA", dataIndex: "rmaNumber", key: "rmaNumber" },
    { title: "Amount", dataIndex: "amount", key: "amount" },
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
            <Button type="primary" onClick={() => setRefundOpen(true)}>
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
        <Table
          rowKey="id"
          columns={returnColumns}
          dataSource={returns}
          pagination={{ pageSize: 6 }}
        />
      </Card>
      <Card title="Refunds">
        <Table
          rowKey="id"
          columns={refundColumns}
          dataSource={refunds}
          pagination={{ pageSize: 6 }}
        />
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
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
