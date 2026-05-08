import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  adjustInventory,
  getInventoryItems,
  getInventoryMovements,
} from "../services/api.js";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form] = Form.useForm();

  async function loadData() {
    const [itemRows, movementRows] = await Promise.all([
      getInventoryItems(),
      getInventoryMovements(),
    ]);
    setItems(itemRows);
    setMovements(movementRows);
  }

  useEffect(() => {
    loadData().catch((err) => {
      setNotice({
        type: "error",
        message: err.message || "Failed to load inventory.",
      });
    });
  }, []);

  async function onAdjust(values) {
    setNotice({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      await adjustInventory(values);
      form.resetFields();
      await loadData();
      setNotice({ type: "success", message: "Inventory adjusted." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to adjust inventory.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const lowStockItems = useMemo(
    () =>
      items.filter((item) => item.stock <= Math.max(1, item.reorderLevel || 0)),
    [items],
  );

  const columns = [
    { title: "Product", dataIndex: "productName", key: "productName" },
    { title: "Variant", dataIndex: "variantTitle", key: "variantTitle" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Stock",
      dataIndex: "stock",
      key: "stock",
      render: (value, record) =>
        value <= Math.max(1, record.reorderLevel || 0) ? (
          <Tag color="red">{value}</Tag>
        ) : (
          <Tag color="green">{value}</Tag>
        ),
    },
    { title: "Reorder Level", dataIndex: "reorderLevel", key: "reorderLevel" },
  ];

  const movementColumns = [
    {
      title: "Date",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => new Date(value).toLocaleString(),
    },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    { title: "Variant", dataIndex: "variantTitle", key: "variantTitle" },
    { title: "Before", dataIndex: "quantityBefore", key: "quantityBefore" },
    { title: "Change", dataIndex: "quantityChange", key: "quantityChange" },
    { title: "After", dataIndex: "quantityAfter", key: "quantityAfter" },
    { title: "Reason", dataIndex: "reason", key: "reason" },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Inventory
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Control stock movements, low-stock risk, and quantity adjustments.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card title="Tracked Variants">{items.length}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Low Stock">{lowStockItems.length}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Recent Movements">{movements.length}</Card>
        </Col>
      </Row>

      <Card title="Adjust Inventory">
        <Form
          form={form}
          layout="vertical"
          onFinish={onAdjust}
          requiredMark={false}
        >
          <Space wrap style={{ width: "100%" }}>
            <Form.Item
              name="variantId"
              label="Variant"
              rules={[{ required: true, message: "Variant is required." }]}
              style={{ minWidth: 300 }}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={items.map((item) => ({
                  value: item.id,
                  label: `${item.productName} - ${item.sku}`,
                }))}
              />
            </Form.Item>
            <Form.Item
              name="adjustment"
              label="Adjustment (+/-)"
              rules={[{ required: true, message: "Adjustment is required." }]}
              style={{ minWidth: 170 }}
            >
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="reorderLevel"
              label="Reorder level"
              style={{ minWidth: 170 }}
            >
              <InputNumber min={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name="reason" label="Reason" style={{ minWidth: 280 }}>
              <Input placeholder="Manual correction / stock count" />
            </Form.Item>
            <Form.Item label=" " style={{ minWidth: 120 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                block
              >
                Apply
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card title="Current Stock">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Card title="Inventory Movements">
        <Table
          rowKey="id"
          columns={movementColumns}
          dataSource={movements}
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </section>
  );
}
