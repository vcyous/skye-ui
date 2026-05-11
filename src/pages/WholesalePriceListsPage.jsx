import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
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
  message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../services/api.js";
import {
  addProductToWholesalePriceList,
  createWholesalePriceList,
  getWholesalePriceLists,
} from "../services/b2bWholesaleService.js";

export default function WholesalePriceListsPage() {
  const [priceLists, setPriceLists] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [selectedPriceList, setSelectedPriceList] = useState(null);
  const [form] = Form.useForm();
  const [addProductForm] = Form.useForm();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [priceListsData, productsData] = await Promise.all([
        getWholesalePriceLists({
          status: statusFilter !== "all" ? statusFilter : undefined,
        }),
        getProducts("active"),
      ]);
      setPriceLists(priceListsData);
      setProducts(productsData);
    } catch (err) {
      message.error("Failed to load data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function onCreatePriceList() {
    try {
      const values = await form.validateFields();
      await createWholesalePriceList(values);
      message.success("Price list created");
      form.resetFields();
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.message || "Failed to create price list");
      console.error(err);
    }
  }

  async function onAddProduct() {
    try {
      const values = await addProductForm.validateFields();
      if (!selectedPriceList) {
        message.error("Please select a price list");
        return;
      }

      await addProductToWholesalePriceList(
        selectedPriceList.id,
        values.variantId,
        values,
      );
      message.success("Product added to price list");
      addProductForm.resetFields();
      setIsAddProductModalOpen(false);
      await loadData();
    } catch (err) {
      if (err.errorFields) return;
      message.error(err.message || "Failed to add product");
      console.error(err);
    }
  }

  const filteredPriceLists = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return priceLists.filter((item) => {
      if (!keyword) return true;
      return [item.name, item.description]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [priceLists, search]);

  const columns = [
    {
      title: "Price List",
      key: "list",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">
            {record.description || "-"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Type",
      dataIndex: "pricingType",
      key: "pricingType",
      render: (value) => <Tag>{value?.replace(/_/g, " ")}</Tag>,
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Tag color={record.status === "active" ? "green" : "default"}>
          {record.status}
        </Tag>
      ),
    },
    {
      title: "Active",
      key: "active",
      render: (_, record) => {
        const now = new Date();
        const isActive =
          (!record.startsAt || new Date(record.startsAt) <= now) &&
          (!record.endsAt || new Date(record.endsAt) >= now);
        return isActive ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>;
      },
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedPriceList(record);
              setIsAddProductModalOpen(true);
            }}
          >
            Add Product
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title={
          <Space>
            <span>Wholesale Price Lists</span>
            <Tag color="blue">Tiered Pricing</Tag>
          </Space>
        }
        extra={
          <Space wrap>
            <Input.Search
              placeholder="Search name"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 220 }}
            />
            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
              }}
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "draft", label: "Draft" },
                { value: "archived", label: "Archived" },
              ]}
              style={{ width: 140 }}
            />
            <Button type="primary" onClick={() => setIsModalOpen(true)}>
              Create Price List
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {filteredPriceLists.length === 0 ? (
            <Empty
              description={
                search ? "No price lists found" : "No wholesale price lists yet"
              }
              style={{ marginTop: "48px" }}
            >
              <Button type="primary" onClick={() => setIsModalOpen(true)}>
                Create First Price List
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredPriceLists}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          )}
        </Spin>
      </Card>

      {/* Create Price List Modal */}
      <Modal
        title="Create Wholesale Price List"
        open={isModalOpen}
        onOk={onCreatePriceList}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Price List Name"
                rules={[{ required: true, message: "Name is required" }]}
              >
                <Input placeholder="Standard Wholesale Q1 2025" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="pricingType"
                label="Pricing Type"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "tier_based", label: "Tier Based" },
                    { value: "fixed_discount", label: "Fixed Discount" },
                    { value: "contract_specific", label: "Contract Specific" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} placeholder="List details and terms" />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="startsAt" label="Starts At">
                <DatePicker />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="endsAt" label="Ends At">
                <DatePicker />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true }]}
              >
                <Select
                  options={[
                    { value: "draft", label: "Draft" },
                    { value: "active", label: "Active" },
                    { value: "archived", label: "Archived" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="isDefault"
                label="Default"
                valuePropName="checked"
              >
                <input type="checkbox" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Add Product to Price List Modal */}
      <Modal
        title={`Add Product to ${selectedPriceList?.name || ""}`}
        open={isAddProductModalOpen}
        onOk={onAddProduct}
        onCancel={() => {
          setIsAddProductModalOpen(false);
          setSelectedPriceList(null);
          addProductForm.resetFields();
        }}
        width={700}
      >
        <Form form={addProductForm} layout="vertical">
          <Form.Item
            name="variantId"
            label="Product"
            rules={[{ required: true, message: "Product is required" }]}
          >
            <Select
              placeholder="Select product"
              options={products.map((p) => ({
                value: p.variantId,
                label: `${p.name} - ${p.sku}`,
              }))}
            />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="basePrice"
                label="Base Price"
                rules={[{ required: true }]}
              >
                <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="discountPercent" label="Discount %">
                <InputNumber
                  min={0}
                  max={100}
                  step={0.01}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="minOrderQty" label="Min Order Qty">
                <InputNumber min={1} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            message="Tip: Configure tier pricing in the price list settings for volume-based discounts"
            type="info"
            style={{ marginTop: "16px" }}
          />
        </Form>
      </Modal>
    </div>
  );
}
