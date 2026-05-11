import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    DeleteOutlined,
    EditOutlined,
    ExclamationCircleOutlined,
    PauseCircleOutlined,
    PlayCircleOutlined,
    PlusOutlined
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Col,
    Descriptions,
    Drawer,
    Empty,
    Form,
    Input,
    Modal,
    Popconfirm,
    Progress,
    Row,
    Select,
    Space,
    Spin,
    Switch,
    Table,
    Tabs,
    Tag,
    Timeline,
    Tooltip
} from 'antd';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as automationService from '../services/automationService';

const AutomationsPage = () => {
  const { store } = useAuth();
  const [activeTab, setActiveTab] = useState('workflows');
  const [loading, setLoading] = useState(false);

  // Workflows State
  const [workflows, setWorkflows] = useState([]);
  const [workflowForm] = Form.useForm();
  const [showWorkflowModal, setShowWorkflowModal] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [triggerTemplates, setTriggerTemplates] = useState([]);
  const [actionTemplates, setActionTemplates] = useState([]);

  // Executions State
  const [executions, setExecutions] = useState([]);
  const [selectedExecution, setSelectedExecution] = useState(null);
  const [showExecutionDrawer, setShowExecutionDrawer] = useState(false);

  // Stats State
  const [workflowStats, setWorkflowStats] = useState(null);
  const [selectedWorkflowForStats, setSelectedWorkflowForStats] = useState(null);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const [triggers, actions] = await Promise.all([
          automationService.getTriggerTemplates(),
          automationService.getActionTemplates(),
        ]);
        setTriggerTemplates(triggers);
        setActionTemplates(actions);
      } catch (err) {
        console.error('Error loading templates:', err);
      }
    };
    loadTemplates();
  }, []);

  // ========== WORKFLOWS MANAGEMENT ==========

  const loadWorkflows = async () => {
    setLoading(true);
    try {
      const data = await automationService.getAutomationWorkflows(store.id);
      setWorkflows(data);
    } catch (err) {
      console.error('Error loading workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'workflows') {
      loadWorkflows();
    }
  }, [activeTab]);

  const handleCreateWorkflow = async (values) => {
    try {
      if (editingWorkflow) {
        await automationService.updateAutomationWorkflow(store.id, editingWorkflow.id, {
          name: values.name,
          description: values.description,
          triggerType: values.triggerType,
          triggerConfig: values.triggerConfig || {},
          executionMode: values.executionMode,
          maxRetries: values.maxRetries,
          retryDelaySeconds: values.retryDelaySeconds,
          timeoutSeconds: values.timeoutSeconds,
        });
      } else {
        await automationService.createAutomationWorkflow(store.id, {
          name: values.name,
          description: values.description,
          triggerType: values.triggerType,
          triggerConfig: values.triggerConfig || {},
          executionMode: values.executionMode,
          maxRetries: values.maxRetries,
          retryDelaySeconds: values.retryDelaySeconds,
          timeoutSeconds: values.timeoutSeconds,
          conditions: values.conditions || [],
          actions: values.actions || [],
        });
      }

      workflowForm.resetFields();
      await loadWorkflows();
      setShowWorkflowModal(false);
      setEditingWorkflow(null);
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handleToggleWorkflow = async (workflowId, currentState) => {
    try {
      await automationService.toggleWorkflowEnabled(store.id, workflowId, !currentState);
      await loadWorkflows();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handlePauseWorkflow = async (workflowId, currentState) => {
    try {
      await automationService.pauseWorkflow(store.id, workflowId, !currentState);
      await loadWorkflows();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handleDeleteWorkflow = async (workflowId) => {
    try {
      await automationService.deleteAutomationWorkflow(store.id, workflowId);
      await loadWorkflows();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handleEditWorkflow = async (workflow) => {
    try {
      const fullWorkflow = await automationService.getAutomationWorkflowById(store.id, workflow.id);
      setEditingWorkflow(fullWorkflow);
      workflowForm.setFieldsValue({
        name: fullWorkflow.name,
        description: fullWorkflow.description,
        triggerType: fullWorkflow.triggerType,
        triggerConfig: fullWorkflow.triggerConfig,
        executionMode: fullWorkflow.executionMode,
        maxRetries: fullWorkflow.maxRetries,
        retryDelaySeconds: fullWorkflow.retryDelaySeconds,
        timeoutSeconds: fullWorkflow.timeoutSeconds,
      });
      setShowWorkflowModal(true);
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const handleTriggerWorkflow = async (workflowId) => {
    try {
      await automationService.triggerWorkflowExecution(store.id, workflowId, {
        eventType: 'manual',
        eventId: `manual_${Date.now()}`,
      });
      await loadExecutions(workflowId);
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const getStatusColor = (status) => {
    if (status === 'succeeded') return 'green';
    if (status === 'failed') return 'red';
    if (status === 'paused') return 'orange';
    return 'default';
  };

  const getStatusIcon = (status) => {
    if (status === 'succeeded') return <CheckCircleOutlined />;
    if (status === 'failed') return <CloseCircleOutlined />;
    if (status === 'paused') return <ExclamationCircleOutlined />;
    return null;
  };

  const workflowColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Trigger',
      dataIndex: 'triggerType',
      key: 'triggerType',
      render: (triggerType) => {
        const template = triggerTemplates.find((t) => t.triggerType === triggerType);
        return template ? template.displayName : triggerType;
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 100,
      render: (_, record) => {
        if (!record.isEnabled) {
          return <Tag color="red">Disabled</Tag>;
        }
        if (record.isPaused) {
          return <Tag color="orange">Paused</Tag>;
        }
        return <Tag color="green">Active</Tag>;
      },
    },
    {
      title: 'Last Run',
      dataIndex: 'lastExecutedAt',
      key: 'lastExecutedAt',
      render: (date) => (date ? new Date(date).toLocaleDateString() : 'Never'),
    },
    {
      title: 'Success Rate',
      key: 'successRate',
      width: 120,
      render: (_, record) => {
        const rate = record.totalExecutions > 0 ? (record.successfulExecutions / record.totalExecutions) * 100 : 100;
        return <Progress type="circle" percent={Math.round(rate)} width={40} />;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            onClick={() => handleTriggerWorkflow(record.id)}
            icon={<PlayCircleOutlined />}
          >
            Run
          </Button>
          <Button
            type="text"
            size="small"
            onClick={() => handleEditWorkflow(record)}
            icon={<EditOutlined />}
          >
            Edit
          </Button>
          <Tooltip title={record.isEnabled ? 'Disable' : 'Enable'}>
            <Switch
              checked={record.isEnabled}
              onChange={() => handleToggleWorkflow(record.id, record.isEnabled)}
              size="small"
            />
          </Tooltip>
          <Tooltip title={record.isPaused ? 'Resume' : 'Pause'}>
            <Button
              type="text"
              size="small"
              danger={!record.isPaused}
              icon={record.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
              onClick={() => handlePauseWorkflow(record.id, record.isPaused)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Workflow?"
            description="This action cannot be undone."
            onConfirm={() => handleDeleteWorkflow(record.id)}
            okText="Delete"
            okType="danger"
          >
            <Button type="text" icon={<DeleteOutlined />} size="small" danger />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ========== EXECUTIONS MANAGEMENT ==========

  const loadExecutions = async (workflowId = null) => {
    setLoading(true);
    try {
      const data = await automationService.getAutomationExecutions(store.id, workflowId);
      setExecutions(data);
    } catch (err) {
      console.error('Error loading executions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'executions') {
      loadExecutions();
    }
  }, [activeTab]);

  const handleRetryExecution = async (executionId) => {
    try {
      await automationService.retryExecution(store.id, executionId);
      await loadExecutions();
    } catch (err) {
      Modal.error({ title: 'Error', content: err.message });
    }
  };

  const executionColumns = [
    {
      title: 'Workflow',
      dataIndex: ['workflow', 'name'],
      key: 'workflowName',
      render: (_, record) => {
        const workflow = workflows.find((w) => w.id === record.workflowId);
        return workflow?.name || 'Unknown';
      },
    },
    {
      title: 'Trigger',
      dataIndex: 'triggerEventType',
      key: 'triggerEventType',
    },
    {
      title: 'Status',
      dataIndex: 'executionStatus',
      key: 'executionStatus',
      render: (status) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Conditions Met',
      dataIndex: 'conditionsMet',
      key: 'conditionsMet',
      render: (met) => (
        <Tag color={met ? 'green' : 'red'}>{met ? 'Yes' : 'No'}</Tag>
      ),
    },
    {
      title: 'Actions',
      dataIndex: 'actionsExecuted',
      key: 'actionsExecuted',
      width: 80,
    },
    {
      title: 'Duration',
      dataIndex: 'durationMs',
      key: 'durationMs',
      render: (ms) => `${ms}ms`,
    },
    {
      title: 'Started',
      dataIndex: 'startedAt',
      key: 'startedAt',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            onClick={() => {
              setSelectedExecution(record);
              setShowExecutionDrawer(true);
            }}
          >
            Details
          </Button>
          {record.executionStatus !== 'succeeded' && (
            <Button
              type="link"
              size="small"
              onClick={() => handleRetryExecution(record.id)}
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
        <h1>Automation Workflows</h1>
        <p>Reduce manual operations with safe automations and event-driven workflows.</p>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'workflows',
            label: 'Workflows',
            children: (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      setEditingWorkflow(null);
                      workflowForm.resetFields();
                      setShowWorkflowModal(true);
                    }}
                  >
                    Create Workflow
                  </Button>
                </div>

                <Spin spinning={loading}>
                  {workflows.length === 0 ? (
                    <Empty description="No automation workflows yet" />
                  ) : (
                    <Table
                      columns={workflowColumns}
                      dataSource={workflows}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                    />
                  )}
                </Spin>
              </div>
            ),
          },
          {
            key: 'executions',
            label: 'Execution History',
            children: (
              <div>
                <Spin spinning={loading}>
                  {executions.length === 0 ? (
                    <Empty description="No executions yet" />
                  ) : (
                    <Table
                      columns={executionColumns}
                      dataSource={executions}
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

      {/* Workflow Modal */}
      <Modal
        title={editingWorkflow ? 'Edit Workflow' : 'Create Automation Workflow'}
        open={showWorkflowModal}
        onCancel={() => {
          setShowWorkflowModal(false);
          workflowForm.resetFields();
          setEditingWorkflow(null);
        }}
        onOk={() => workflowForm.submit()}
        width={600}
      >
        <Form
          form={workflowForm}
          layout="vertical"
          onFinish={handleCreateWorkflow}
        >
          <Form.Item
            name="name"
            label="Workflow Name"
            rules={[{ required: true, message: 'Name is required' }]}
          >
            <Input placeholder="e.g., Send order confirmation email" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
          >
            <Input.TextArea placeholder="Describe what this workflow does" rows={3} />
          </Form.Item>

          <Form.Item
            name="triggerType"
            label="Trigger Event"
            rules={[{ required: true, message: 'Select a trigger' }]}
          >
            <Select
              placeholder="Select trigger type"
              options={triggerTemplates.map((t) => ({
                label: t.displayName,
                value: t.triggerType,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="executionMode"
            label="Execution Mode"
            initialValue="auto"
          >
            <Select
              options={[
                { label: 'Automatic', value: 'auto' },
                { label: 'Manual Review', value: 'manual' },
                { label: 'Disabled', value: 'disabled' },
              ]}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={12}>
              <Form.Item
                name="maxRetries"
                label="Max Retries"
                initialValue={3}
              >
                <Input type="number" min={0} max={10} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item
                name="retryDelaySeconds"
                label="Retry Delay (seconds)"
                initialValue={300}
              >
                <Input type="number" min={60} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="timeoutSeconds"
            label="Timeout (seconds)"
            initialValue={1800}
          >
            <Input type="number" min={30} max={3600} />
          </Form.Item>

          <Alert
            message="Note: Conditions and actions can be configured after creating the workflow"
            type="info"
            showIcon
          />
        </Form>
      </Modal>

      {/* Execution Details Drawer */}
      <Drawer
        title="Execution Details"
        placement="right"
        onClose={() => setShowExecutionDrawer(false)}
        open={showExecutionDrawer}
        width={600}
      >
        {selectedExecution && (
          <div>
            <Descriptions size="small" column={1} style={{ marginBottom: '24px' }}>
              <Descriptions.Item label="Status">
                <Tag
                  color={getStatusColor(selectedExecution.executionStatus)}
                  icon={getStatusIcon(selectedExecution.executionStatus)}
                >
                  {selectedExecution.executionStatus}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Trigger">
                {selectedExecution.triggerEventType}
              </Descriptions.Item>
              <Descriptions.Item label="Conditions Met">
                {selectedExecution.conditionsMet ? 'Yes' : 'No'}
              </Descriptions.Item>
              <Descriptions.Item label="Actions Executed">
                {selectedExecution.actionsExecuted}
              </Descriptions.Item>
              <Descriptions.Item label="Attempts">
                {selectedExecution.attemptNo} / {selectedExecution.maxRetries}
              </Descriptions.Item>
              <Descriptions.Item label="Duration">
                {selectedExecution.durationMs}ms
              </Descriptions.Item>
              <Descriptions.Item label="Started">
                {new Date(selectedExecution.startedAt).toLocaleString()}
              </Descriptions.Item>
              {selectedExecution.completedAt && (
                <Descriptions.Item label="Completed">
                  {new Date(selectedExecution.completedAt).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedExecution.executionLogs && selectedExecution.executionLogs.length > 0 && (
              <Card
                size="small"
                title="Execution Logs"
                style={{ marginBottom: '16px' }}
                type="inner"
              >
                <Timeline
                  items={selectedExecution.executionLogs.map((log, idx) => ({
                    children: log,
                    dot: <CheckCircleOutlined style={{ fontSize: '16px' }} />,
                  }))}
                />
              </Card>
            )}

            {selectedExecution.errorMessage && (
              <Card
                size="small"
                title="Error Details"
                type="inner"
                style={{ marginBottom: '16px' }}
              >
                <code style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
                  {selectedExecution.errorMessage}
                </code>
              </Card>
            )}

            {selectedExecution.executionStatus !== 'succeeded' && (
              <Button
                type="primary"
                block
                onClick={() => handleRetryExecution(selectedExecution.id)}
              >
                Retry Execution
              </Button>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default AutomationsPage;
