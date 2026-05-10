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
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  createContentPage,
  deleteContentPage,
  getContentPagePreview,
  getContentPages,
  getSeoOverview,
  publishContentPage,
  updateContentPage,
} from "../services/api.js";

const statusOptions = ["all", "draft", "review", "published", "archived"].map(
  (value) => ({
    value,
    label: value === "all" ? "All statuses" : value,
  }),
);

const pageTypeOptions = [
  { value: "all", label: "All page types" },
  { value: "static", label: "Static page" },
  { value: "blog", label: "Blog post" },
];

const visibilityOptions = [
  { value: "preview", label: "Preview only" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

export default function ContentPagesPage() {
  const [rows, setRows] = useState([]);
  const [seoOverview, setSeoOverview] = useState({
    products: { total: 0, completionRate: 0 },
    collections: { total: 0, completionRate: 0 },
    contentPages: { total: 0, completionRate: 0, publishedCount: 0 },
  });
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingRow, setEditingRow] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewRow, setPreviewRow] = useState(null);

  const [form] = Form.useForm();

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const [pageRows, seo] = await Promise.all([
        getContentPages({
          status: statusFilter,
          pageType: typeFilter,
          search,
        }),
        getSeoOverview(),
      ]);
      setRows(pageRows);
      setSeoOverview(seo);
    } catch (err) {
      setError(err.message || "Failed to load content pages.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, search]);

  function openCreateModal() {
    setEditingRow(null);
    form.resetFields();
    form.setFieldsValue({
      pageType: "static",
      status: "draft",
      visibility: "preview",
    });
    setIsModalOpen(true);
  }

  function openEditModal(row) {
    setEditingRow(row);
    form.setFieldsValue({
      pageType: row.pageType,
      title: row.title,
      urlHandle: row.urlHandle,
      excerpt: row.excerpt,
      body: row.body,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      status: row.status,
      visibility: row.visibility,
      authorName: row.authorName,
    });
    setIsModalOpen(true);
  }

  async function onSubmit(values) {
    setError("");
    setNotice("");
    setIsSubmitting(true);
    try {
      if (editingRow) {
        await updateContentPage(editingRow.id, values);
        setNotice("Content page updated.");
      } else {
        await createContentPage(values);
        setNotice("Content page created.");
      }
      setIsModalOpen(false);
      setEditingRow(null);
      form.resetFields();
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to save content page.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onPublish(row) {
    setError("");
    setNotice("");
    try {
      await publishContentPage(row.id, row.visibility || "public");
      setNotice("Content page published.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to publish page.");
    }
  }

  async function onDelete(row) {
    setError("");
    setNotice("");
    try {
      await deleteContentPage(row.id);
      setNotice("Content page deleted.");
      await loadData();
    } catch (err) {
      setError(err.message || "Failed to delete page.");
    }
  }

  async function onPreview(row) {
    setError("");
    try {
      const preview = await getContentPagePreview(row.id);
      setPreviewRow(preview);
    } catch (err) {
      setError(err.message || "Failed to load preview.");
    }
  }

  const columns = [
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Handle", dataIndex: "urlHandle", key: "urlHandle" },
    {
      title: "Type",
      dataIndex: "pageType",
      key: "pageType",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "SEO",
      key: "seo",
      render: (_, row) => {
        const complete =
          String(row.seoTitle || "").trim() &&
          String(row.seoDescription || "").trim() &&
          String(row.urlHandle || "").trim();
        return complete ? (
          <Tag color="green">Complete</Tag>
        ) : (
          <Tag>Missing</Tag>
        );
      },
    },
    {
      title: "Status",
      key: "status",
      render: (_, row) => (
        <Tag color={row.status === "published" ? "green" : "blue"}>
          {row.status}
        </Tag>
      ),
    },
    {
      title: "Visibility",
      key: "visibility",
      render: (_, row) => <Tag>{row.visibility}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, row) => (
        <Space wrap>
          <Button size="small" onClick={() => onPreview(row)}>
            Preview
          </Button>
          <Button size="small" onClick={() => openEditModal(row)}>
            Edit
          </Button>
          {row.status !== "published" ? (
            <Button size="small" type="primary" onClick={() => onPublish(row)}>
              Publish
            </Button>
          ) : null}
          <Popconfirm
            title="Delete this content page?"
            onConfirm={() => onDelete(row)}
            okText="Delete"
            cancelText="Cancel"
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const completion = useMemo(() => {
    return {
      products: Number(seoOverview.products.completionRate || 0),
      collections: Number(seoOverview.collections.completionRate || 0),
      content: Number(seoOverview.contentPages.completionRate || 0),
    };
  }, [seoOverview]);

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        SEO & Content Pages
      </Typography.Title>
      <Typography.Text type="secondary">
        Manage static/blog content, SEO metadata, and publish visibility from
        one workflow.
      </Typography.Text>

      {error ? <Alert type="error" message={error} showIcon /> : null}
      {notice ? <Alert type="success" message={notice} showIcon /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Products SEO complete"
              value={completion.products}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Collections SEO complete"
              value={completion.collections}
              suffix="%"
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card>
            <Statistic
              title="Content SEO complete"
              value={completion.content}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Content Filters"
        extra={
          <Button type="primary" onClick={openCreateModal}>
            New content page
          </Button>
        }
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Input.Search
              placeholder="Search title, excerpt, handle"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              style={{ width: "100%" }}
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
            />
          </Col>
          <Col xs={24} md={8}>
            <Select
              style={{ width: "100%" }}
              value={typeFilter}
              options={pageTypeOptions}
              onChange={setTypeFilter}
            />
          </Col>
        </Row>
      </Card>

      <Card title="Content Pages">
        {!isLoading && !rows.length ? (
          <Empty description="No content pages yet">
            <Button type="primary" onClick={openCreateModal}>
              Create first page
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={rows}
            columns={columns}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 980 }}
          />
        )}
      </Card>

      <Modal
        title={editingRow ? "Edit content page" : "Create content page"}
        open={isModalOpen}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingRow(null);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={isSubmitting}
        okText={editingRow ? "Save changes" : "Create page"}
        width={860}
      >
        <Form form={form} layout="vertical" onFinish={onSubmit}>
          <Row gutter={12}>
            <Col xs={24} md={6}>
              <Form.Item
                name="pageType"
                label="Page type"
                rules={[{ required: true }]}
              >
                <Select
                  options={pageTypeOptions.filter(
                    (item) => item.value !== "all",
                  )}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="urlHandle" label="URL handle">
                <Input placeholder="about-us" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="excerpt" label="Excerpt">
            <Input />
          </Form.Item>

          <Form.Item name="body" label="Body" rules={[{ required: true }]}>
            <Input.TextArea rows={7} />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="seoTitle" label="SEO title">
                <Input placeholder="Max 70 chars" />
              </Form.Item>
            </Col>
            <Col xs={24} md={10}>
              <Form.Item name="seoDescription" label="SEO description">
                <Input placeholder="Max 160 chars" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="authorName" label="Author">
                <Input />
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
                  options={statusOptions.filter((item) => item.value !== "all")}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="visibility"
                label="Visibility"
                rules={[{ required: true }]}
              >
                <Select options={visibilityOptions} />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={previewRow ? `Preview: ${previewRow.title}` : "Preview"}
        open={Boolean(previewRow)}
        onCancel={() => setPreviewRow(null)}
        footer={<Button onClick={() => setPreviewRow(null)}>Close</Button>}
        width={860}
      >
        {previewRow ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text type="secondary">
              {previewRow.previewUrl}
            </Typography.Text>
            <Typography.Title level={4} style={{ marginBottom: 0 }}>
              {previewRow.title}
            </Typography.Title>
            {previewRow.excerpt ? (
              <Typography.Paragraph type="secondary">
                {previewRow.excerpt}
              </Typography.Paragraph>
            ) : null}
            <Card size="small" title="Body preview">
              <Typography.Paragraph
                style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}
              >
                {previewRow.body}
              </Typography.Paragraph>
            </Card>
            <Card size="small" title="SEO Preview">
              <Typography.Text strong>
                {previewRow.seoTitle || previewRow.title}
              </Typography.Text>
              <Typography.Paragraph
                type="secondary"
                style={{ marginBottom: 0 }}
              >
                {previewRow.seoDescription || "No SEO description set."}
              </Typography.Paragraph>
            </Card>
          </Space>
        ) : null}
      </Modal>
    </Space>
  );
}
