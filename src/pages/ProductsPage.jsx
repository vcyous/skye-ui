import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "../context/CartContext.jsx";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "../services/api.js";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ProductsPage() {
  const { addItem } = useCart();
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();

  const loadProducts = () => getProducts(status).then(setProducts);

  useEffect(() => {
    loadProducts();
  }, [status]);

  async function onSubmit(values) {
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await createProduct({
        ...values,
        price: Number(values.price),
        stock: Number(values.stock),
      });
      form.resetFields();
      await loadProducts();
    } catch (err) {
      setSubmitError(err.message || "Failed to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onDelete(product) {
    setSubmitError("");
    try {
      await deleteProduct(product.id);
      await loadProducts();
    } catch (err) {
      setSubmitError(err.message || "Failed to delete product.");
    }
  }

  async function onAddToCart(product) {
    setSubmitError("");
    try {
      await addItem({ variantId: product.variantId, quantity: 1 });
    } catch (err) {
      setSubmitError(err.message || "Failed to add product to cart.");
    }
  }

  function openEditModal(product) {
    setEditingProduct(product);
    editForm.setFieldsValue({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      tags: (product.tags || []).join(", "),
      status: product.status,
      price: Number(product.price || 0),
      stock: Number(product.stock || 0),
    });
  }

  async function onEditSubmit(values) {
    if (!editingProduct) {
      return;
    }

    setIsUpdating(true);
    setSubmitError("");
    try {
      await updateProduct(editingProduct.id, {
        ...values,
        price: Number(values.price),
        stock: Number(values.stock),
      });
      setEditingProduct(null);
      await loadProducts();
    } catch (err) {
      setSubmitError(err.message || "Failed to update product.");
    } finally {
      setIsUpdating(false);
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
      if (sortBy === "price_high") {
        return Number(b.price || 0) - Number(a.price || 0);
      }
      if (sortBy === "price_low") {
        return Number(a.price || 0) - Number(b.price || 0);
      }
      if (sortBy === "stock_high") {
        return Number(b.stock || 0) - Number(a.stock || 0);
      }
      if (sortBy === "name_asc") {
        return String(a.name || "").localeCompare(String(b.name || ""));
      }

      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });

    return rows;
  }, [products, search, sortBy]);

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "SKU", dataIndex: "sku", key: "sku" },
    {
      title: "Price",
      dataIndex: "price",
      key: "price",
      render: (value) => formatCurrency(value),
    },
    {
      title: "Stock",
      key: "stock",
      render: (_, record) => record.quantity_in_stock ?? record.stock,
    },
    {
      title: "Tags",
      key: "tags",
      render: (_, record) =>
        (record.tags || []).length ? (record.tags || []).join(", ") : "-",
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Rating",
      key: "rating",
      render: (_, record) => record.rating ?? "-",
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this product?"
            onConfirm={() => onDelete(record)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
          <Button
            size="small"
            type="primary"
            onClick={() => onAddToCart(record)}
          >
            Add to cart
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Product
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Control catalog quality, stock visibility, and product readiness.
        </Typography.Text>
      </header>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card title="Total Products">{visibleProducts.length}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Active Filter">{status}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Estimated Value">
            {formatCurrency(
              visibleProducts.reduce(
                (sum, product) =>
                  sum + Number(product.price || 0) * Number(product.stock || 0),
                0,
              ),
            )}
          </Card>
        </Col>
      </Row>

      <Card>
        <Space align="center" wrap size={12}>
          <Typography.Text strong>Filter</Typography.Text>
          <Select
            value={status}
            onChange={(value) => setStatus(value)}
            options={[
              { value: "all", label: "All" },
              { value: "active", label: "Active" },
              { value: "draft", label: "Draft" },
              { value: "inactive", label: "Inactive" },
            ]}
            style={{ width: 220 }}
          ></Select>
          <Input
            placeholder="Search name, SKU, tags"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ width: 260 }}
          />
          <Select
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "newest", label: "Newest" },
              { value: "name_asc", label: "Name A-Z" },
              { value: "price_high", label: "Highest price" },
              { value: "price_low", label: "Lowest price" },
              { value: "stock_high", label: "Highest stock" },
            ]}
            style={{ width: 180 }}
          />
        </Space>
      </Card>

      <Card title="Add Product">
        {submitError ? (
          <Alert
            type="error"
            message={submitError}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={8}>
              <Form.Item
                name="name"
                label="Product name"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="description" label="Description">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="tags" label="Tags (comma separated)">
                <Input placeholder="fashion, summer" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item
                name="price"
                label="Price"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item
                name="stock"
                label="Stock"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item
                name="status"
                label="Status"
                initialValue="draft"
                rules={[{ required: true }]}
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
            </Col>
            <Col xs={24} md={2}>
              <Form.Item label=" ">
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  loading={isSubmitting}
                >
                  Add
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      <Card title="Catalog">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={visibleProducts}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Modal
        title="Edit Product"
        open={Boolean(editingProduct)}
        onCancel={() => setEditingProduct(null)}
        onOk={() => editForm.submit()}
        confirmLoading={isUpdating}
        okText="Save changes"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={onEditSubmit}>
          <Form.Item
            name="name"
            label="Product name"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="tags" label="Tags (comma separated)">
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true }]}
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
            </Col>
            <Col span={12}>
              <Form.Item
                name="price"
                label="Price"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="stock"
                label="Stock"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </section>
  );
}
