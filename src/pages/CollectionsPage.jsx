import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
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
  createCollection,
  deleteCollection,
  getCollections,
  getProducts,
  updateCollection,
  updateCollectionProducts,
} from "../services/api.js";

const collectionTypeOptions = [
  { value: "manual", label: "Manual" },
  { value: "smart", label: "Smart" },
];

const statusOptions = ["active", "draft", "inactive", "archived"].map(
  (value) => ({ value, label: value }),
);

const ruleFieldOptions = [
  { value: "name", label: "Product name" },
  { value: "description", label: "Description" },
  { value: "vendor", label: "Vendor" },
  { value: "productType", label: "Product type" },
  { value: "status", label: "Status" },
  { value: "tags", label: "Tags" },
  { value: "sku", label: "SKU" },
  { value: "price", label: "Price" },
  { value: "stock", label: "Stock" },
];

const ruleOperatorOptions = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "not_contains", label: "does not contain" },
  { value: "in", label: "in list" },
  { value: "not_in", label: "not in list" },
  { value: "gt", label: ">" },
  { value: "gte", label: ">=" },
  { value: "lt", label: "<" },
  { value: "lte", label: "<=" },
];

const matchModeOptions = [
  { value: "all", label: "Match all rules" },
  { value: "any", label: "Match any rule" },
];

function CollectionRuleBuilder({
  form,
  typeField = "collectionType",
  name = "rules",
}) {
  const collectionType = Form.useWatch(typeField, form);

  if (collectionType !== "smart") {
    return (
      <Alert
        type="info"
        showIcon
        message="Manual collection"
        description="Use Assign Products to pick products manually after saving."
      />
    );
  }

  return (
    <Card
      size="small"
      title="Smart rules"
      style={{ background: "#fafafa", marginBottom: 8 }}
    >
      <Form.Item
        name={[name, "match"]}
        label="Rule matching"
        initialValue="all"
        rules={[{ required: true, message: "Select a match mode." }]}
      >
        <Select options={matchModeOptions} />
      </Form.Item>

      <Form.List name={[name, "conditions"]}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: "100%" }}>
            {fields.map((field) => (
              <Row key={field.key} gutter={8} align="top">
                <Col xs={24} md={7}>
                  <Form.Item
                    name={[field.name, "field"]}
                    rules={[{ required: true, message: "Field required" }]}
                  >
                    <Select placeholder="Field" options={ruleFieldOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name={[field.name, "operator"]}
                    rules={[{ required: true, message: "Operator required" }]}
                  >
                    <Select
                      placeholder="Operator"
                      options={ruleOperatorOptions}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={9}>
                  <Form.Item
                    name={[field.name, "value"]}
                    rules={[{ required: true, message: "Value required" }]}
                  >
                    <Input placeholder="Value (comma separated for list ops)" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={2}>
                  <Button danger onClick={() => remove(field.name)} block>
                    Remove
                  </Button>
                </Col>
              </Row>
            ))}

            <Button
              onClick={() =>
                add({ field: "name", operator: "contains", value: "" })
              }
            >
              Add rule
            </Button>
          </Space>
        )}
      </Form.List>

      <Typography.Text type="secondary">
        Smart rules are evaluated deterministically against current product
        data.
      </Typography.Text>
    </Card>
  );
}

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [assigningCollection, setAssigningCollection] = useState(null);
  const [previewCollection, setPreviewCollection] = useState(null);
  const [filters, setFilters] = useState({
    status: "all",
    collectionType: "all",
    search: "",
  });

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  const loadData = async () => {
    setLoadError("");
    setIsLoading(true);
    try {
      const [list, productList] = await Promise.all([
        getCollections(filters),
        getProducts("all"),
      ]);
      setCollections(list);
      setProducts(productList);
    } catch (err) {
      setLoadError(err.message || "Failed to load collections.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.status, filters.collectionType, filters.search]);

  const collectionMetrics = useMemo(() => {
    const smart = collections.filter(
      (item) => item.collectionType === "smart",
    ).length;
    const manual = collections.length - smart;
    const active = collections.filter(
      (item) => item.status === "active",
    ).length;
    return {
      total: collections.length,
      smart,
      manual,
      active,
    };
  }, [collections]);

  async function onCreate(values) {
    setNotice({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      await createCollection(values);
      form.resetFields();
      await loadData();
      setNotice({ type: "success", message: "Collection created." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to create collection.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onUpdate(values) {
    if (!editingCollection) return;

    setNotice({ type: "", message: "" });
    setIsUpdating(true);
    try {
      await updateCollection(editingCollection.id, values);
      setEditingCollection(null);
      await loadData();
      setNotice({ type: "success", message: "Collection updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update collection.",
      });
    } finally {
      setIsUpdating(false);
    }
  }

  async function onDelete(record) {
    setNotice({ type: "", message: "" });
    try {
      await deleteCollection(record.id);
      await loadData();
      setNotice({ type: "success", message: "Collection deleted." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to delete collection.",
      });
    }
  }

  async function onAssign(values) {
    if (!assigningCollection) return;

    setNotice({ type: "", message: "" });
    setIsAssigning(true);
    try {
      await updateCollectionProducts(
        assigningCollection.id,
        values.productIds || [],
      );
      setAssigningCollection(null);
      await loadData();
      setNotice({ type: "success", message: "Products assignment updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to assign products.",
      });
    } finally {
      setIsAssigning(false);
    }
  }

  function openEdit(record) {
    setEditingCollection(record);
    editForm.setFieldsValue({
      name: record.name,
      urlHandle: record.urlHandle || "",
      description: record.description,
      seoTitle: record.seoTitle || "",
      seoDescription: record.seoDescription || "",
      collectionType: record.collectionType,
      status: record.status,
      rules:
        record.rules ||
        (record.collectionType === "smart"
          ? {
              match: "all",
              conditions: [{ field: "name", operator: "contains", value: "" }],
            }
          : undefined),
    });
  }

  function openAssign(record) {
    setAssigningCollection(record);
    assignForm.setFieldsValue({
      productIds: record.productIds || [],
    });
  }

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Handle", dataIndex: "urlHandle", key: "urlHandle" },
    {
      title: "Type",
      dataIndex: "collectionType",
      key: "collectionType",
      render: (value) =>
        value === "smart" ? <Tag color="purple">smart</Tag> : <Tag>manual</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag color={value === "active" ? "green" : "blue"}>{value}</Tag>
      ),
    },
    { title: "Products", dataIndex: "productCount", key: "productCount" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          {record.collectionType === "manual" ? (
            <Button size="small" onClick={() => openAssign(record)}>
              Assign Products
            </Button>
          ) : (
            <Button size="small" onClick={() => setPreviewCollection(record)}>
              Preview Products
            </Button>
          )}
          <Button size="small" onClick={() => openEdit(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this collection?"
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => onDelete(record)}
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card>
        <Space align="center" size={12}>
          <Spin />
          <Typography.Text>Loading collections...</Typography.Text>
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
          message="Unable to load collections"
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
          Collections
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Organize products with manual curation or deterministic smart rules.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card size="small" title="Total">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {collectionMetrics.total}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Manual">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {collectionMetrics.manual}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Smart">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {collectionMetrics.smart}
            </Typography.Title>
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small" title="Active">
            <Typography.Title level={4} style={{ margin: 0 }}>
              {collectionMetrics.active}
            </Typography.Title>
          </Card>
        </Col>
      </Row>

      <Card title="Create Collection">
        <Form
          form={form}
          layout="vertical"
          onFinish={onCreate}
          requiredMark={false}
          initialValues={{
            collectionType: "manual",
            status: "draft",
            rules: {
              match: "all",
              conditions: [{ field: "name", operator: "contains", value: "" }],
            },
          }}
        >
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item
                name="name"
                label="Name"
                rules={[{ required: true, message: "Name is required." }]}
              >
                <Input placeholder="Summer Launch" />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item
                name="collectionType"
                label="Type"
                rules={[{ required: true }]}
              >
                <Select options={collectionTypeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true }]}
              >
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="description" label="Description">
                <Input placeholder="Optional description" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="urlHandle" label="URL Handle">
                <Input placeholder="summer-launch" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="seoTitle" label="SEO Title">
                <Input placeholder="Collection SEO title" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="seoDescription" label="SEO Description">
                <Input placeholder="Collection SEO description" />
              </Form.Item>
            </Col>
          </Row>

          <CollectionRuleBuilder form={form} />

          <Button type="primary" htmlType="submit" loading={isSubmitting}>
            Create Collection
          </Button>
        </Form>
      </Card>

      <Card title="Collection Filters">
        <Row gutter={12}>
          <Col xs={24} md={8}>
            <Input
              placeholder="Search by name or description"
              value={filters.search}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, search: event.target.value }))
              }
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              value={filters.status}
              options={[
                { value: "all", label: "All statuses" },
                ...statusOptions,
              ]}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, status: value }))
              }
            />
          </Col>
          <Col xs={24} md={6}>
            <Select
              style={{ width: "100%" }}
              value={filters.collectionType}
              options={[
                { value: "all", label: "All types" },
                ...collectionTypeOptions,
              ]}
              onChange={(value) =>
                setFilters((prev) => ({ ...prev, collectionType: value }))
              }
            />
          </Col>
          <Col xs={24} md={4}>
            <Button
              block
              onClick={() =>
                setFilters({ status: "all", collectionType: "all", search: "" })
              }
            >
              Reset
            </Button>
          </Col>
        </Row>
      </Card>

      <Card title="Collection List">
        {collections.length === 0 ? (
          <Empty description="No collections yet. Create your first collection to improve product discovery.">
            <Button
              type="primary"
              onClick={() =>
                form.setFieldsValue({
                  name: "Featured Products",
                  collectionType: "manual",
                  status: "active",
                })
              }
            >
              Start with a template
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={collections}
            pagination={{ pageSize: 8 }}
          />
        )}
      </Card>

      <Modal
        title="Edit Collection"
        open={Boolean(editingCollection)}
        onCancel={() => setEditingCollection(null)}
        onOk={() => editForm.submit()}
        okText="Save changes"
        confirmLoading={isUpdating}
        destroyOnClose
        width={860}
      >
        <Form form={editForm} layout="vertical" onFinish={onUpdate}>
          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="name" label="Name" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="urlHandle" label="URL Handle">
                <Input placeholder="summer-launch" />
              </Form.Item>
            </Col>
            <Col xs={24} md={5}>
              <Form.Item
                name="collectionType"
                label="Type"
                rules={[{ required: true }]}
              >
                <Select options={collectionTypeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={3}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true }]}
              >
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="description" label="Description">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="seoTitle" label="SEO Title">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="seoDescription" label="SEO Description">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <CollectionRuleBuilder form={editForm} />
        </Form>
      </Modal>

      <Modal
        title="Assign Products"
        open={Boolean(assigningCollection)}
        onCancel={() => setAssigningCollection(null)}
        onOk={() => assignForm.submit()}
        okText="Save assignment"
        confirmLoading={isAssigning}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" onFinish={onAssign}>
          <Form.Item name="productIds" label="Products">
            <Select
              mode="multiple"
              optionFilterProp="label"
              options={products.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.sku})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Smart Collection Preview"
        open={Boolean(previewCollection)}
        onCancel={() => setPreviewCollection(null)}
        footer={
          <Button onClick={() => setPreviewCollection(null)} type="primary">
            Close
          </Button>
        }
        width={840}
        destroyOnClose
      >
        <Typography.Paragraph>
          <strong>{previewCollection?.name || "Collection"}</strong> currently
          matches {previewCollection?.productCount || 0} products.
        </Typography.Paragraph>

        <Table
          size="small"
          rowKey="id"
          dataSource={products.filter((item) =>
            (previewCollection?.productIds || []).includes(item.id),
          )}
          pagination={{ pageSize: 6 }}
          columns={[
            { title: "Name", dataIndex: "name", key: "name" },
            { title: "SKU", dataIndex: "sku", key: "sku" },
            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              render: (value) => <Tag>{value}</Tag>,
            },
          ]}
        />
      </Modal>
    </section>
  );
}
