import {
  Alert,
  App,
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
} from "../../services/api";
import type {
  FulfillmentItem,
  Shipment,
  ShippingMethod,
  ShippingZone,
} from "../../services/shippingService";

const shippingTypeOptions = [
  { value: "flat_rate", label: "Flat Rate" },
  { value: "weight_based", label: "Weight Based" },
  { value: "zone_based", label: "Zone Based" },
];

export default function ShippingPage() {
  const { message } = App.useApp();
  const [methods, setMethods] = useState<ShippingMethod[]>([]);
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [savingShipment, setSavingShipment] = useState<boolean>(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("");
  const [fulfillmentItems, setFulfillmentItems] = useState<FulfillmentItem[]>(
    [],
  );
  const [shipmentItemQty, setShipmentItemQty] = useState<
    Record<string, number>
  >({});
  const [notice, setNotice] = useState<{ type: string; message: string }>({
    type: "",
    message: "",
  });
  const [editingMethod, setEditingMethod] = useState<ShippingMethod | null>(
    null,
  );
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [createShipmentOpen, setCreateShipmentOpen] = useState<boolean>(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [zoneForm] = Form.useForm();
  const [editZoneForm] = Form.useForm();
  const [shipmentForm] = Form.useForm();
  const [isCreateMethodModalOpen, setIsCreateMethodModalOpen] =
    useState<boolean>(false);
  const [isCreateZoneModalOpen, setIsCreateZoneModalOpen] =
    useState<boolean>(false);

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
    } catch (err: unknown) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load shipping data.",
      );
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

  async function onSelectOrder(orderId: string) {
    setSelectedOrderId(orderId);
    shipmentForm.setFieldValue("orderId", orderId);
    if (!orderId) {
      setFulfillmentItems([]);
      setShipmentItemQty({});
      return;
    }

    try {
      const items = await getOrderFulfillmentItems(orderId);
      setFulfillmentItems(items as FulfillmentItem[]);
      setShipmentItemQty(
        (items as FulfillmentItem[]).reduce(
          (acc: Record<string, number>, item) => {
            acc[item.id] = 0;
            return acc;
          },
          {},
        ),
      );
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to load fulfillment items.",
      });
    }
  }

  async function onCreate(values: Record<string, unknown>) {
    setNotice({ type: "", message: "" });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createShippingMethod(values as any);
      form.resetFields();
      setIsCreateMethodModalOpen(false);
      await loadData();
      setNotice({ type: "success", message: "Shipping method created." });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to create shipping method.",
      });
    }
  }

  function openEdit(record: ShippingMethod) {
    setEditingMethod(record);
    editForm.setFieldsValue({
      name: record.name,
      shippingType: record.shippingType,
      baseRate: record.baseRate,
      isActive: record.isActive,
      zoneIds: (record.zones || []).map((zone) => zone.id),
    });
  }

  function openEditZone(record: ShippingZone) {
    setEditingZone(record);
    editZoneForm.setFieldsValue({
      name: record.name,
      countryCode: record.countryCode,
      regionCode: record.regionCode,
      postalCodePattern: record.postalCodePattern,
      isActive: record.isActive,
    });
  }

  async function onUpdate(values: Record<string, unknown>) {
    if (!editingMethod) return;
    setNotice({ type: "", message: "" });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateShippingMethod(editingMethod.id, values as any);
      setEditingMethod(null);
      await loadData();
      setNotice({ type: "success", message: "Shipping method updated." });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to update shipping method.",
      });
    }
  }

  async function onCreateZone(values: Record<string, unknown>) {
    setNotice({ type: "", message: "" });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await createShippingZone(values as any);
      zoneForm.resetFields();
      setIsCreateZoneModalOpen(false);
      await loadData();
      setNotice({ type: "success", message: "Shipping zone created." });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to create zone.",
      });
    }
  }

  async function onUpdateZone(values: Record<string, unknown>) {
    if (!editingZone) return;
    setNotice({ type: "", message: "" });
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await updateShippingZone(editingZone.id, values as any);
      setEditingZone(null);
      await loadData();
      setNotice({ type: "success", message: "Shipping zone updated." });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to update zone.",
      });
    }
  }

  async function onDeleteZone(record: ShippingZone) {
    setNotice({ type: "", message: "" });
    try {
      await deleteShippingZone(record.id);
      await loadData();
      setNotice({ type: "success", message: "Shipping zone deleted." });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to delete zone.",
      });
    }
  }

  async function onDelete(record: ShippingMethod) {
    setNotice({ type: "", message: "" });
    try {
      await deleteShippingMethod(record.id);
      await loadData();
      setNotice({ type: "success", message: "Shipping method deleted." });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "Failed to delete shipping method.",
      });
    }
  }

  async function onCreateShipment(values: Record<string, unknown>) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ...(values as any),
        items: selectedItems,
      });
      shipmentForm.resetFields();
      setCreateShipmentOpen(false);
      setFulfillmentItems([]);
      setShipmentItemQty({});
      await loadData();
      setNotice({ type: "success", message: "Shipment created." });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to create shipment.",
      });
    } finally {
      setSavingShipment(false);
    }
  }

  async function onShipmentStatus(record: Shipment, status: string) {
    setNotice({ type: "", message: "" });
    try {
      await updateShipmentStatus(record.id, status);
      await loadData();
      setNotice({ type: "success", message: `Shipment marked ${status}.` });
    } catch (err: unknown) {
      setNotice({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to update shipment.",
      });
    }
  }

  const methodColumns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Type",
      dataIndex: "shippingType",
      key: "shippingType",
      render: (value: string) => <Tag>{value}</Tag>,
    },
    { title: "Base Rate", dataIndex: "baseRate", key: "baseRate" },
    {
      title: "Zones",
      key: "zones",
      render: (_: unknown, record: ShippingMethod) =>
        record.zones?.length
          ? record.zones.map((zone) => zone.name).join(", ")
          : "All zones",
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, record: ShippingMethod) =>
        record.isActive ? <Tag color="green">active</Tag> : <Tag>inactive</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: ShippingMethod) => (
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
      render: (value: string) => value || "-",
    },
    {
      title: "Status",
      key: "status",
      render: (_: unknown, record: ShippingZone) =>
        record.isActive ? <Tag color="green">active</Tag> : <Tag>inactive</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: ShippingZone) => (
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
      render: (value: string) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_: unknown, record: Shipment) => (
        <Space>
          <Select
            size="small"
            value={record.status}
            style={{ width: 130 }}
            onChange={(value: string) => onShipmentStatus(record, value)}
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
        <Alert
          type={
            (notice.type || "info") as "info" | "success" | "error" | "warning"
          }
          message={notice.message}
          showIcon
        />
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
        title="Shipping Methods"
        extra={
          <Space>
            <Button
              type="primary"
              onClick={() => setIsCreateMethodModalOpen(true)}
            >
              Add Method
            </Button>
            <Button onClick={() => setCreateShipmentOpen(true)}>
              Create Shipment
            </Button>
          </Space>
        }
      >
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

      <Card
        title="Shipping Zones"
        extra={
          <Button type="primary" onClick={() => setIsCreateZoneModalOpen(true)}>
            Add Zone
          </Button>
        }
      >
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
        title="Add Shipping Method"
        open={isCreateMethodModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsCreateMethodModalOpen(false);
          form.resetFields();
        }}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreate}
          requiredMark={false}
        >
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="shippingType"
            label="Type"
            initialValue="flat_rate"
            rules={[{ required: true }]}
          >
            <Select options={shippingTypeOptions} />
          </Form.Item>
          <Form.Item name="baseRate" label="Base Rate" initialValue={0}>
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
          <Form.Item name="zoneIds" label="Zones">
            <Select
              mode="multiple"
              allowClear
              placeholder="All zones when empty"
              options={zones
                .filter((item) => item.isActive)
                .map((item) => ({ value: item.id, label: item.name }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Add Shipping Zone"
        open={isCreateZoneModalOpen}
        onOk={() => zoneForm.submit()}
        onCancel={() => {
          setIsCreateZoneModalOpen(false);
          zoneForm.resetFields();
        }}
        destroyOnClose
      >
        <Form
          form={zoneForm}
          layout="vertical"
          onFinish={onCreateZone}
          requiredMark={false}
        >
          <Form.Item name="name" label="Zone Name" rules={[{ required: true }]}>
            <Input placeholder="Jakarta Metro" />
          </Form.Item>
          <Form.Item name="countryCode" label="Country">
            <Input placeholder="ID" />
          </Form.Item>
          <Form.Item name="regionCode" label="Region">
            <Input placeholder="JK" />
          </Form.Item>
          <Form.Item name="postalCodePattern" label="Postal Pattern">
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
        </Form>
      </Modal>

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
