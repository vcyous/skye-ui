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
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  createShipment,
  createShippingMethod,
  createShippingZone,
  deleteShippingMethod,
  deleteShippingZone,
  getOrderFulfillmentItems,
  getOrders,
  getShipments,
  getShippingMethods,
  getShippingZones,
  updateShipmentStatus,
  updateShippingMethod,
  updateShippingZone,
} from "../services/api.js";

const shippingTypeOptions = [
  { value: "flat_rate", label: "Flat Rate" },
  { value: "weight_based", label: "Weight Based" },
  { value: "zone_based", label: "Zone Based" },
];

export default function ShippingPage() {
  const [methods, setMethods] = useState([]);
  const [zones, setZones] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [savingShipment, setSavingShipment] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [fulfillmentItems, setFulfillmentItems] = useState([]);
  const [shipmentItemQty, setShipmentItemQty] = useState({});
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [editingMethod, setEditingMethod] = useState(null);
  const [editingZone, setEditingZone] = useState(null);
  const [createShipmentOpen, setCreateShipmentOpen] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [zoneForm] = Form.useForm();
  const [editZoneForm] = Form.useForm();
  const [shipmentForm] = Form.useForm();

  async function loadData() {
    setLoading(true);
    setLoadError("");
    try {
      const [methodRows, zoneRows, shipmentRows, orderRows] = await Promise.all(
        [
          getShippingMethods(),
          getShippingZones(),
          getShipments(),
          getOrders("semua_orders"),
        ],
      );
      setMethods(methodRows);
      setZones(zoneRows);
      setShipments(shipmentRows);
      setOrders(orderRows);
    } catch (err) {
      setLoadError(err.message || "Failed to load shipping data.");
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
      zones: zones.length,
      pending: shipments.filter((item) => item.status === "pending").length,
      activeShipments: shipments.filter((item) =>
        ["pending", "shipped"].includes(item.status),
      ).length,
    }),
    [methods, zones, shipments],
  );

  async function onSelectOrder(orderId) {
    setSelectedOrderId(orderId);
    shipmentForm.setFieldValue("orderId", orderId);
    if (!orderId) {
      setFulfillmentItems([]);
      setShipmentItemQty({});
      return;
    }

    try {
      const items = await getOrderFulfillmentItems(orderId);
      setFulfillmentItems(items);
      setShipmentItemQty(
        items.reduce((acc, item) => {
          acc[item.id] = 0;
          return acc;
        }, {}),
      );
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to load fulfillment items.",
      });
    }
  }

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
      zoneIds: (record.zones || []).map((zone) => zone.id),
    });
  }

  function openEditZone(record) {
    setEditingZone(record);
    editZoneForm.setFieldsValue({
      name: record.name,
      countryCode: record.countryCode,
      regionCode: record.regionCode,
      postalCodePattern: record.postalCodePattern,
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

  async function onCreateZone(values) {
    setNotice({ type: "", message: "" });
    try {
      await createShippingZone(values);
      zoneForm.resetFields();
      await loadData();
      setNotice({ type: "success", message: "Shipping zone created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create zone.",
      });
    }
  }

  async function onUpdateZone(values) {
    if (!editingZone) return;
    setNotice({ type: "", message: "" });
    try {
      await updateShippingZone(editingZone.id, values);
      setEditingZone(null);
      await loadData();
      setNotice({ type: "success", message: "Shipping zone updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update zone.",
      });
    }
  }

  async function onDeleteZone(record) {
    setNotice({ type: "", message: "" });
    try {
      await deleteShippingZone(record.id);
      await loadData();
      setNotice({ type: "success", message: "Shipping zone deleted." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to delete zone.",
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
    setSavingShipment(true);
    try {
      const selectedItems = Object.entries(shipmentItemQty)
        .map(([orderItemId, quantity]) => ({
          orderItemId,
          quantity: Number(quantity || 0),
        }))
        .filter((item) => item.quantity > 0);

      if (!selectedItems.length) {
        message.warning("Select at least one item quantity for shipment.");
        return;
      }

      await createShipment({
        ...values,
        items: selectedItems,
      });
      shipmentForm.resetFields();
      setCreateShipmentOpen(false);
      setFulfillmentItems([]);
      setShipmentItemQty({});
      await loadData();
      setNotice({ type: "success", message: "Shipment created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create shipment.",
      });
    } finally {
      setSavingShipment(false);
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
      title: "Zones",
      key: "zones",
      render: (_, record) =>
        record.zones?.length
          ? record.zones.map((zone) => zone.name).join(", ")
          : "All zones",
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

  const zoneColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Country", dataIndex: "countryCode", key: "countryCode" },
    { title: "Region", dataIndex: "regionCode", key: "regionCode" },
    {
      title: "Postal Pattern",
      dataIndex: "postalCodePattern",
      key: "postalCodePattern",
      render: (value) => value || "-",
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
          <Button size="small" onClick={() => openEditZone(record)}>
            Edit
          </Button>
          <Button size="small" danger onClick={() => onDeleteZone(record)}>
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
          <Select
            size="small"
            value={record.status}
            style={{ width: 130 }}
            onChange={(value) => onShipmentStatus(record, value)}
            options={[
              { value: "pending", label: "pending" },
              { value: "shipped", label: "shipped" },
              { value: "delivered", label: "delivered" },
              { value: "failed", label: "failed" },
            ]}
          />
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
          Shipping
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Manage shipping methods and create shipments for orders.
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
          <Card size="small" title="Zones">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.zones}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Pending">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.pending}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Active Shipments">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.activeShipments}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

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
            <Form.Item name="zoneIds" label="Zones" style={{ minWidth: 260 }}>
              <Select
                mode="multiple"
                allowClear
                placeholder="All zones when empty"
                options={zones
                  .filter((item) => item.isActive)
                  .map((item) => ({ value: item.id, label: item.name }))}
              />
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
        {methods.length ? (
          <Table
            rowKey="id"
            columns={methodColumns}
            dataSource={methods}
            pagination={{ pageSize: 6 }}
          />
        ) : (
          <Empty description="No shipping methods configured yet." />
        )}
      </Card>

      <Card title="Shipping Zones">
        <Form
          form={zoneForm}
          layout="vertical"
          onFinish={onCreateZone}
          requiredMark={false}
        >
          <Space wrap style={{ width: "100%" }}>
            <Form.Item
              name="name"
              label="Zone Name"
              rules={[{ required: true }]}
              style={{ minWidth: 200 }}
            >
              <Input placeholder="Jakarta Metro" />
            </Form.Item>
            <Form.Item
              name="countryCode"
              label="Country"
              style={{ minWidth: 120 }}
            >
              <Input placeholder="ID" />
            </Form.Item>
            <Form.Item
              name="regionCode"
              label="Region"
              style={{ minWidth: 160 }}
            >
              <Input placeholder="JK" />
            </Form.Item>
            <Form.Item
              name="postalCodePattern"
              label="Postal Pattern"
              style={{ minWidth: 180 }}
            >
              <Input placeholder="10*" />
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
                Create Zone
              </Button>
            </Form.Item>
          </Space>
        </Form>

        <Table
          rowKey="id"
          columns={zoneColumns}
          dataSource={zones}
          pagination={{ pageSize: 6 }}
          locale={{ emptyText: "No shipping zones configured." }}
        />
      </Card>

      <Card title="Shipments">
        {shipments.length ? (
          <Table
            rowKey="id"
            columns={shipmentColumns}
            dataSource={shipments}
            pagination={{ pageSize: 6 }}
          />
        ) : (
          <Empty description="No shipments yet. Create first fulfillment batch." />
        )}
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
          <Form.Item name="zoneIds" label="Zones">
            <Select
              mode="multiple"
              allowClear
              options={zones
                .filter((item) => item.isActive)
                .map((item) => ({ value: item.id, label: item.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Edit Shipping Zone"
        open={Boolean(editingZone)}
        onCancel={() => setEditingZone(null)}
        onOk={() => editZoneForm.submit()}
        destroyOnClose
      >
        <Form form={editZoneForm} layout="vertical" onFinish={onUpdateZone}>
          <Form.Item name="name" label="Zone Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="countryCode" label="Country">
            <Input />
          </Form.Item>
          <Form.Item name="regionCode" label="Region">
            <Input />
          </Form.Item>
          <Form.Item name="postalCodePattern" label="Postal Pattern">
            <Input />
          </Form.Item>
          <Form.Item name="isActive" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Create Shipment"
        open={createShipmentOpen}
        onCancel={() => {
          setCreateShipmentOpen(false);
          setSelectedOrderId("");
          setFulfillmentItems([]);
          setShipmentItemQty({});
        }}
        onOk={() => shipmentForm.submit()}
        confirmLoading={savingShipment}
        destroyOnClose
        width={900}
      >
        <Form form={shipmentForm} layout="vertical" onFinish={onCreateShipment}>
          <Form.Item name="orderId" label="Order" rules={[{ required: true }]}>
            <Select
              onChange={onSelectOrder}
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
                { value: "failed", label: "Failed" },
              ]}
            />
          </Form.Item>

          {selectedOrderId ? (
            <Card size="small" title="Split Shipment Items">
              <Table
                rowKey="id"
                pagination={false}
                dataSource={fulfillmentItems}
                locale={{ emptyText: "No fulfillable items for this order." }}
                columns={[
                  {
                    title: "Item",
                    key: "item",
                    render: (_, record) =>
                      `${record.productTitle}${record.variantTitle ? ` - ${record.variantTitle}` : ""}`,
                  },
                  { title: "SKU", dataIndex: "sku", key: "sku" },
                  {
                    title: "Ordered",
                    dataIndex: "orderedQty",
                    key: "orderedQty",
                  },
                  {
                    title: "Remaining",
                    dataIndex: "remainingQty",
                    key: "remainingQty",
                  },
                  {
                    title: "Ship Qty",
                    key: "shipQty",
                    render: (_, record) => (
                      <InputNumber
                        min={0}
                        max={record.remainingQty}
                        value={shipmentItemQty[record.id] || 0}
                        onChange={(value) =>
                          setShipmentItemQty((prev) => ({
                            ...prev,
                            [record.id]: Number(value || 0),
                          }))
                        }
                      />
                    ),
                  },
                ]}
              />
            </Card>
          ) : null}
        </Form>
      </Modal>
    </section>
  );
}
