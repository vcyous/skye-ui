import {
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
import { useEffect, useState } from "react";
import { createProduct, getProducts } from "../services/api.js";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [status, setStatus] = useState("all");
  const [form] = Form.useForm();

  const loadProducts = () => getProducts(status).then(setProducts);

  useEffect(() => {
    loadProducts();
  }, [status]);

  async function onSubmit(values) {
    await createProduct({
      ...values,
      price: Number(values.price),
      stock: Number(values.stock),
    });
    form.resetFields();
    await loadProducts();
  }

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
          <Card title="Total Products">{products.length}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Active Filter">{status}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Estimated Value">
            {formatCurrency(
              products.reduce(
                (sum, product) =>
                  sum + Number(product.price || 0) * Number(product.stock || 0),
                0,
              ),
            )}
          </Card>
        </Col>
      </Row>

      <Card>
        <Space align="center" wrap>
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
        </Space>
      </Card>

      <Card title="Add Product">
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
            <Col xs={24} md={2}>
              <Form.Item label=" ">
                <Button type="primary" htmlType="submit" block>
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
          dataSource={products}
          pagination={{ pageSize: 8 }}
        />
      </Card>
    </section>
  );
}
