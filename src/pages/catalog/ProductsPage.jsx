import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  PlusOutlined,
  SearchOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tabs,
  Tooltip,
  Typography,
  Upload,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../../context/CartContext";
import {
  bulkDeleteProducts,
  bulkUpdateProductStatus,
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
  uploadProductImage,
} from "../../services/api";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "inactive", label: "Inactive" },
  { key: "archived", label: "Archived" },
];

const STATUS_COLOR = {
  active: "success",
  draft: "default",
  inactive: "warning",
  archived: "default",
};

export default function ProductsPage() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [submitError, setSubmitError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isBulkBusy, setIsBulkBusy] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImageUrls, setPendingImageUrls] = useState([]);
  const [editPendingImageUrls, setEditPendingImageUrls] = useState([]);

  const loadProducts = async () => {
    setLoadError("");
    setIsLoading(true);
    try {
      const list = await getProducts(status);
      setProducts(list);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load products.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [status]);

  function parseListString(value) {
    return String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleImageUpload(file, isEdit = false) {
    const tempId = `temp-${Date.now()}`;
    setUploadingImage(true);
    try {
      const url = await uploadProductImage(file, tempId);
      if (isEdit) {
        setEditPendingImageUrls((prev) => [...prev, url]);
      } else {
        setPendingImageUrls((prev) => [...prev, url]);
      }
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Image upload failed.",
      );
    } finally {
      setUploadingImage(false);
    }
    return false;
  }

  async function onSubmit(values) {
    setSubmitError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      await createProduct({
        ...values,
        price: Number(values.price),
        compareAtPrice:
          values.compareAtPrice == null ? null : Number(values.compareAtPrice),
        costPrice: values.costPrice == null ? null : Number(values.costPrice),
        priceStartAt: values.priceStartAt
          ? values.priceStartAt.toISOString()
          : null,
        priceEndAt: values.priceEndAt ? values.priceEndAt.toISOString() : null,
        stock: Number(values.stock),
        tags: parseListString(values.tags),
        mediaUrls: pendingImageUrls,
      });
      form.resetFields();
      setPendingImageUrls([]);
      await loadProducts();
      setNotice("Product created successfully.");
      setIsCreateModalOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to create product.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(product) {
    setSubmitError("");
    setNotice("");
    try {
      await deleteProduct(product.id);
      await loadProducts();
      setNotice("Product deleted.");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to delete product.",
      );
    }
  }

  async function onAddToCart(product) {
    setSubmitError("");
    setNotice("");
    try {
      await addItem({ variantId: product.variantId ?? "", quantity: 1 });
      setNotice(`Added ${product.name} to cart.`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to add product to cart.",
      );
    }
  }

  function openEditModal(product) {
    setEditingProduct(product);
    setEditPendingImageUrls([...(product.mediaUrls || [])]);
    editForm.setFieldsValue({
      name: product.name,
      urlHandle: product.urlHandle || "",
      vendor: product.vendor || "",
      productType: product.productType || "",
      sku: product.sku,
      description: product.description || "",
      tags: (product.tags || []).join(", "),
      seoTitle: product.seoTitle || "",
      seoDescription: product.seoDescription || "",
      status: product.status,
      price: Number(product.price || 0),
      compareAtPrice:
        product.compareAtPrice == null ? null : Number(product.compareAtPrice),
      costPrice: product.costPrice == null ? null : Number(product.costPrice),
      priceStartAt: product.priceStartAt ? dayjs(product.priceStartAt) : null,
      priceEndAt: product.priceEndAt ? dayjs(product.priceEndAt) : null,
      stock: Number(product.stock || 0),
    });
  }

  async function onEditSubmit(values) {
    if (!editingProduct) return;
    setIsUpdating(true);
    setSubmitError("");
    setNotice("");
    try {
      await updateProduct(editingProduct.id, {
        ...values,
        price: Number(values.price),
        compareAtPrice:
          values.compareAtPrice == null ? null : Number(values.compareAtPrice),
        costPrice: values.costPrice == null ? null : Number(values.costPrice),
        priceStartAt: values.priceStartAt
          ? values.priceStartAt.toISOString()
          : null,
        priceEndAt: values.priceEndAt ? values.priceEndAt.toISOString() : null,
        stock: Number(values.stock),
        tags: parseListString(values.tags),
        mediaUrls: editPendingImageUrls,
      });
      setEditingProduct(null);
      await loadProducts();
      setNotice("Product updated.");
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to update product.",
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function onBulkStatusChange(nextStatus) {
    if (!selectedRowKeys.length) return;
    setSubmitError("");
    setNotice("");
    setIsBulkBusy(true);
    try {
      const result = await bulkUpdateProductStatus(selectedRowKeys, nextStatus);
      await loadProducts();
      setSelectedRowKeys([]);
      setNotice(`${result.updatedCount} products updated to ${nextStatus}.`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed bulk status update.",
      );
    } finally {
      setIsBulkBusy(false);
    }
  }

  async function onBulkDelete() {
    if (!selectedRowKeys.length) return;
    setSubmitError("");
    setNotice("");
    setIsBulkBusy(true);
    try {
      const result = await bulkDeleteProducts(selectedRowKeys);
      await loadProducts();
      setSelectedRowKeys([]);
      setNotice(`${result.deletedCount} products deleted.`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed bulk delete.",
      );
    } finally {
      setIsBulkBusy(false);
    }
  }

  const visibleProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let rows = [...products];
    if (keyword) {
      rows = rows.filter((product) => {
        const haystack = [
          product.name,
          product.sku,
          product.description,
          ...(product.tags || []),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      });
    }
    rows.sort((a, b) => {
      if (sortBy === "price_high")
        return Number(b.price || 0) - Number(a.price || 0);
      if (sortBy === "price_low")
        return Number(a.price || 0) - Number(b.price || 0);
      if (sortBy === "stock_high")
        return Number(b.stock || 0) - Number(a.stock || 0);
      if (sortBy === "name_asc")
        return String(a.name || "").localeCompare(String(b.name || ""));
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
    return rows;
  }, [products, search, sortBy]);

  const tabCounts = useMemo(() => {
    const counts = { all: products.length };
    for (const p of products) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return counts;
  }, [products]);

  const columns = [
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <Space>
          {record.mediaUrls?.[0] ? (
            <Avatar
              shape="square"
              size={40}
              src={record.mediaUrls[0]}
              style={{ borderRadius: 6, border: "1px solid #f0f0f0" }}
            />
          ) : (
            <Avatar
              shape="square"
              size={40}
              style={{ background: "#f5f5f5", color: "#999", borderRadius: 6 }}
            >
              {record.name?.[0]?.toUpperCase()}
            </Avatar>
          )}
          <Space direction="vertical" size={0}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {record.name}
            </Typography.Text>
            {record.vendor && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.vendor}
              </Typography.Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Badge
          status={STATUS_COLOR[value]}
          text={
            <span style={{ textTransform: "capitalize", fontSize: 13 }}>
              {value}
            </span>
          }
        />
      ),
    },
    {
      title: "Inventory",
      key: "stock",
      render: (_, record) => {
        const qty = record.quantity_in_stock ?? record.stock ?? 0;
        return (
          <Typography.Text
            type={Number(qty) === 0 ? "danger" : undefined}
            style={{ fontSize: 13 }}
          >
            {Number(qty) === 0 ? "Out of stock" : `${qty} in stock`}
          </Typography.Text>
        );
      },
    },
    {
      title: "Price",
      key: "price",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text style={{ fontSize: 13 }}>
            {formatCurrency(Number(record.price))}
          </Typography.Text>
          {record.compareAtPrice && (
            <Typography.Text type="secondary" delete style={{ fontSize: 12 }}>
              {formatCurrency(Number(record.compareAtPrice))}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Type",
      key: "productType",
      render: (_, record) => (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {record.productType || "—"}
        </Typography.Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(record)}
            />
          </Tooltip>
          <Tooltip title="Add to cart">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onAddToCart(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this product?"
            onConfirm={() => onDelete(record)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const bulkMenuItems = [
    {
      key: "active",
      label: "Set as Active",
      onClick: () => onBulkStatusChange("active"),
    },
    {
      key: "draft",
      label: "Set as Draft",
      onClick: () => onBulkStatusChange("draft"),
    },
    {
      key: "archived",
      label: "Archive",
      onClick: () => onBulkStatusChange("archived"),
    },
  ];

  return (
    <section style={{ display: "grid", gap: 0 }}>
      {/* Page header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          Products
        </Typography.Title>
        <Space>
          <Button icon={<ImportOutlined />}>Import</Button>
          <Button icon={<ExportOutlined />}>Export</Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add product
          </Button>
        </Space>
      </div>

      {submitError && (
        <Alert
          type="error"
          message={submitError}
          showIcon
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setSubmitError("")}
        />
      )}
      {notice && (
        <Alert
          type="success"
          message={notice}
          showIcon
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setNotice("")}
        />
      )}
      {loadError && (
        <Alert
          type="error"
          message="Failed to load products"
          description={loadError}
          showIcon
          style={{ marginBottom: 12 }}
          action={
            <Button size="small" onClick={loadProducts}>
              Retry
            </Button>
          }
        />
      )}

      <Card bodyStyle={{ padding: 0 }}>
        {/* Status tabs */}
        <div style={{ borderBottom: "1px solid #f0f0f0", paddingLeft: 16 }}>
          <Tabs
            activeKey={status}
            onChange={setStatus}
            size="small"
            items={STATUS_TABS.map((tab) => ({
              key: tab.key,
              label: (
                <span>
                  {tab.label}
                  {tabCounts[tab.key] != null && (
                    <span
                      style={{ marginLeft: 6, color: "#999", fontSize: 12 }}
                    >
                      {tabCounts[tab.key]}
                    </span>
                  )}
                </span>
              ),
            }))}
          />
        </div>

        {/* Filter bar */}
        <div
          style={{
            padding: "12px 16px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Input
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 260 }}
          />

          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "newest", label: "Newest" },
              { value: "name_asc", label: "Name A–Z" },
              { value: "price_high", label: "Highest price" },
              { value: "price_low", label: "Lowest price" },
              { value: "stock_high", label: "Highest stock" },
            ]}
            style={{ width: 160 }}
          />

          {selectedRowKeys.length > 0 && (
            <Space style={{ marginLeft: "auto" }}>
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {selectedRowKeys.length} selected
              </Typography.Text>
              <Dropdown menu={{ items: bulkMenuItems }}>
                <Button size="small" loading={isBulkBusy}>
                  Actions
                </Button>
              </Dropdown>
              <Popconfirm
                title={`Delete ${selectedRowKeys.length} selected products?`}
                onConfirm={onBulkDelete}
                okText="Delete"
                cancelText="Cancel"
              >
                <Button size="small" danger loading={isBulkBusy}>
                  Delete selected
                </Button>
              </Popconfirm>
            </Space>
          )}
        </div>

        {/* Products table */}
        {visibleProducts.length === 0 && !isLoading ? (
          <div style={{ padding: 48 }}>
            <Empty
              description={
                <Space direction="vertical" size={4}>
                  <Typography.Text strong>No products found</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    Add your first product to start building your catalog.
                  </Typography.Text>
                </Space>
              }
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalOpen(true)}
              >
                Add product
              </Button>
            </Empty>
          </div>
        ) : (
          <Table
            rowKey="id"
            loading={isLoading}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            columns={columns}
            dataSource={visibleProducts}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `${total} products`,
            }}
            size="middle"
          />
        )}
      </Card>

      {/* Create product modal */}
      <Modal
        title="Add product"
        open={isCreateModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
          setPendingImageUrls([]);
        }}
        confirmLoading={isSubmitting}
        destroyOnClose
        width={960}
        okText="Save product"
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Row gutter={16}>
            {/* Left column — main content */}
            <Col xs={24} md={16}>
              <Card size="small" style={{ marginBottom: 12 }}>
                <Form.Item
                  name="name"
                  label="Title"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="Short sleeve t-shirt" size="large" />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Description"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="Describe your product..."
                  />
                </Form.Item>
              </Card>

              <Card size="small" title="Media" style={{ marginBottom: 12 }}>
                <Upload
                  beforeUpload={(file) => handleImageUpload(file, false)}
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                  multiple
                >
                  <div style={{ padding: "16px 0" }}>
                    <UploadOutlined style={{ fontSize: 20, color: "#999" }} />
                    <div style={{ marginTop: 8, fontSize: 13, color: "#666" }}>
                      Add image
                    </div>
                  </div>
                </Upload>
                {pendingImageUrls.length > 0 && (
                  <Space wrap style={{ marginTop: 8 }}>
                    {pendingImageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: "cover",
                          borderRadius: 6,
                          border: "1px solid #f0f0f0",
                        }}
                      />
                    ))}
                  </Space>
                )}
                {uploadingImage && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    Uploading...
                  </Typography.Text>
                )}
              </Card>

              <Card size="small" title="Pricing" style={{ marginBottom: 12 }}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="price"
                      label="Price"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: "100%" }}
                        prefix="$"
                        placeholder="0.00"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="compareAtPrice" label="Compare-at price">
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: "100%" }}
                        prefix="$"
                        placeholder="0.00"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="costPrice" label="Cost per item">
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: "100%" }}
                        prefix="$"
                        placeholder="0.00"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="Inventory" style={{ marginBottom: 12 }}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="sku"
                      label="SKU (Stock Keeping Unit)"
                      rules={[{ required: true }]}
                    >
                      <Input placeholder="SKU-001" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="stock"
                      label="Quantity"
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card
                size="small"
                title="Search engine listing"
                style={{ marginBottom: 12 }}
              >
                <Form.Item name="urlHandle" label="URL handle">
                  <Input
                    prefix="products/"
                    placeholder="short-sleeve-t-shirt"
                  />
                </Form.Item>
                <Form.Item name="seoTitle" label="Page title">
                  <Input
                    placeholder="SEO title (70 characters max)"
                    maxLength={70}
                    showCount
                  />
                </Form.Item>
                <Form.Item
                  name="seoDescription"
                  label="Meta description"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="SEO description (160 characters max)"
                    maxLength={160}
                    showCount
                  />
                </Form.Item>
              </Card>
            </Col>

            {/* Right column — sidebar */}
            <Col xs={24} md={8}>
              <Card size="small" title="Status" style={{ marginBottom: 12 }}>
                <Form.Item
                  name="status"
                  initialValue="draft"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    options={[
                      { value: "active", label: "Active" },
                      { value: "draft", label: "Draft" },
                      { value: "inactive", label: "Inactive" },
                      { value: "archived", label: "Archived" },
                    ]}
                  />
                </Form.Item>
              </Card>

              <Card
                size="small"
                title="Product organization"
                style={{ marginBottom: 12 }}
              >
                <Form.Item
                  name="vendor"
                  label="Vendor"
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Acme" />
                </Form.Item>
                <Form.Item
                  name="productType"
                  label="Product type"
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Apparel" />
                </Form.Item>
                <Form.Item name="tags" label="Tags" style={{ marginBottom: 0 }}>
                  <Input placeholder="fashion, summer (comma separated)" />
                </Form.Item>
              </Card>

              <Card
                size="small"
                title="Sale schedule"
                style={{ marginBottom: 12 }}
              >
                <Form.Item name="priceStartAt" label="Start date">
                  <DatePicker
                    showTime
                    style={{ width: "100%" }}
                    placeholder="No start date"
                  />
                </Form.Item>
                <Form.Item
                  name="priceEndAt"
                  label="End date"
                  style={{ marginBottom: 0 }}
                >
                  <DatePicker
                    showTime
                    style={{ width: "100%" }}
                    placeholder="No end date"
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Edit product modal */}
      <Modal
        title="Edit product"
        open={Boolean(editingProduct)}
        onCancel={() => setEditingProduct(null)}
        onOk={() => editForm.submit()}
        confirmLoading={isUpdating}
        okText="Save changes"
        destroyOnClose
        width={960}
      >
        <Form form={editForm} layout="vertical" onFinish={onEditSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Card size="small" style={{ marginBottom: 12 }}>
                <Form.Item
                  name="name"
                  label="Title"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input size="large" />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Description"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea rows={4} />
                </Form.Item>
              </Card>

              <Card size="small" title="Media" style={{ marginBottom: 12 }}>
                <Upload
                  beforeUpload={(file) => handleImageUpload(file, true)}
                  accept="image/*"
                  listType="picture-card"
                  showUploadList={false}
                >
                  <div style={{ padding: "8px 0" }}>
                    <UploadOutlined style={{ fontSize: 20, color: "#999" }} />
                    <div style={{ marginTop: 4, fontSize: 13, color: "#666" }}>
                      Add image
                    </div>
                  </div>
                </Upload>
                {editPendingImageUrls.length > 0 && (
                  <Space wrap style={{ marginTop: 8 }}>
                    {editPendingImageUrls.map((url, i) => (
                      <img
                        key={i}
                        src={url}
                        alt=""
                        style={{
                          width: 72,
                          height: 72,
                          objectFit: "cover",
                          borderRadius: 6,
                          border: "1px solid #f0f0f0",
                        }}
                      />
                    ))}
                  </Space>
                )}
              </Card>

              <Card size="small" title="Pricing" style={{ marginBottom: 12 }}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="price"
                      label="Price"
                      rules={[{ required: true }]}
                    >
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: "100%" }}
                        prefix="$"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="compareAtPrice" label="Compare-at price">
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: "100%" }}
                        prefix="$"
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="costPrice" label="Cost per item">
                      <InputNumber
                        min={0}
                        step={0.01}
                        style={{ width: "100%" }}
                        prefix="$"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="Inventory" style={{ marginBottom: 12 }}>
                <Row gutter={12}>
                  <Col span={12}>
                    <Form.Item
                      name="sku"
                      label="SKU"
                      rules={[{ required: true }]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      name="stock"
                      label="Quantity"
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>

              <Card size="small" title="Search engine listing">
                <Form.Item name="urlHandle" label="URL handle">
                  <Input prefix="products/" />
                </Form.Item>
                <Form.Item name="seoTitle" label="Page title">
                  <Input maxLength={70} showCount />
                </Form.Item>
                <Form.Item
                  name="seoDescription"
                  label="Meta description"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea rows={3} maxLength={160} showCount />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card size="small" title="Status" style={{ marginBottom: 12 }}>
                <Form.Item
                  name="status"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    options={[
                      { value: "active", label: "Active" },
                      { value: "draft", label: "Draft" },
                      { value: "inactive", label: "Inactive" },
                      { value: "archived", label: "Archived" },
                    ]}
                  />
                </Form.Item>
              </Card>

              <Card
                size="small"
                title="Product organization"
                style={{ marginBottom: 12 }}
              >
                <Form.Item
                  name="vendor"
                  label="Vendor"
                  style={{ marginBottom: 8 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="productType"
                  label="Product type"
                  style={{ marginBottom: 8 }}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="tags" label="Tags" style={{ marginBottom: 0 }}>
                  <Input placeholder="comma separated" />
                </Form.Item>
              </Card>

              <Card size="small" title="Sale schedule">
                <Form.Item name="priceStartAt" label="Start date">
                  <DatePicker showTime style={{ width: "100%" }} />
                </Form.Item>
                <Form.Item
                  name="priceEndAt"
                  label="End date"
                  style={{ marginBottom: 0 }}
                >
                  <DatePicker showTime style={{ width: "100%" }} />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Modal>
    </section>
  );
}
