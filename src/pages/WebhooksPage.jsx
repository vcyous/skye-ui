import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    PlusOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Descriptions,
    Drawer,
    Empty,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Spin,
    Table,
    Tabs,
    Tag,
    Tooltip
} from 'antd';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as webhookService from '../services/webhookService';

const WebhooksPage = () => {
  const { store } = useAuth();
  const [activeTab, setActiveTab] = useState('apiKeys');
  const [loading, setLoading] = useState(false);

  // API Keys State
  const [apiKeys, setApiKeys] = useState([]);
  const [apiKeyForm] = Form.useForm();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [selectedApiKey, setSelectedApiKey] = useState(null);
  const [newKeyDisplay, setNewKeyDisplay] = useState(null);

  // Webhook Endpoints State
  const [webhookEndpoints, setWebhookEndpoints] = useState([]);
  const [endpointForm] = Form.useForm();
  const [showEndpointModal, setShowEndpointModal] = useState(false);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [endpointLoading, setEndpointLoading] = useState({});

  // Subscriptions State
  const [subscriptions, setSubscriptions] = useState([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionForm] = Form.useForm();
  const [eventTemplates, setEventTemplates] = useState([]);

  // Deliveries State
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [showDeliveryDrawer, setShowDeliveryDrawer] = useState(false);
  const [deliveryLoading, setDeliveryLoading] = useState({});

  // Load event templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const templates = await webhookService.getWebhookEventTemplates();
        setEventTemplates(templates);
      } catch (err) {
        console.error('Error loading event templates:', err);
      }
    };
    loadTemplates();
  }, []);

  // ========== API KEYS MANAGEMENT ==========

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const keys = await webhookService.getApiKeys(store.id);
      setApiKeys(keys);
    } catch (err) {
      console.error('Error loading API keys:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'apiKeys') {
      loadApiKeys();
    }
  }, [activeTab]);

  const handleCreateApiKey = async (values) => {
    try {
      const newKey = await webhookService.createApiKey(store.id, {
        name: values.name,
        scopes: values.scopes || [],
        expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
      });

      setNewKeyDisplay(newKey.fullKey);
      setApiKeyForm().resetFields();
      await loadApiKeys();
      Modal.success({
        title: 'API Key Created',
        content: (
          <div>
            <p>Your API key has been created. Copy it now - you won't be able to see it again!</p>
            <Input.Password value={newKey.fullKey} readOnly />
          </div>
        ),
      });
      setShowApiKeyModal(false);
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handleRotateApiKey = async (keyId) => {
    try {
      const rotated = await webhookService.rotateApiKey(store.id, keyId);
      Modal.success({
        title: 'Key Rotated',
        content: (
          <div>
            <p>Your API key has been rotated. Copy the new key now!</p>
            <Input.Password value={rotated.fullKey} readOnly />
          </div>
        ),
      });
      await loadApiKeys();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handleDeleteApiKey = async (keyId) => {
    try {
      await webhookService.deleteApiKey(store.id, keyId);
      await loadApiKeys();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const apiKeyColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Key Prefix',
      dataIndex: 'keyPrefix',
      key: 'keyPrefix',
      render: (text) => <code>{text}</code>,
    },
    {
      title: 'Scopes',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes) => (
        <Space wrap>
          {scopes.slice(0, 2).map((scope) => (
            <Tag key={scope}>{scope}</Tag>
          ))}
          {scopes.length > 2 && <Tag>+{scopes.length - 2}</Tag>}
        </Space>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Last Used',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : 'Never',
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Rotate key">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              size="small"
              onClick={() => handleRotateApiKey(record.id)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete API Key?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteApiKey(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ========== WEBHOOK ENDPOINTS MANAGEMENT ==========

  const loadWebhookEndpoints = async () => {
    setLoading(true);
    try {
      const endpoints = await webhookService.getWebhookEndpoints(store.id);
      setWebhookEndpoints(endpoints);
    } catch (err) {
      console.error('Error loading webhook endpoints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'endpoints') {
      loadWebhookEndpoints();
    }
  }, [activeTab]);

  const handleCreateEndpoint = async (values) => {
    try {
      await webhookService.createWebhookEndpoint(store.id, {
        name: values.name,
        url: values.url,
        apiVersion: values.apiVersion,
        maxRetries: values.maxRetries,
        timeoutSeconds: values.timeoutSeconds,
      });

      endpointForm.resetFields();
      await loadWebhookEndpoints();
      setShowEndpointModal(false);
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handleTestEndpoint = async (endpointId) => {
    setEndpointLoading((prev) => ({ ...prev, [endpointId]: true }));
    try {
      const result = await webhookService.testWebhookEndpoint(store.id, endpointId);
      if (result.success) {
        Modal.success({ title: 'Test Successful', content: 'Webhook endpoint is responding correctly.' });
      } else {
        Modal.error({
          title: 'Test Failed',
          content: `Status: ${result.statusCode || 'Connection Error'} - ${result.message}`,
        });
      }
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    } finally {
      setEndpointLoading((prev) => ({ ...prev, [endpointId]: false }));
    }
  };

  const handleDeleteEndpoint = async (endpointId) => {
    try {
      await webhookService.deleteWebhookEndpoint(store.id, endpointId);
      await loadWebhookEndpoints();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const endpointColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      ellipsis: {
        showTitle: false,
      },
      render: (url) => <Tooltip title={url}>{url}</Tooltip>,
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Retries',
      dataIndex: 'maxRetries',
      key: 'maxRetries',
      width: 80,
    },
    {
      title: 'Timeout',
      dataIndex: 'timeoutSeconds',
      key: 'timeoutSeconds',
      render: (seconds) => `${seconds}s`,
      width: 90,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            onClick={() => handleTestEndpoint(record.id)}
            loading={endpointLoading[record.id]}
          >
            Test
          </Button>
          <Popconfirm
            title="Delete Endpoint?"
            description="This will remove all subscriptions for this endpoint."
            onConfirm={() => handleDeleteEndpoint(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ========== SUBSCRIPTIONS MANAGEMENT ==========

  const loadSubscriptions = async () => {
    setLoading(true);
    try {
      if (webhookEndpoints.length > 0) {
        const allSubs = [];
        for (const endpoint of webhookEndpoints) {
          const subs = await webhookService.getWebhookSubscriptions(store.id, endpoint.id);
          allSubs.push(...subs);
        }
        setSubscriptions(allSubs);
      }
    } catch (err) {
      console.error('Error loading subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'subscriptions') {
      loadSubscriptions();
    }
  }, [activeTab]);

  const handleCreateSubscription = async (values) => {
    try {
      await webhookService.createWebhookSubscription(store.id, {
        endpointId: values.endpointId,
        eventType: values.eventType,
        topic: values.topic,
        filters: values.filters,
      });

      subscriptionForm.resetFields();
      await loadSubscriptions();
      setShowSubscriptionModal(false);
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handleDeleteSubscription = async (subscriptionId) => {
    try {
      await webhookService.deleteWebhookSubscription(store.id, subscriptionId);
      await loadSubscriptions();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const subscriptionColumns = [
    {
      title: 'Endpoint',
      dataIndex: ['endpoint', 'name'],
      key: 'endpointName',
      render: (_, record) => {
        const endpoint = webhookEndpoints.find((e) => e.id === record.endpointId);
        return endpoint?.name || 'Unknown';
      },
    },
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      render: (eventType) => {
        const template = eventTemplates.find((t) => t.eventType === eventType);
        return template ? template.displayName : eventType;
      },
    },
    {
      title: 'Topic',
      dataIndex: 'topic',
      key: 'topic',
    },
    {
      title: 'Status',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="Delete Subscription?"
          description="Webhooks for this event will no longer be sent."
          onConfirm={() => handleDeleteSubscription(record.id)}
          okText="Delete"
          okType="danger"
        >
          <Button type="text" icon={<DeleteOutlined />} size="small" danger />
        </Popconfirm>
      ),
    },
  ];

  // ========== DELIVERY LOGS ==========

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      if (subscriptions.length > 0) {
        const allDeliveries = [];
        for (const sub of subscriptions) {
          const delivs = await webhookService.getWebhookDeliveries(store.id, sub.id, 20);
          allDeliveries.push(...delivs);
        }
        setDeliveries(allDeliveries.sort((a, b) => new Date(b.triggeredAt) - new Date(a.triggeredAt)));
      }
    } catch (err) {
      console.error('Error loading deliveries:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'deliveries') {
      loadDeliveries();
    }
  }, [activeTab]);

  const handleRetryDelivery = async (deliveryId) => {
    setDeliveryLoading((prev) => ({ ...prev, [deliveryId]: true }));
    try {
      await webhookService.retryWebhookDelivery(store.id, deliveryId);
      await loadDeliveries();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    } finally {
      setDeliveryLoading((prev) => ({ ...prev, [deliveryId]: false }));
    }
  };

  const deliveryColumns = [
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 150,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => {
        let color = 'default';
        let icon = null;
        if (status === 'succeeded') {
          color = 'green';
          icon = <CheckCircleOutlined />;
        } else if (status === 'failed') {
          color = 'red';
          icon = <CloseCircleOutlined />;
        } else if (status === 'pending_retry') {
          color = 'orange';
          icon = <ExclamationCircleOutlined />;
        }
        return (
          <Tag color={color} icon={icon}>
            {status}
          </Tag>
        );
      },
    },
    {
      title: 'Attempts',
      dataIndex: 'attemptNo',
      key: 'attemptNo',
      width: 80,
      render: (attempt, record) => `${attempt}/${record.maxRetries}`,
    },
    {
      title: 'Response Code',
      dataIndex: 'httpStatusCode',
      key: 'httpStatusCode',
      width: 100,
    },
    {
      title: 'Triggered',
      dataIndex: 'triggeredAt',
      key: 'triggeredAt',
      width: 150,
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedDelivery(record);
              setShowDeliveryDrawer(true);
            }}
          >
            Details
          </Button>
          {record.status !== 'succeeded' && (
            <Button
              type="link"
              size="small"
              loading={deliveryLoading[record.id]}
              onClick={() => handleRetryDelivery(record.id)}
            >
              Retry
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1>APIs & Webhooks</h1>
        <p>Manage API credentials, webhook subscriptions, and delivery logs.</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'apiKeys',
            label: 'API Keys',
            children: (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setShowApiKeyModal(true)}
                  >
                    Create API Key
                  </Button>
                </div>

                <Spin spinning={loading}>
                  {apiKeys.length === 0 ? (
                    <Empty description="No API keys yet" />
                  ) : (
                    <Table
                      columns={apiKeyColumns}
                      dataSource={apiKeys}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
          {
            key: 'endpoints',
            label: 'Webhook Endpoints',
            children: (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setShowEndpointModal(true)}
                  >
                    Add Endpoint
                  </Button>
                </div>

                <Spin spinning={loading}>
                  {webhookEndpoints.length === 0 ? (
                    <Empty description="No webhook endpoints configured" />
                  ) : (
                    <Table
                      columns={endpointColumns}
                      dataSource={webhookEndpoints}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
          {
            key: 'subscriptions',
            label: 'Subscriptions',
            children: (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setShowSubscriptionModal(true)}
                    disabled={webhookEndpoints.length === 0}
                  >
                    Subscribe to Event
                  </Button>
                  {webhookEndpoints.length === 0 && (
                    <Alert
                      message="Create a webhook endpoint first"
                      type="info"
                      style={{ marginTop: '16px' }}
                    />
                  )}
                </div>

                <Spin spinning={loading}>
                  {subscriptions.length === 0 ? (
                    <Empty description="No subscriptions yet" />
                  ) : (
                    <Table
                      columns={subscriptionColumns}
                      dataSource={subscriptions}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
          {
            key: 'deliveries',
            label: 'Delivery Logs',
            children: (
              <div>
                <Spin spinning={loading}>
                  {deliveries.length === 0 ? (
                    <Empty description="No delivery logs yet" />
                  ) : (
                    <Table
                      columns={deliveryColumns}
                      dataSource={deliveries}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
        ]}
      />

      {/* API Key Modal */}
      <Modal
        title="Create API Key"
        open={showApiKeyModal}
        onCancel={() => {
          setShowApiKeyModal(false);
          apiKeyForm.resetFields();
        }}
        onOk={() => apiKeyForm.submit()}
      >
        <Form
          form={apiKeyForm}
          layout="vertical"
          onFinish={handleCreateApiKey}
        >
          <Form.Item
            name="name"
            label="Key Name"
            rules={[{ required: true, message: 'Key name is required' }]}
          >
            <Input placeholder="e.g., My Integration" />
          </Form.Item>

          <Form.Item
            name="scopes"
            label="Scopes"
            rules={[{ required: true, message: 'Select at least one scope' }]}
          >
            <Select
              mode="multiple"
              placeholder="Select scopes"
              options={webhookService.API_KEY_SCOPES.map((scope) => ({
                label: scope,
                value: scope,
              }))}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Endpoint Modal */}
      <Modal
        title="Add Webhook Endpoint"
        open={showEndpointModal}
        onCancel={() => {
          setShowEndpointModal(false);
          endpointForm.resetFields();
        }}
        onOk={() => endpointForm.submit()}
      >
        <Form
          form={endpointForm}
          layout="vertical"
          onFinish={handleCreateEndpoint}
        >
          <Form.Item
            name="name"
            label="Endpoint Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g., My Webhook Receiver" />
          </Form.Item>

          <Form.Item
            name="url"
            label="Endpoint URL"
            rules={[
              { required: true, message: 'URL is required' },
              { type: 'url', message: 'Please enter a valid URL' },
            ]}
          >
            <Input placeholder="https://example.com/webhooks" />
          </Form.Item>

          <Form.Item
            name="apiVersion"
            label="API Version"
            initialValue="2024-01"
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="maxRetries"
            label="Max Retries"
            initialValue={5}
          >
            <Input type="number" min={1} max={10} />
          </Form.Item>

          <Form.Item
            name="timeoutSeconds"
            label="Timeout (seconds)"
            initialValue={30}
          >
            <Input type="number" min={5} max={60} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Subscription Modal */}
      <Modal
        title="Subscribe to Event"
        open={showSubscriptionModal}
        onCancel={() => {
          setShowSubscriptionModal(false);
          subscriptionForm.resetFields();
        }}
        onOk={() => subscriptionForm.submit()}
      >
        <Form
          form={subscriptionForm}
          layout="vertical"
          onFinish={handleCreateSubscription}
        >
          <Form.Item
            name="endpointId"
            label="Webhook Endpoint"
            rules={[{ required: true, message: 'Select an endpoint' }]}
          >
            <Select
              placeholder="Select endpoint"
              options={webhookEndpoints.map((ep) => ({
                label: ep.name,
                value: ep.id,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="eventType"
            label="Event Type"
            rules={[{ required: true, message: 'Select an event type' }]}
          >
            <Select
              placeholder="Select event type"
              options={eventTemplates.map((template) => ({
                label: template.displayName,
                value: template.eventType,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="topic"
            label="Topic"
            initialValue="all"
          >
            <Input placeholder="e.g., all, specific-id" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delivery Details Drawer */}
      <Drawer
        title="Delivery Details"
        placement="right"
        onClose={() => setShowDeliveryDrawer(false)}
        open={showDeliveryDrawer}
        width={500}
      >
        {selectedDelivery && (
          <div>
            <Descriptions size="small" column={1} style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="Status">
                <Tag
                  color={
                    selectedDelivery.status === 'succeeded'
                      ? 'green'
                      : selectedDelivery.status === 'failed'
                      ? 'red'
                      : 'orange'
                  }
                >
                  {selectedDelivery.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Event Type">
                {selectedDelivery.eventType}
              </Descriptions.Item>
              <Descriptions.Item label="Attempts">
                {selectedDelivery.attemptNo} / {selectedDelivery.maxRetries}
              </Descriptions.Item>
              <Descriptions.Item label="HTTP Status">
                {selectedDelivery.httpStatusCode || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Triggered">
                {new Date(selectedDelivery.triggeredAt).toLocaleString()}
              </Descriptions.Item>
              {selectedDelivery.deliveredAt && (
                <Descriptions.Item label="Delivered">
                  {new Date(selectedDelivery.deliveredAt).toLocaleString()}
                </Descriptions.Item>
              )}
              {selectedDelivery.nextRetryAt && (
                <Descriptions.Item label="Next Retry">
                  {new Date(selectedDelivery.nextRetryAt).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedDelivery.errorMessage && (
              <Card
                size="small"
                title="Error Message"
                style={{ marginBottom: '16px' }}
                type="inner"
              >
                <code>{selectedDelivery.errorMessage}</code>
              </Card>
            )}

            {selectedDelivery.responseBody && (
              <Card
                size="small"
                title="Response Body"
                style={{ marginBottom: '16px' }}
                type="inner"
              >
                <code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  {selectedDelivery.responseBody}
                </code>
              </Card>
            )}

            {selectedDelivery.status !== 'succeeded' && (
              <Button
                type="primary"
                block
                loading={deliveryLoading[selectedDelivery.id]}
                onClick={() => handleRetryDelivery(selectedDelivery.id)}
              >
                Retry Delivery
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default WebhooksPage;
