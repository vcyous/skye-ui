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
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  adjustInventory,
  exportInventoryCsv,
  getInventoryItems,
  getInventoryMovements,
  getLowStockAlerts,
  importInventoryCsv,
} from "../services/api.js";

const reasonCodeOptions = [
  { value: "manual_adjustment", label: "Manual adjustment" },
  { value: "purchase", label: "Purchase" },
  { value: "sale", label: "Sale" },
  { value: "return", label: "Return" },
  { value: "stock_take", label: "Stock take" },
  { value: "damage", label: "Damage" },
  { value: "transfer", label: "Transfer" },
  { value: "import", label: "Import" },
];

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function getSeverityTag(severity) {
  if (severity === "critical") return <Tag color="red">critical</Tag>;
  if (severity === "high") return <Tag color="orange">high</Tag>;
  return <Tag color="gold">medium</Tag>;
}

export default function InventoryPage() {
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [search, setSearch] = useState("");
  const [movementReasonCode, setMovementReasonCode] = useState("all");
  const [csvContent, setCsvContent] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [form] = Form.useForm();

  async function loadData() {
    setLoadError("");
    setIsLoading(true);

    try {
      const [itemRows, movementRows, alertRows] = await Promise.all([
        getInventoryItems({ search, alertOnly: showOnlyLowStock }),
        getInventoryMovements(40, { reasonCode: movementReasonCode }),
        getLowStockAlerts({ search }),
      ]);
      setItems(itemRows);
      setMovements(movementRows);
      setAlerts(alertRows);
    } catch (err) {
      setLoadError(err.message || "Failed to load inventory.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [search, showOnlyLowStock, movementReasonCode]);

  async function onAdjust(values) {
    setNotice({ type: "", message: "" });
    setIsSubmitting(true);

    try {
      const result = await adjustInventory(values);
      form.resetFields(["adjustment", "reason", "reorderLevel"]);
      await loadData();
      setNotice({
        type: result.isLowStock ? "warning" : "success",
        message: result.isLowStock
          ? `Inventory adjusted to ${result.quantityAfter}. Item is still low stock.`
          : "Inventory adjusted.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to adjust inventory.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onExportCsv() {
    setIsExporting(true);
    setNotice({ type: "", message: "" });
    try {
      const csv = await exportInventoryCsv();
      setCsvContent(csv);
      setImportModalOpen(true);
      setNotice({ type: "success", message: "CSV generated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to export inventory CSV.",
      });
    } finally {
      setIsExporting(false);
    }
  }

  async function onImportCsv() {
    setIsImporting(true);
    setNotice({ type: "", message: "" });

    try {
      const result = await importInventoryCsv(csvContent);
      setImportResult(result);
      await loadData();
      setNotice({
        type: result.failedCount > 0 ? "warning" : "success",
        message:
          result.failedCount > 0
            ? `${result.successCount} rows imported, ${result.failedCount} failed.`
            : `${result.successCount} rows imported successfully.`,
      });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "CSV import failed.",
      });
    } finally {
      setIsImporting(false);
    }
  }

  const metrics = useMemo(
    () => ({
      trackedVariants: items.length,
      lowStock: alerts.length,
      movementCount: movements.length,
      criticalAlerts: alerts.filter((item) => item.severity === "critical")
        .length,
    }),
    [items, alerts, movements],
  );

  const itemColumns = [
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
        value <= record.lowStockThreshold ? (
          <Tag color="red">{value}</Tag>
        ) : (
          <Tag color="green">{value}</Tag>
        ),
    },
    {
      title: "Threshold",
      dataIndex: "lowStockThreshold",
      key: "lowStockThreshold",
    },
    {
      title: "Last update",
      dataIndex: "updatedAt",
      key: "updatedAt",
      render: (value) => (value ? new Date(value).toLocaleString() : "-"),
    },
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
    {
      title: "Reason Code",
      dataIndex: "reasonCode",
      key: "reasonCode",
      render: (value) => <Tag>{value || "manual_adjustment"}</Tag>,
    },
    { title: "Before", dataIndex: "quantityBefore", key: "quantityBefore" },
    { title: "Change", dataIndex: "quantityChange", key: "quantityChange" },
    { title: "After", dataIndex: "quantityAfter", key: "quantityAfter" },
    { title: "Detail", dataIndex: "reason", key: "reason" },
  ];

  const alertColumns = [
    { title: "Product", dataIndex: "productName", key: "productName" },
    { title: "Variant", dataIndex: "variantTitle", key: "variantTitle" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    { title: "Stock", dataIndex: "stock", key: "stock" },
    { title: "Threshold", dataIndex: "threshold", key: "threshold" },
    {
      title: "Severity",
      dataIndex: "severity",
      key: "severity",
      render: (value) => getSeverityTag(value),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <Space align="center" size={12}>
          <Spin />
          <Typography.Text>Loading inventory...</Typography.Text>
        </Space>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <Alert
          type="error"
          showIcon
          message="Unable to load inventory"
          description={
            <Space direction="vertical">
              <Typography.Text>{loadError}</Typography.Text>
              <Button onClick={loadData}>Retry</Button>
            </Space>
          }
        />
      </Card>
    );
  }

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Inventory
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Track stock per SKU, apply reason-coded adjustments, and resolve
          low-stock risks.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card size="small" title="Tracked Variants">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.trackedVariants}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Low Stock Alerts">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.lowStock}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Critical Alerts">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.criticalAlerts}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Recent Movements">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics.movementCount}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="Filters">
        <Row gutter={12}>
          <Col xs={24} md={10}>
            <Input
              placeholder="Search by product, variant, or SKU"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              value={showOnlyLowStock ? "low_only" : "all"}
              onChange={(value) => setShowOnlyLowStock(value === "low_only")}
              options={[
                { value: "all", label: "All stock" },
                { value: "low_only", label: "Low stock only" },
              ]}
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              value={movementReasonCode}
              onChange={setMovementReasonCode}
              options={[
                { value: "all", label: "All reason codes" },
                ...reasonCodeOptions,
              ]}
            />
          </Col>
          <Col xs={24} md={2}>
            <Button block onClick={loadData}>
              Refresh
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="Adjust Inventory">
        <Form
          form={form}
          layout="vertical"
          onFinish={onAdjust}
          requiredMark={false}
          initialValues={{ reasonCode: "manual_adjustment" }}
        >
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                name="variantId"
                label="Variant"
                rules={[{ required: true, message: "Variant is required." }]}
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
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="adjustment"
                label="Adjustment (+/-)"
                rules={[{ required: true, message: "Adjustment is required." }]}
              >
                <InputNumber style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="reorderLevel" label="Reorder level">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="reasonCode"
                label="Reason code"
                rules={[
                  { required: true, message: "Reason code is required." },
                ]}
              >
                <Select options={reasonCodeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item name="reason" label="Detail">
                <Input placeholder="Cycle count / shelf damage" />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Apply Adjustment
          </Button>
        </Form>
      </Card>

      <Card
        title="Import / Export"
        extra={
          <Space>
            <Button onClick={() => setImportModalOpen(true)}>
              Open CSV Editor
            </Button>
            <Button onClick={onExportCsv} loading={isExporting}>
              Export CSV
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
          CSV columns: sku, adjustment (or stock), reorder_level, reason_code,
          reason.
        </Typography.Paragraph>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Import runs with partial-failure handling so valid rows still apply.
        </Typography.Paragraph>
      </Card>

      <Card title="Low Stock Alerts">
        {alerts.length === 0 ? (
          <Empty description="No low-stock alerts right now." />
        ) : (
          <Table
            rowKey="variantId"
            columns={alertColumns}
            dataSource={alerts}
            pagination={{ pageSize: 6 }}
          />
        )}
      </Card>

      <Card title="Current Stock">
        {items.length === 0 ? (
          <Empty description="No variants found. Create products to start tracking inventory." />
        ) : (
          <Table
            rowKey="id"
            columns={itemColumns}
            dataSource={items}
            pagination={{ pageSize: 8 }}
          />
        )}
      </Card>

      <Card title="Movement Timeline">
        <Table
          rowKey="id"
          columns={movementColumns}
          dataSource={movements}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Modal
        title="Inventory CSV Editor"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        onOk={onImportCsv}
        okText="Run Import"
        confirmLoading={isImporting}
        width={860}
        destroyOnClose
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Input.TextArea
            value={csvContent}
            onChange={(event) => setCsvContent(event.target.value)}
            autoSize={{ minRows: 8, maxRows: 16 }}
            placeholder="sku,adjustment,reorder_level,reason_code,reason"
          />

          {importResult ? (
            <Card size="small" title="Latest Import Result">
              <Typography.Text>
                Total: {importResult.total} | Success:{" "}
                {importResult.successCount} | Failed: {importResult.failedCount}
              </Typography.Text>
              <Table
                style={{ marginTop: 12 }}
                size="small"
                rowKey={(record) => `${record.row}-${record.sku}`}
                pagination={{ pageSize: 5 }}
                dataSource={importResult.rows}
                columns={[
                  { title: "Row", dataIndex: "row", key: "row" },
                  { title: "SKU", dataIndex: "sku", key: "sku" },
                  {
                    title: "Status",
                    dataIndex: "status",
                    key: "status",
                    render: (value) =>
                      value === "success" ? (
                        <Tag color="green">success</Tag>
                      ) : (
                        <Tag color="red">failed</Tag>
                      ),
                  },
                  { title: "Error", dataIndex: "error", key: "error" },
                ]}
              />
            </Card>
          ) : null}
        </Space>
      </Modal>
    </section>
  );
}
