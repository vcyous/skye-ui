import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Badge,
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
  Tabs,
  Tag,
  Tooltip,
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
} from "../../services/api";

const STATUS_TABS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "draft", label: "Draft" },
  { key: "archived", label: "Archived" },
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
  { value: "all", label: "Products must match all conditions" },
  { value: "any", label: "Products must match any condition" },
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
        message="Manual collection — products are added manually"
        description="After saving, use the Assign Products action to pick which products appear in this collection."
        style={{ marginTop: 8 }}
      />
    );
  }

  return (
    <Card size="small" title="Conditions" style={{ marginTop: 8 }}>
      <Form.Item
        name={[name, "match"]}
        label="Products must match"
        initialValue="all"
        rules={[{ required: true }]}
        style={{ marginBottom: 12 }}
      >
        <Select options={matchModeOptions} style={{ width: 320 }} />
      </Form.Item>

      <Form.List name={[name, "conditions"]}>
        {(fields, { add, remove }) => (
          <Space direction="vertical" style={{ width: "100%" }}>
            {fields.map((field) => (
              <Row key={field.key} gutter={8} align="top">
                <Col xs={24} md={7}>
                  <Form.Item
                    name={[field.name, "field"]}
                    rules={[{ required: true, message: "Required" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select placeholder="Field" options={ruleFieldOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item
                    name={[field.name, "operator"]}
                    rules={[{ required: true, message: "Required" }]}
                    style={{ marginBottom: 0 }}
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
                    rules={[{ required: true, message: "Required" }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="Value" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={2}>
                  <Button danger onClick={() => remove(field.name)} block>
                    ✕
                  </Button>
                </Col>
              </Row>
            ))}
            <Button
              icon={<PlusOutlined />}
              onClick={() =>
                add({ field: "name", operator: "contains", value: "" })
              }
              type="dashed"
              style={{ marginTop: 4 }}
            >
              Add condition
            </Button>
          </Space>
        )}
      </Form.List>
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
  const [statusTab, setStatusTab] = useState("all");
  const [search, setSearch] = useState("");

  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [assignForm] = Form.useForm();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const loadData = async () => {
    setLoadError("");
    setIsLoading(true);
    try {
      const [list, productList] = await Promise.all([
        getCollections({ status: "all", collectionType: "all", search: "" }),
        getProducts("all"),
      ]);
      setCollections(list.map((c) => ({ ...c, rules: c.rules ?? undefined })));
      setProducts(productList);
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Failed to load collections.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const visibleCollections = useMemo(() => {
    let rows = [...collections];
    if (statusTab !== "all") {
      rows = rows.filter((c) => c.status === statusTab);
    }
    const term = search.trim().toLowerCase();
    if (term) {
      rows = rows.filter((c) =>
        [c.name, c.description, c.urlHandle]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    return rows;
  }, [collections, statusTab, search]);

  const tabCounts = useMemo(() => {
    const counts = { all: collections.length };
    for (const c of collections) {
      counts[c.status] = (counts[c.status] || 0) + 1;
    }
    return counts;
  }, [collections]);

  async function onCreate(values) {
    setNotice({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      await createCollection(values);
      form.resetFields();
      setIsCreateModalOpen(false);
      await loadData();
      setNotice({ type: "success", message: "Collection created." });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to create collection.",
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
        message:
          err instanceof Error ? err.message : "Failed to update collection.",
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
        message:
          err instanceof Error ? err.message : "Failed to delete collection.",
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
      setNotice({ type: "success", message: "Products updated." });
    } catch (err) {
      setNotice({
        type: "error",
        message:
          err instanceof Error ? err.message : "Failed to assign products.",
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
    assignForm.setFieldsValue({ productIds: record.productIds || [] });
  }

  const columns = [
    {
      title: "Title",
      key: "name",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong style={{ fontSize: 13 }}>
            {record.name}
          </Typography.Text>
          {record.urlHandle && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              /{record.urlHandle}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Products",
      key: "productCount",
      render: (_, record) => (
        <Typography.Text style={{ fontSize: 13 }}>
          {record.productCount ?? 0}
        </Typography.Text>
      ),
    },
    {
      title: "Type",
      key: "collectionType",
      render: (_, record) =>
        record.collectionType === "smart" ? (
          <Tag color="purple" style={{ fontSize: 12 }}>
            Smart
          </Tag>
        ) : (
          <Tag style={{ fontSize: 12 }}>Manual</Tag>
        ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Badge
          status={record.status === "active" ? "success" : "default"}
          text={
            <span style={{ textTransform: "capitalize", fontSize: 13 }}>
              {record.status}
            </span>
          }
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          {record.collectionType === "manual" ? (
            <Button size="small" onClick={() => openAssign(record)}>
              Assign products
            </Button>
          ) : (
            <Button size="small" onClick={() => setPreviewCollection(record)}>
              Preview
            </Button>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this collection?"
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => onDelete(record)}
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
          description={loadError}
          action={
            <Button size="small" onClick={loadData}>
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

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
          Collections
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create collection
        </Button>
      </div>

      {notice.message && (
        <Alert
          type={notice.type}
          message={notice.message}
          showIcon
          style={{ marginBottom: 12 }}
          closable
          onClose={() => setNotice({ type: "", message: "" })}
        />
      )}

      <Card bodyStyle={{ padding: 0 }}>
        {/* Status tabs */}
        <div style={{ borderBottom: "1px solid #f0f0f0", paddingLeft: 16 }}>
          <Tabs
            activeKey={statusTab}
            onChange={setStatusTab}
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

        {/* Search bar */}
        <div
          style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}
        >
          <Input
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            placeholder="Search collections"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            style={{ width: 280 }}
          />
        </div>

        {visibleCollections.length === 0 ? (
          <div style={{ padding: 48 }}>
            <Empty
              description={
                <Space direction="vertical" size={4}>
                  <Typography.Text strong>No collections yet</Typography.Text>
                  <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                    Create collections to group products for your storefront.
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
                Create collection
              </Button>
            </Empty>
          </div>
        ) : (
          <Table
            rowKey="id"
            columns={columns}
            dataSource={visibleCollections}
            pagination={{
              pageSize: 20,
              showSizeChanger: false,
              showTotal: (total) => `${total} collections`,
            }}
            size="middle"
          />
        )}
      </Card>

      {/* Create collection modal */}
      <Modal
        title="Create collection"
        open={isCreateModalOpen}
        onOk={() => form.submit()}
        onCancel={() => {
          setIsCreateModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={isSubmitting}
        destroyOnClose
        width={860}
        okText="Save collection"
      >
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
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Card size="small" style={{ marginBottom: 12 }}>
                <Form.Item
                  name="name"
                  label="Title"
                  rules={[{ required: true, message: "Title is required." }]}
                  style={{ marginBottom: 12 }}
                >
                  <Input placeholder="Summer Launch" size="large" />
                </Form.Item>
                <Form.Item
                  name="description"
                  label="Description"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Optional collection description"
                  />
                </Form.Item>
              </Card>

              <Card
                size="small"
                title="Collection type"
                style={{ marginBottom: 12 }}
              >
                <Form.Item
                  name="collectionType"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    options={[
                      {
                        value: "manual",
                        label: "Manual — add products one by one",
                      },
                      {
                        value: "smart",
                        label: "Automated — products added by conditions",
                      },
                    ]}
                  />
                </Form.Item>
                <CollectionRuleBuilder form={form} />
              </Card>

              <Card size="small" title="Search engine listing">
                <Form.Item name="urlHandle" label="URL handle">
                  <Input prefix="collections/" placeholder="summer-launch" />
                </Form.Item>
                <Form.Item name="seoTitle" label="Page title">
                  <Input placeholder="SEO title" maxLength={70} showCount />
                </Form.Item>
                <Form.Item
                  name="seoDescription"
                  label="Meta description"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="SEO description"
                    maxLength={160}
                    showCount
                  />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} md={8}>
              <Card size="small" title="Status">
                <Form.Item
                  name="status"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select options={statusOptions} />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Edit collection modal */}
      <Modal
        title="Edit collection"
        open={Boolean(editingCollection)}
        onCancel={() => setEditingCollection(null)}
        onOk={() => editForm.submit()}
        okText="Save changes"
        confirmLoading={isUpdating}
        destroyOnClose
        width={860}
      >
        <Form form={editForm} layout="vertical" onFinish={onUpdate}>
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
                  <Input.TextArea rows={3} />
                </Form.Item>
              </Card>

              <Card
                size="small"
                title="Collection type"
                style={{ marginBottom: 12 }}
              >
                <Form.Item
                  name="collectionType"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    options={[
                      {
                        value: "manual",
                        label: "Manual — add products one by one",
                      },
                      {
                        value: "smart",
                        label: "Automated — products added by conditions",
                      },
                    ]}
                  />
                </Form.Item>
                <CollectionRuleBuilder form={editForm} />
              </Card>

              <Card size="small" title="Search engine listing">
                <Form.Item name="urlHandle" label="URL handle">
                  <Input prefix="collections/" />
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
              <Card size="small" title="Status">
                <Form.Item
                  name="status"
                  rules={[{ required: true }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select options={statusOptions} />
                </Form.Item>
              </Card>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Assign products modal */}
      <Modal
        title={`Assign products — ${assigningCollection?.name}`}
        open={Boolean(assigningCollection)}
        onCancel={() => setAssigningCollection(null)}
        onOk={() => assignForm.submit()}
        okText="Save"
        confirmLoading={isAssigning}
        destroyOnClose
      >
        <Form form={assignForm} layout="vertical" onFinish={onAssign}>
          <Form.Item name="productIds" label="Products">
            <Select
              mode="multiple"
              optionFilterProp="label"
              placeholder="Search and select products"
              options={products.map((item) => ({
                value: item.id,
                label: `${item.name} (${item.sku})`,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Smart collection preview modal */}
      <Modal
        title={`Preview — ${previewCollection?.name}`}
        open={Boolean(previewCollection)}
        onCancel={() => setPreviewCollection(null)}
        footer={
          <Button type="primary" onClick={() => setPreviewCollection(null)}>
            Close
          </Button>
        }
        width={700}
        destroyOnClose
      >
        <Typography.Text
          type="secondary"
          style={{ display: "block", marginBottom: 12 }}
        >
          This collection matches {previewCollection?.productCount ?? 0}{" "}
          products based on your conditions.
        </Typography.Text>
        <Table
          size="small"
          rowKey="id"
          dataSource={products.filter((item) =>
            (previewCollection?.productIds || []).includes(item.id),
          )}
          pagination={{ pageSize: 8 }}
          columns={[
            { title: "Name", dataIndex: "name", key: "name" },
            { title: "SKU", dataIndex: "sku", key: "sku" },
            {
              title: "Status",
              dataIndex: "status",
              key: "status",
              render: (v) => <Tag>{v}</Tag>,
            },
          ]}
        />
      </Modal>
    </section>
  );
}
