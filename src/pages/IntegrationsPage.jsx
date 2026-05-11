import {
    Alert,
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
    Switch,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import {
    createIntegration,
    getIntegrationSyncRuns,
    getIntegrations,
    runIntegrationSync,
    setIntegrationEnabled,
    setIntegrationKillSwitch,
} from "../services/integrationService.js";

export default function IntegrationsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncRuns, setSyncRuns] = useState([]);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [isSyncRunsOpen, setIsSyncRunsOpen] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  async function loadData() {
    try {
      setLoading(true);
      const data = await getIntegrations({ status: statusFilter });
      setRows(data);
    } catch (error) {
      message.error(error.message || "Failed to load integrations");
    } finally {
      setLoading(false);
    }
  }

  async function onCreate() {
    try {
      const values = await form.validateFields();
      await createIntegration(values);
      message.success("Integration created");
      setIsModalOpen(false);
      form.resetFields();
      await loadData();
    } catch (error) {
      if (!error?.errorFields) {
        message.error(error.message || "Failed to create integration");
      }
    }
  }

  async function onEnableToggle(record, enabled) {
    try {
      await setIntegrationEnabled(record.id, enabled);
      message.success(enabled ? "Integration enabled" : "Integration disabled");
      await loadData();
    } catch (error) {
      message.error(error.message || "Failed to update integration state");
    }
  }

  async function onKillSwitchToggle(record, enabled) {
    try {
      await setIntegrationKillSwitch(record.id, enabled);
      message.success(enabled ? "Kill switch enabled" : "Kill switch disabled");
      await loadData();
    } catch (error) {
      message.error(error.message || "Failed to update kill switch");
    }
  }

  async function onRunSync(record) {
    try {
      const result = await runIntegrationSync(record.id, "sync");
      message.success(
        result.status === "succeeded"
          ? "Sync completed"
          : "Sync finished with failure",
      );
      await loadData();
    } catch (error) {
      message.error(error.message || "Failed to run sync");
    }
  }

  async function onOpenRuns(record) {
    try {
      setSelectedIntegration(record);
      const runs = await getIntegrationSyncRuns(record.id, 20);
      setSyncRuns(runs);
      setIsSyncRunsOpen(true);
    } catch (error) {
      message.error(error.message || "Failed to load sync runs");
    }
  }

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return rows.filter((item) => {
      if (!keyword) {
        return true;
      }
      return [item.displayName, item.providerName, item.integrationKey]
        .join(" ")
        .toLowerCase()
        .includes(keyword);
    });
  }, [rows, search]);

  const columns = [
    {
      title: "Integration",
      key: "integration",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.displayName}</Typography.Text>
          <Typography.Text type="secondary">
            {record.providerName} - {record.integrationKey}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      render: (value) => <Tag>{value}</Tag>,
    },
    {
      title: "Health",
      key: "health",
      render: (_, record) => {
        const color =
          record.healthStatus === "healthy"
            ? "green"
            : record.healthStatus === "warning"
              ? "gold"
              : record.healthStatus === "error"
                ? "red"
                : "default";
        return <Tag color={color}>{record.healthStatus}</Tag>;
      },
    },
    {
      title: "Last Sync",
      dataIndex: "lastSyncedAt",
      key: "lastSyncedAt",
      render: (value) => (value ? new Date(value).toLocaleString() : "-") ,
    },
    {
      title: "Enabled",
      key: "enabled",
      render: (_, record) => (
        <Switch
          checked={record.isEnabled}
          disabled={record.killSwitchEnabled}
          onChange={(checked) => onEnableToggle(record, checked)}
        />
      ),
    },
    {
      title: "Kill Switch",
      key: "killSwitch",
      render: (_, record) => (
        <Switch
          checked={record.killSwitchEnabled}
          onChange={(checked) => onKillSwitchToggle(record, checked)}
        />
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button
            size="small"
            onClick={() => onRunSync(record)}
            disabled={!record.isEnabled || record.killSwitchEnabled}
          >
            Run Sync
          </Button>
          <Button size="small" type="link" onClick={() => onOpenRuns(record)}>
            Sync Logs
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title="App Integrations"
        extra={
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="Search integrations"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              style={{ width: 240 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 160 }}
              options={[
                { value: "all", label: "All status" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
                { value: "degraded", label: "Degraded" },
                { value: "disabled", label: "Disabled" },
              ]}
            />
            <Button type="primary" onClick={() => setIsModalOpen(true)}>
              Add Integration
            </Button>
          </Space>
        }
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="Enable kill switch to stop all sync actions for unstable providers while preserving configuration."
        />

        <Spin spinning={loading}>
          {filteredRows.length === 0 ? (
            <Empty description="No integrations configured">
              <Button type="primary" onClick={() => setIsModalOpen(true)}>
                Create First Integration
              </Button>
            </Empty>
          ) : (
            <Table rowKey="id" dataSource={filteredRows} columns={columns} pagination={{ pageSize: 10 }} />
          )}
        </Spin>
      </Card>

      <Modal
        title="Create Integration"
        open={isModalOpen}
        onOk={onCreate}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        width={680}
      >
        <Form layout="vertical" form={form}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item
                name="displayName"
                label="Display Name"
                rules={[{ required: true, message: "Display name is required" }]}
              >
                <Input placeholder="Shopee Connector" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="integrationKey"
                label="Integration Key"
                rules={[{ required: true, message: "Integration key is required" }]}
              >
                <Input placeholder="shopee" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="providerName" label="Provider Name">
                <Input placeholder="Shopee" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Category" initialValue="marketplace">
                <Select
                  options={[
                    { value: "marketplace", label: "Marketplace" },
                    { value: "shipping", label: "Shipping" },
                    { value: "payments", label: "Payments" },
                    { value: "accounting", label: "Accounting" },
                    { value: "erp", label: "ERP" },
                    { value: "crm", label: "CRM" },
                    { value: "other", label: "Other" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="credentialsRef" label="Credentials Reference">
            <Input placeholder="vault://integrations/shopee/store-1" />
          </Form.Item>
          <Form.Item name="isEnabled" label="Enable Immediately" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={`Sync Logs - ${selectedIntegration?.displayName || ""}`}
        open={isSyncRunsOpen}
        onCancel={() => {
          setIsSyncRunsOpen(false);
          setSelectedIntegration(null);
          setSyncRuns([]);
        }}
        footer={null}
        width={860}
      >
        {syncRuns.length === 0 ? (
          <Empty description="No sync runs yet" />
        ) : (
          <Table
            rowKey="id"
            dataSource={syncRuns}
            pagination={{ pageSize: 8 }}
            columns={[
              {
                title: "Started",
                dataIndex: "startedAt",
                key: "startedAt",
                render: (value) => (value ? new Date(value).toLocaleString() : "-"),
              },
              {
                title: "Type",
                dataIndex: "runType",
                key: "runType",
              },
              {
                title: "Status",
                dataIndex: "status",
                key: "status",
                render: (value) => (
                  <Tag color={value === "succeeded" ? "green" : value === "failed" ? "red" : "gold"}>
                    {value}
                  </Tag>
                ),
              },
              {
                title: "Processed",
                dataIndex: "recordsProcessed",
                key: "recordsProcessed",
              },
              {
                title: "Success",
                dataIndex: "recordsSucceeded",
                key: "recordsSucceeded",
              },
              {
                title: "Failed",
                dataIndex: "recordsFailed",
                key: "recordsFailed",
              },
              {
                title: "Error",
                dataIndex: "errorMessage",
                key: "errorMessage",
                render: (value) => value || "-",
              },
            ]}
          />
        )}
      </Modal>
    </div>
  );
}
