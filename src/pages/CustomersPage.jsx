import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Switch,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
  addCustomerEngagementNote,
  createCustomer,
  createCustomerSegment,
  deleteCustomer,
  deleteCustomerSegment,
  getCustomers,
  getCustomerSegments,
  getCustomerTimeline,
  previewCustomerSegment,
  updateCustomer,
  updateCustomerSegment,
} from "../services/api.js";

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const segmentFields = [
  { value: "total_spent", label: "Total spent" },
  { value: "order_count", label: "Order count" },
  { value: "accepts_email", label: "Accepts email" },
  { value: "is_b2b", label: "B2B customer" },
  { value: "tags", label: "Tags" },
  { value: "company_name", label: "Company name" },
  { value: "last_order_days", label: "Last order days" },
];

const segmentOperators = [
  { value: "eq", label: "Equals" },
  { value: "neq", label: "Not equals" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not contains" },
  { value: "in", label: "In list" },
  { value: "not_in", label: "Not in list" },
  { value: "gt", label: "Greater than" },
  { value: "gte", label: "Greater or equal" },
  { value: "lt", label: "Less than" },
  { value: "lte", label: "Less or equal" },
];

function buildSegmentPayload(values) {
  const conditions = (values.conditions || [])
    .map((item) => ({
      field: item?.field,
      operator: item?.operator,
      value: item?.value,
    }))
    .filter((item) => item.field && item.operator);

  return {
    name: String(values.name || "").trim(),
    description: values.description || "",
    isActive: values.isActive !== false,
    filter: {
      match: values.match === "any" ? "any" : "all",
      conditions,
    },
  };
}

export default function CustomersPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [customers, setCustomers] = useState([]);
  const [segments, setSegments] = useState([]);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [isSegmentModalOpen, setIsSegmentModalOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState(null);
  const [timelineCustomer, setTimelineCustomer] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  const [customerForm] = Form.useForm();
  const [segmentForm] = Form.useForm();
  const [noteForm] = Form.useForm();

  async function loadData(activeSegment = segmentFilter) {
    setIsLoading(true);
    setError("");
    try {
      const [customerRows, segmentRows] = await Promise.all([
        getCustomers(
          activeSegment && activeSegment !== "all"
            ? { segmentId: activeSegment }
            : {},
        ),
        getCustomerSegments(),
      ]);
      setCustomers(customerRows);
      setSegments(segmentRows);
    } catch (err) {
      setError(err.message || "Failed to load customer CRM data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(segmentFilter);
  }, [segmentFilter]);

  const filteredCustomers = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return customers.filter((item) => {
      if (!keyword) {
        return true;
      }

      return [
        item.name,
        item.email,
        item.phone,
        item.companyName,
        ...(item.tags || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [customers, search]);

  const kpis = useMemo(() => {
    const totalCustomers = customers.length;
    const b2bCount = customers.filter((item) => item.isB2b).length;
    const subscribers = customers.filter((item) => item.acceptsEmail).length;
    const lifetimeRevenue = customers.reduce(
      (sum, item) => sum + Number(item.totalSpent || 0),
      0,
    );
    const activeSubscriptions = customers.reduce(
      (sum, item) => sum + Number(item.activeSubscriptions || 0),
      0,
    );

    return {
      totalCustomers,
      b2bCount,
      subscribers,
      lifetimeRevenue,
      activeSubscriptions,
    };
  }, [customers]);

  function openCreateCustomerModal() {
    setEditingCustomer(null);
    customerForm.resetFields();
    customerForm.setFieldsValue({
      acceptsEmail: true,
      isB2b: false,
      tags: "",
    });
    setIsCustomerModalOpen(true);
  }

  function openEditCustomerModal(customer) {
    setEditingCustomer(customer);
    customerForm.setFieldsValue({
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      acceptsEmail: customer.acceptsEmail,
      tags: (customer.tags || []).join(", "),
      notes: customer.notes,
      companyName: customer.companyName,
      b2bAccountNo: customer.b2bAccountNo,
      isB2b: customer.isB2b,
    });
    setIsCustomerModalOpen(true);
  }

  async function onSaveCustomer(values) {
    setError("");
    setNotice("");
    try {
      const payload = {
        ...values,
        tags: String(values.tags || "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      };

      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, payload);
        setNotice("Customer updated.");
      } else {
        await createCustomer(payload);
        setNotice("Customer created.");
      }

      setIsCustomerModalOpen(false);
      await loadData(segmentFilter);
    } catch (err) {
      setError(err.message || "Failed to save customer.");
    }
  }

  async function onDeleteCustomer(customerId) {
    setError("");
    setNotice("");
    try {
      await deleteCustomer(customerId);
      setNotice("Customer deleted.");
      await loadData(segmentFilter);
    } catch (err) {
      setError(err.message || "Failed to delete customer.");
    }
  }

  function openCreateSegmentModal() {
    setEditingSegment(null);
    setPreview(null);
    segmentForm.resetFields();
    segmentForm.setFieldsValue({
      match: "all",
      isActive: true,
      conditions: [{ field: "total_spent", operator: "gt", value: "0" }],
    });
    setIsSegmentModalOpen(true);
  }

  function openEditSegmentModal(segment) {
    setEditingSegment(segment);
    setPreview(null);
    segmentForm.setFieldsValue({
      name: segment.name,
      description: segment.description,
      match: segment.filter?.match || "all",
      isActive: segment.isActive,
      conditions:
        segment.filter?.conditions?.length > 0
          ? segment.filter.conditions
          : [{ field: "total_spent", operator: "gt", value: "0" }],
    });
    setIsSegmentModalOpen(true);
  }

  async function onPreviewSegment() {
    setError("");
    try {
      const values = await segmentForm.validateFields();
      const payload = buildSegmentPayload(values);
      const result = await previewCustomerSegment({ filter: payload.filter });
      setPreview(result);
    } catch (err) {
      setError(err.message || "Failed to preview segment.");
    }
  }

  async function onSaveSegment(values) {
    setError("");
    setNotice("");
    try {
      const payload = buildSegmentPayload(values);
      if (editingSegment) {
        await updateCustomerSegment(editingSegment.id, payload);
        setNotice("Segment updated.");
      } else {
        await createCustomerSegment(payload);
        setNotice("Segment created.");
      }
      setIsSegmentModalOpen(false);
      await loadData(segmentFilter);
    } catch (err) {
      setError(err.message || "Failed to save segment.");
    }
  }

  async function onDeleteSegment(segmentId) {
    setError("");
    setNotice("");
    try {
      await deleteCustomerSegment(segmentId);
      setNotice("Segment deleted.");
      await loadData(segmentFilter);
    } catch (err) {
      setError(err.message || "Failed to delete segment.");
    }
  }

  async function openTimeline(customer) {
    setTimelineCustomer(customer);
    setTimelineLoading(true);
    setError("");
    try {
      const rows = await getCustomerTimeline(customer.id);
      setTimeline(rows);
      noteForm.resetFields();
    } catch (err) {
      setError(err.message || "Failed to load timeline.");
      setTimeline([]);
    } finally {
      setTimelineLoading(false);
    }
  }

  async function onAddTimelineNote(values) {
    if (!timelineCustomer) {
      return;
    }

    setError("");
    try {
      await addCustomerEngagementNote(timelineCustomer.id, {
        title: values.title,
        description: values.description,
      });
      noteForm.resetFields();
      const rows = await getCustomerTimeline(timelineCustomer.id);
      setTimeline(rows);
      await loadData(segmentFilter);
    } catch (err) {
      setError(err.message || "Failed to add engagement note.");
    }
  }

  const customerColumns = [
    {
      title: "Customer",
      key: "customer",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">
            {record.email || "-"}
          </Typography.Text>
          <Typography.Text type="secondary">
            {record.phone || "-"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Segments",
      dataIndex: "tags",
      key: "tags",
      render: (tags = []) =>
        tags.length ? (
          tags.map((tag) => <Tag key={tag}>{tag}</Tag>)
        ) : (
          <Tag>-</Tag>
        ),
    },
    {
      title: "B2B",
      key: "b2b",
      render: (_, record) =>
        record.isB2b ? (
          <Tag color="blue">{record.companyName || "B2B"}</Tag>
        ) : (
          <Tag>Retail</Tag>
        ),
    },
    {
      title: "Lifetime value",
      key: "ltv",
      render: (_, record) => formatCurrency(record.totalSpent),
    },
    {
      title: "Orders",
      dataIndex: "orderCount",
      key: "orderCount",
    },
    {
      title: "Subscriptions",
      key: "subscriptions",
      render: (_, record) => (
        <Space>
          <Tag color="green">active {record.activeSubscriptions || 0}</Tag>
          <Tag>paused {record.pausedSubscriptions || 0}</Tag>
          {(record.pastDueSubscriptions || 0) > 0 ? (
            <Tag color="volcano">
              past_due {record.pastDueSubscriptions || 0}
            </Tag>
          ) : null}
        </Space>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditCustomerModal(record)}>
            Edit
          </Button>
          <Button size="small" onClick={() => openTimeline(record)}>
            Timeline
          </Button>
          <Popconfirm
            title="Delete customer?"
            description="This cannot be undone."
            onConfirm={() => onDeleteCustomer(record.id)}
          >
            <Button size="small" danger>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const segmentColumns = [
    {
      title: "Segment",
      key: "segment",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">
            {record.description || "No description"}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Match",
      key: "match",
      render: (_, record) =>
        record.filter?.match === "any" ? "Any condition" : "All conditions",
    },
    {
      title: "Conditions",
      key: "conditions",
      render: (_, record) => record.filter?.conditions?.length || 0,
    },
    {
      title: "Preview",
      key: "preview",
      render: (_, record) => Number(record.matchedCount || 0),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) =>
        record.isActive ? <Tag color="green">Active</Tag> : <Tag>Inactive</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditSegmentModal(record)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete segment?"
            description="This cannot be undone."
            onConfirm={() => onDeleteSegment(record.id)}
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
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        Customer CRM & Segmentation
      </Typography.Title>
      <Typography.Text type="secondary">
        Manage profiles, create segments, and review customer timeline context.
      </Typography.Text>

      {error ? <Alert type="error" message={error} showIcon /> : null}
      {notice ? <Alert type="success" message={notice} showIcon /> : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Customers" value={kpis.totalCustomers} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="Email subscribers" value={kpis.subscribers} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic title="B2B linked" value={kpis.b2bCount} />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Lifetime revenue"
              value={kpis.lifetimeRevenue}
              formatter={formatCurrency}
            />
          </Card>
        </Col>
        <Col xs={24} md={6}>
          <Card>
            <Statistic
              title="Active subscriptions"
              value={kpis.activeSubscriptions}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Customer Profiles"
        extra={
          <Space wrap>
            <Input.Search
              placeholder="Search customer"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 220 }}
            />
            <Select
              style={{ minWidth: 200 }}
              value={segmentFilter}
              onChange={setSegmentFilter}
              options={[
                { label: "All segments", value: "all" },
                ...segments.map((segment) => ({
                  label: segment.name,
                  value: segment.id,
                })),
              ]}
            />
            <Button type="primary" onClick={openCreateCustomerModal}>
              Add customer
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={filteredCustomers}
          columns={customerColumns}
          pagination={{ pageSize: 8 }}
          scroll={{ x: 920 }}
        />
      </Card>

      <Card
        title="Saved Segments"
        extra={
          <Button type="primary" onClick={openCreateSegmentModal}>
            New segment
          </Button>
        }
      >
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={segments}
          columns={segmentColumns}
          pagination={false}
          scroll={{ x: 760 }}
        />
      </Card>

      <Modal
        title={editingCustomer ? "Edit customer" : "Add customer"}
        open={isCustomerModalOpen}
        onCancel={() => setIsCustomerModalOpen(false)}
        onOk={() => customerForm.submit()}
        okText={editingCustomer ? "Save changes" : "Create customer"}
      >
        <Form layout="vertical" form={customerForm} onFinish={onSaveCustomer}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="firstName" label="First name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="lastName" label="Last name">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input />
          </Form.Item>
          <Form.Item name="tags" label="Tags (comma separated)">
            <Input placeholder="vip, wholesale" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="companyName" label="Company name">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="b2bAccountNo" label="B2B account no.">
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="acceptsEmail"
            label="Accepts email"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item name="isB2b" label="B2B linked" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingSegment ? "Edit segment" : "Create segment"}
        open={isSegmentModalOpen}
        onCancel={() => setIsSegmentModalOpen(false)}
        onOk={() => segmentForm.submit()}
        okText={editingSegment ? "Save segment" : "Create segment"}
        width={760}
      >
        <Form layout="vertical" form={segmentForm} onFinish={onSaveSegment}>
          <Form.Item
            name="name"
            label="Segment name"
            rules={[{ required: true }]}
          >
            <Input placeholder="High lifetime value" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="match" label="Match mode">
                <Select
                  options={[
                    { value: "all", label: "All conditions" },
                    { value: "any", label: "Any condition" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isActive"
                label="Segment active"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.List name="conditions">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Row gutter={8} key={field.key}>
                    <Col span={8}>
                      <Form.Item
                        name={[field.name, "field"]}
                        rules={[{ required: true }]}
                      >
                        <Select options={segmentFields} placeholder="Field" />
                      </Form.Item>
                    </Col>
                    <Col span={8}>
                      <Form.Item
                        name={[field.name, "operator"]}
                        rules={[{ required: true }]}
                      >
                        <Select
                          options={segmentOperators}
                          placeholder="Operator"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        name={[field.name, "value"]}
                        rules={[{ required: true }]}
                      >
                        <Input placeholder="Value" />
                      </Form.Item>
                    </Col>
                    <Col span={2}>
                      <Button onClick={() => remove(field.name)} danger>
                        X
                      </Button>
                    </Col>
                  </Row>
                ))}
                <Space>
                  <Button
                    onClick={() =>
                      add({ field: "", operator: "eq", value: "" })
                    }
                  >
                    Add condition
                  </Button>
                  <Button onClick={onPreviewSegment}>Preview match</Button>
                </Space>
              </Space>
            )}
          </Form.List>

          {preview ? (
            <Alert
              type="info"
              showIcon
              message={`${preview.matchedCount} of ${preview.totalCustomers} customers match this segment`}
              style={{ marginTop: 12 }}
            />
          ) : null}
        </Form>
      </Modal>

      <Modal
        title={
          timelineCustomer
            ? `Customer timeline: ${timelineCustomer.name}`
            : "Customer timeline"
        }
        open={Boolean(timelineCustomer)}
        onCancel={() => setTimelineCustomer(null)}
        footer={null}
        width={760}
      >
        <Form layout="vertical" form={noteForm} onFinish={onAddTimelineNote}>
          <Row gutter={8}>
            <Col span={8}>
              <Form.Item
                name="title"
                label="Note title"
                rules={[{ required: true }]}
              >
                <Input placeholder="Follow-up call" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="description"
                label="Description"
                rules={[{ required: true }]}
              >
                <Input placeholder="Customer asked for priority delivery" />
              </Form.Item>
            </Col>
            <Col span={4}>
              <Form.Item label=" ">
                <Button type="primary" htmlType="submit" block>
                  Add
                </Button>
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Timeline
          mode="left"
          items={(timeline || []).map((event) => ({
            label: new Date(event.createdAt).toLocaleString(),
            children: (
              <Space direction="vertical" size={0}>
                <Typography.Text strong>{event.title}</Typography.Text>
                <Typography.Text type="secondary">
                  {event.description}
                </Typography.Text>
                {event.amount !== undefined ? (
                  <Typography.Text>
                    {formatCurrency(event.amount)}
                  </Typography.Text>
                ) : null}
                <Tag>{event.type}</Tag>
              </Space>
            ),
          }))}
        />
        {!timelineLoading && !timeline.length ? (
          <Typography.Text type="secondary">
            No timeline events yet.
          </Typography.Text>
        ) : null}
      </Modal>
    </Space>
  );
}
