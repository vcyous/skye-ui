import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
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

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [editingCollection, setEditingCollection] = useState(null);
  const [assigningCollection, setAssigningCollection] = useState(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  async function loadData() {
    const [list, productList] = await Promise.all([
      getCollections(),
      getProducts("all"),
    ]);
    setCollections(list);
    setProducts(productList);
  }

  useEffect(() => {
    loadData().catch((err) => {
      setNotice({
        type: "error",
        message: err.message || "Failed to load data.",
      });
    });
  }, []);

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

  function openEdit(record) {
    setEditingCollection(record);
    editForm.setFieldsValue({
      name: record.name,
      description: record.description,
      collectionType: record.collectionType,
      status: record.status,
    });
  }

  function openAssign(record) {
    setAssigningCollection(record);
    assignForm.setFieldsValue({
      productIds: record.productIds || [],
    });
  }

  async function onAssign(values) {
    if (!assigningCollection) return;
    setNotice({ type: "", message: "" });
    try {
      await updateCollectionProducts(
        assigningCollection.id,
        values.productIds || [],
      );
      setAssigningCollection(null);
      await loadData();
      setNotice({
        type: "success",
        message: "Products assigned to collection.",
      });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to assign products.",
      });
    }
  }

  const columns = [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Type",
      dataIndex: "collectionType",
      key: "collectionType",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    { title: "Products", dataIndex: "productCount", key: "productCount" },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => openAssign(record)}>
            Assign Products
          </Button>
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

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Collections
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Organize products into manual or smart merchandising collections.
        </Typography.Text>
      </header>

      {notice.message ? (
        <Alert type={notice.type || "info"} message={notice.message} showIcon />
      ) : null}

      <Card title="Create Collection">
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
              rules={[{ required: true, message: "Name is required." }]}
              style={{ minWidth: 220 }}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="collectionType"
              label="Type"
              initialValue="manual"
              rules={[{ required: true }]}
              style={{ minWidth: 180 }}
            >
              <Select options={collectionTypeOptions} />
            </Form.Item>
            <Form.Item
              name="status"
              label="Status"
              initialValue="draft"
              rules={[{ required: true }]}
              style={{ minWidth: 180 }}
            >
              <Select options={statusOptions} />
            </Form.Item>
            <Form.Item
              name="description"
              label="Description"
              style={{ minWidth: 320 }}
            >
              <Input />
            </Form.Item>
            <Form.Item label=" " style={{ minWidth: 140 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                block
              >
                Create
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </Card>

      <Card title="Collection List">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={collections}
          pagination={{ pageSize: 8 }}
        />
      </Card>

      <Modal
        title="Edit Collection"
        open={Boolean(editingCollection)}
        onCancel={() => setEditingCollection(null)}
        onOk={() => editForm.submit()}
        okText="Save changes"
        destroyOnClose
      >
        <Form form={editForm} layout="vertical" onFinish={onUpdate}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item
            name="collectionType"
            label="Type"
            rules={[{ required: true }]}
          >
            <Select options={collectionTypeOptions} />
          </Form.Item>
          <Form.Item name="status" label="Status" rules={[{ required: true }]}>
            <Select options={statusOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Assign Products"
        open={Boolean(assigningCollection)}
        onCancel={() => setAssigningCollection(null)}
        onOk={() => assignForm.submit()}
        okText="Save assignment"
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
    </section>
  );
}
