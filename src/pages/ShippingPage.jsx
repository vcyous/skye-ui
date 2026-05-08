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
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  createShipment,
  createShippingMethod,
  deleteShippingMethod,
  getOrders,
  getShipments,
  getShippingMethods,
  updateShipmentStatus,
  updateShippingMethod,
} from "../services/api.js";

const shippingTypeOptions = [
  { value: "flat_rate", label: "Flat Rate" },
  { value: "weight_based", label: "Weight Based" },
  { value: "zone_based", label: "Zone Based" },
];

export default function ShippingPage() {
  const [methods, setMethods] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [editingMethod, setEditingMethod] = useState(null);
  const [createShipmentOpen, setCreateShipmentOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [shipmentForm] = Form.useForm();

  async function loadData() {
    const [methodRows, shipmentRows, orderRows] = await Promise.all([
      getShippingMethods(),
      getShipments(),
      getOrders("all"),
    ]);
    setMethods(methodRows);
    setShipments(shipmentRows);
    setOrders(orderRows);
  }

  useEffect(() => {
    loadData().catch((err) =>
      setNotice({
        type: "error",
        message: err.message || "Failed to load shipping data.",
      }),
    );
  }, []);

  async function onCreate(values) {
    setNotice({ type: "", message: "" });
    try {
      await createShippingMethod(values);
      form.resetFields();
      await loadData();
      setNotice({ type: "success", message: "Shipping method created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create shipping method.",
      });
    }
  }

  function openEdit(record) {
    setEditingMethod(record);
    editForm.setFieldsValue({
      name: record.name,
      shippingType: record.shippingType,
      baseRate: record.baseRate,
      isActive: record.isActive,
    });
  }

  async function onUpdate(values) {
    if (!editingMethod) return;
    setNotice({ type: "", message: "" });
    try {
      await updateShippingMethod(editingMethod.id, values);
      setEditingMethod(null);
      await loadData();
      setNotice({ type: "success", message: "Shipping method updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update shipping method.",
      });
    }
  }

  async function onDelete(record) {
    setNotice({ type: "", message: "" });
    try {
      await deleteShippingMethod(record.id);
      await loadData();
      setNotice({ type: "success", message: "Shipping method deleted." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to delete shipping method.",
      });
    }
  }

  async function onCreateShipment(values) {
    setNotice({ type: "", message: "" });
    try {
      await createShipment(values);
      shipmentForm.resetFields();
      setCreateShipmentOpen(false);
      await loadData();
      setNotice({ type: "success", message: "Shipment created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create shipment.",
      });
    }
  }

  async function onShipmentStatus(record, status) {
    setNotice({ type: "", message: "" });
    try {
      await updateShipmentStatus(record.id, status);
      await loadData();
      setNotice({ type: "success", message: `Shipment marked ${status}.` });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update shipment.",
      });
    }
  }

  const methodColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Type",
      dataIndex: "shippingType",
      key: "shippingType",
      render: (value) => <Tag>{value}</Tag>,
    },
    { title: "Base Rate", dataIndex: "baseRate", key: "baseRate" },
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

  const shipmentColumns = [
    { title: "Order", dataIndex: "orderNumber", key: "orderNumber" },
    {
      title: "Method",
      dataIndex: "shippingMethodName",
      key: "shippingMethodName",
    },
    { title: "Tracking", dataIndex: "trackingNumber", key: "trackingNumber" },
    { title: "Carrier", dataIndex: "carrier", key: "carrier" },
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
            onClick={() => onShipmentStatus(record, "shipped")}
          >
            Ship
          </Button>
          <Button
            size="small"
            type="primary"
            onClick={() => onShipmentStatus(record, "delivered")}
          >
            Deliver
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Shipping
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Manage shipping methods and create shipments for orders.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Card
        title="Add Shipping Method"
        extra={
          <Button onClick={() => setCreateShipmentOpen(true)}>
            Create Shipment
          </Button>
        }
      >
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
              name="shippingType"
              label="Type"
              initialValue="flat_rate"
              rules={[{ required: true }]}
              style={{ minWidth: 180 }}
            >
              <Select options={shippingTypeOptions} />
            </Form.Item>
            <Form.Item
              name="baseRate"
              label="Base Rate"
              initialValue={0}
              style={{ minWidth: 160 }}
            >
              <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
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

      <Card title="Shipping Methods">
        <Table
          rowKey="id"
          columns={methodColumns}
          dataSource={methods}
          pagination={{ pageSize: 6 }}
        />
      </Card>
      <Card title="Shipments">
        <Table
          rowKey="id"
          columns={shipmentColumns}
          dataSource={shipments}
          pagination={{ pageSize: 6 }}
        />
      </Card>

      <Modal
        title="Edit Shipping Method"
        open={Boolean(editingMethod)}
        onCancel={() => setEditingMethod(null)}
        onOk={() => editForm.submit()}
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={onUpdate}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="shippingType"
            label="Type"
            rules={[{ required: true }]}
          >
            <Select options={shippingTypeOptions} />
          </Form.Item>
          <Form.Item name="baseRate" label="Base Rate">
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Create Shipment"
        open={createShipmentOpen}
        onCancel={() => setCreateShipmentOpen(false)}
        onOk={() => shipmentForm.submit()}
        destroyOnClose
      >
        <Form form={shipmentForm} layout="vertical" onFinish={onCreateShipment}>
          <Form.Item name="orderId" label="Order" rules={[{ required: true }]}>
            <Select
              options={orders.map((item) => ({
                value: item.id,
                label: item.orderNumber,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="shippingMethodId"
            label="Shipping Method"
            rules={[{ required: true }]}
          >
            <Select
              options={methods
                .filter((item) => item.isActive)
                .map((item) => ({ value: item.id, label: item.name }))}
            />
          </Form.Item>
          <Form.Item name="carrier" label="Carrier">
            <Input />
          </Form.Item>
          <Form.Item name="trackingNumber" label="Tracking Number">
            <Input />
          </Form.Item>
          <Form.Item name="status" label="Status" initialValue="pending">
            <Select
              options={[
                { value: "pending", label: "Pending" },
                { value: "shipped", label: "Shipped" },
                { value: "delivered", label: "Delivered" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
}
