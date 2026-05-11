import {
    Button,
    Card,
    Col,
    Empty,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Spin,
    Table,
    Tag,
    Typography,
    message
} from "antd";
import { useEffect, useMemo, useState } from "react";
import { useAuthContext } from "../context/AuthContext.jsx";
import {
    createB2bCompany,
    deleteB2bCompany,
    getB2bCompanies,
    updateB2bCompany
} from "../services/b2bWholesaleService.js";

export default function B2bCompaniesPage() {
  const { user } = useAuthContext();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    loadCompanies();
  }, []);

  async function loadCompanies() {
    try {
      setLoading(true);
      const data = await getB2bCompanies({
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setCompanies(data);
    } catch (err) {
      message.error("Failed to load companies");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function onSave() {
    try {
      const values = await form.validateFields();

      if (editingCompany) {
        await updateB2bCompany(editingCompany.id, values);
        message.success("Company updated");
      } else {
        await createB2bCompany(values);
        message.success("Company created");
      }

      form.resetFields();
      setIsModalOpen(false);
      setEditingCompany(null);
      await loadCompanies();
    } catch (err) {
      if (err.errorFields) {
        return; // Validation error
      }
      message.error(err.message || "Failed to save company");
      console.error(err);
    }
  }

  async function onDelete(companyId) {
    Modal.confirm({
      title: "Delete Company",
      content: "Are you sure? This will remove the company and all associated data.",
      okText: "Delete",
      okType: "danger",
      async onOk() {
        try {
          await deleteB2bCompany(companyId);
          message.success("Company deleted");
          await loadCompanies();
        } catch (err) {
          message.error(err.message || "Failed to delete company");
          console.error(err);
        }
      },
    });
  }

  function openEditModal(company) {
    setEditingCompany(company);
    form.setFieldsValue({
      name: company.name,
      email: company.email,
      phone: company.phone,
      website: company.website,
      registrationNo: company.registrationNo,
      taxId: company.taxId,
      industry: company.industry,
      status: company.status,
      description: company.description,
    });
    setIsModalOpen(true);
  }

  function openCreateModal() {
    setEditingCompany(null);
    form.resetFields();
    setIsModalOpen(true);
  }

  const filteredCompanies = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return companies.filter((item) => {
      if (!keyword) {
        return true;
      }
      return [item.name, item.email, item.website, item.industry]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [companies, search]);

  const columns = [
    {
      title: "Company",
      key: "company",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">{record.email || "-"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.phone || "-"}</Typography.Text>
          <Typography.Text type="secondary">{record.website || "-"}</Typography.Text>
        </Space>
      ),
    },
    {
      title: "Industry",
      dataIndex: "industry",
      key: "industry",
      render: (value) => value || "-",
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
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Button type="link" size="small" danger onClick={() => onDelete(record.id)}>
            Delete
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
            <span>B2B Companies</span>
            <Tag color="blue">Wholesale Accounts</Tag>
          </Space>
        }
        extra={
          <Space wrap>
            <Input.Search
              placeholder="Search company, email, industry"
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 260 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "draft", label: "Draft" },
                { value: "suspended", label: "Suspended" },
                { value: "archived", label: "Archived" },
              ]}
              style={{ width: 160 }}
            />
            <Button type="primary" onClick={openCreateModal}>
              Add Company
            </Button>
          </Space>
        }
      >
        <Spin spinning={loading}>
          {filteredCompanies.length === 0 ? (
            <Empty
              description={search ? "No companies found" : "No B2B companies yet"}
              style={{ marginTop: "48px" }}
            >
              <Button type="primary" onClick={openCreateModal}>
                Create First Company
              </Button>
            </Empty>
          ) : (
            <Table
              columns={columns}
              dataSource={filteredCompanies}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          )}
        </Spin>
      </Card>

      <Modal
        title={editingCompany ? "Edit Company" : "Create Company"}
        open={isModalOpen}
        onOk={onSave}
        onCancel={() => {
          setIsModalOpen(false);
          setEditingCompany(null);
          form.resetFields();
        }}
        width={700}
      >
        <Form form={form} layout="vertical">
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Company Name"
                rules={[{ required: true, message: "Company name is required" }]}
              >
                <Input placeholder="Acme Corp" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="email" label="Email">
                <Input type="email" placeholder="contact@acmecorp.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="phone" label="Phone">
                <Input placeholder="+1 (555) 123-4567" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="website" label="Website">
                <Input placeholder="https://acmecorp.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="registrationNo" label="Registration No.">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="taxId" label="Tax ID">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item name="industry" label="Industry">
                <Input placeholder="Manufacturing, Retail, etc." />
              </Form.Item>
            </Col>
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
                    { value: "suspended", label: "Suspended" },
                    { value: "archived", label: "Archived" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Company overview or notes" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
