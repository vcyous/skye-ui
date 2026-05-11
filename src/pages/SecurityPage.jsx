import {
    CheckCircleOutlined,
    DeleteOutlined,
    ExclamationCircleOutlined,
    LockOutlined,
    ShieldOutlined,
    UserAddOutlined
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Col,
    Drawer,
    Empty,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Spin,
    Statistic,
    Table,
    Tabs,
    Tag
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import * as auditService from '../services/auditService';

const SecurityPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Users & Roles
  const [users, setUsers] = useState([]);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [form] = Form.useForm();

  // Security Events
  const [securityEvents, setSecurityEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventDrawerVisible, setEventDrawerVisible] = useState(false);

  // Compliance
  const [complianceStatus, setComplianceStatus] = useState([]);
  const [complianceStats, setComplianceStats] = useState(null);
  const [complianceModalVisible, setComplianceModalVisible] = useState(false);
  const [selectedCompliance, setSelectedCompliance] = useState(null);
  const [complianceForm] = Form.useForm();

  // Load data on mount and tab changes
  useEffect(() => {
    loadSecurityData();
  }, [activeTab]);

  const loadSecurityData = async () => {
    setLoading(true);
    setError(null);
    try {
      const storeId = localStorage.getItem('storeId') || 'demo-store';

      if (activeTab === 'users') {
        const userData = await auditService.getStoreUsers(storeId);
        setUsers(userData);
      } else if (activeTab === 'events') {
        const eventsData = await auditService.getSecurityEvents(storeId, {
          limit: 50,
        });
        setSecurityEvents(eventsData);
      } else if (activeTab === 'compliance') {
        const complianceData = await auditService.getComplianceStatus(storeId);
        setComplianceStatus(complianceData);

        // Calculate compliance stats
        if (complianceData.length > 0) {
          const verified = complianceData.filter((c) => c.status === 'verified').length;
          const pending = complianceData.filter((c) => c.status === 'pending').length;
          const failed = complianceData.filter((c) => c.status === 'failed').length;

          setComplianceStats({
            total: complianceData.length,
            verified,
            pending,
            failed,
            compliancePercentage: Math.round((verified / complianceData.length) * 100),
          });
        }
      }
    } catch (err) {
      console.error('Error loading security data:', err);
      setError('Failed to load security data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // USER ROLES TAB
  // ============================================================================

  const showRoleModal = (user = null) => {
    setSelectedUser(user);
    if (user) {
      form.setFieldsValue({
        userId: user.userId,
        role: user.roles[0] || undefined,
      });
    } else {
      form.resetFields();
    }
    setRoleModalVisible(true);
  };

  const handleRoleSubmit = async (values) => {
    try {
      const storeId = localStorage.getItem('storeId') || 'demo-store';

      if (selectedUser) {
        // Revoke old role and assign new one
        if (selectedUser.roles.length > 0) {
          await auditService.revokeUserRole(storeId, selectedUser.userId, selectedUser.roles[0]);
        }
      }

      await auditService.assignUserRole(storeId, values.userId, values.role);

      setRoleModalVisible(false);
      form.resetFields();
      await loadSecurityData();
    } catch (err) {
      console.error('Error assigning role:', err);
      Modal.error({ title: 'Error', content: 'Failed to assign role' });
    }
  };

  const handleRevokeRole = (user, role) => {
    Modal.confirm({
      title: 'Revoke Role',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to revoke the "${role}" role from this user?`,
      okText: 'Revoke',
      okType: 'danger',
      onOk: async () => {
        try {
          const storeId = localStorage.getItem('storeId') || 'demo-store';
          await auditService.revokeUserRole(storeId, user.userId, role);
          await loadSecurityData();
        } catch (err) {
          console.error('Error revoking role:', err);
          Modal.error({ title: 'Error', content: 'Failed to revoke role' });
        }
      },
    });
  };

  const userColumns = [
    {
      title: 'User ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 200,
      render: (id) => <span style={{ fontFamily: 'monospace' }}>{id}</span>,
    },
    {
      title: 'Roles',
      dataIndex: 'roles',
      key: 'roles',
      render: (roles) =>
        roles.map((role) => (
          <Tag key={role} color="blue">
            {role}
          </Tag>
        )),
    },
    {
      title: 'Assigned',
      dataIndex: 'assignedAt',
      key: 'assignedAt',
      render: (date) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            onClick={() => showRoleModal(record)}
          >
            Edit
          </Button>
          {record.roles.length > 0 && (
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleRevokeRole(record, record.roles[0])}
            />
          )}
        </Space>
      ),
    },
  ];

  // ============================================================================
  // SECURITY EVENTS TAB
  // ============================================================================

  const showEventDetails = (event) => {
    setSelectedEvent(event);
    setEventDrawerVisible(true);
  };

  const handleResolveEvent = async (eventId) => {
    try {
      const storeId = localStorage.getItem('storeId') || 'demo-store';
      await auditService.resolveSecurityEvent(storeId, eventId);
      await loadSecurityData();
    } catch (err) {
      console.error('Error resolving event:', err);
      Modal.error({ title: 'Error', content: 'Failed to resolve event' });
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'red',
      warning: 'orange',
      info: 'blue',
    };
    return colors[severity] || 'default';
  };

  const eventColumns = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 150,
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => (
        <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'resolvedAt',
      key: 'status',
      width: 100,
      render: (resolvedAt) =>
        resolvedAt ? (
          <Tag color="green">Resolved</Tag>
        ) : (
          <Tag color="red">Open</Tag>
        ),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          onClick={() => showEventDetails(record)}
        >
          View
        </Button>
      ),
    },
  ];

  // ============================================================================
  // COMPLIANCE TAB
  // ============================================================================

  const showComplianceModal = (compliance = null) => {
    setSelectedCompliance(compliance);
    if (compliance) {
      complianceForm.setFieldsValue({
        status: compliance.status,
        notes: compliance.notes,
        remediationPlan: compliance.remediationPlan,
        remediationDueDate: compliance.remediationDueDate
          ? dayjs(compliance.remediationDueDate)
          : null,
      });
    } else {
      complianceForm.resetFields();
    }
    setComplianceModalVisible(true);
  };

  const handleComplianceSubmit = async (values) => {
    try {
      const storeId = localStorage.getItem('storeId') || 'demo-store';

      if (selectedCompliance) {
        await auditService.updateComplianceStatus(
          storeId,
          selectedCompliance.requirementId,
          {
            status: values.status,
            notes: values.notes,
            remediationPlan: values.remediationPlan,
            remediationDueDate: values.remediationDueDate
              ? values.remediationDueDate.format('YYYY-MM-DD')
              : null,
          }
        );
      }

      setComplianceModalVisible(false);
      complianceForm.resetFields();
      await loadSecurityData();
    } catch (err) {
      console.error('Error updating compliance:', err);
      Modal.error({ title: 'Error', content: 'Failed to update compliance status' });
    }
  };

  const getComplianceStatusColor = (status) => {
    const colors = {
      verified: 'green',
      pending: 'orange',
      failed: 'red',
    };
    return colors[status] || 'default';
  };

  const complianceColumns = [
    {
      title: 'Requirement',
      dataIndex: 'requirementName',
      key: 'requirementName',
      width: 200,
    },
    {
      title: 'Framework',
      dataIndex: 'complianceFramework',
      key: 'complianceFramework',
      width: 120,
      render: (framework) => <Tag>{framework}</Tag>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getComplianceStatusColor(status)}>{status}</Tag>
      ),
    },
    {
      title: 'Verified',
      dataIndex: 'verifiedAt',
      key: 'verifiedAt',
      render: (date) =>
        date ? dayjs(date).format('YYYY-MM-DD') : '—',
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          onClick={() => showComplianceModal(record)}
        >
          Update
        </Button>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>Security & Compliance</h1>
        <p style={{ color: '#666' }}>
          Manage user access, monitor security events, and track compliance status.
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          style={{ marginBottom: '16px' }}
          onClose={() => setError(null)}
        />
      )}

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'users',
            label: (
              <span>
                <LockOutlined /> User Roles
              </span>
            ),
            children: (
              <div style={{ marginTop: '16px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                  </div>
                ) : users.length === 0 ? (
                  <Empty
                    description="No users found"
                    style={{ marginTop: '40px', marginBottom: '40px' }}
                  >
                    <Button type="primary" onClick={() => showRoleModal()}>
                      <UserAddOutlined /> Add User
                    </Button>
                  </Empty>
                ) : (
                  <>
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={() => showRoleModal()}
                      style={{ marginBottom: '16px' }}
                    >
                      Add User Role
                    </Button>
                    <Table
                      columns={userColumns}
                      dataSource={users}
                      rowKey="userId"
                      pagination={{ pageSize: 10 }}
                    />
                  </>
                )}
              </div>
            ),
          },
          {
            key: 'events',
            label: (
              <span>
                <ShieldOutlined /> Security Events
              </span>
            ),
            children: (
              <div style={{ marginTop: '16px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                  </div>
                ) : securityEvents.length === 0 ? (
                  <Empty
                    description="No security events"
                    style={{ marginTop: '40px', marginBottom: '40px' }}
                  />
                ) : (
                  <Table
                    columns={eventColumns}
                    dataSource={securityEvents}
                    rowKey="id"
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 1200 }}
                  />
                )}
              </div>
            ),
          },
          {
            key: 'compliance',
            label: (
              <span>
                <CheckCircleOutlined /> Compliance
              </span>
            ),
            children: (
              <div style={{ marginTop: '16px' }}>
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <Spin size="large" />
                  </div>
                ) : (
                  <>
                    {/* Compliance Stats */}
                    {complianceStats && (
                      <Row gutter={16} style={{ marginBottom: '24px' }}>
                        <Col xs={24} sm={12} md={6}>
                          <Card>
                            <Statistic
                              title="Total Requirements"
                              value={complianceStats.total}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Card>
                            <Statistic
                              title="Verified"
                              value={complianceStats.verified}
                              valueStyle={{ color: '#52c41a' }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Card>
                            <Statistic
                              title="Pending"
                              value={complianceStats.pending}
                              valueStyle={{ color: '#faad14' }}
                            />
                          </Card>
                        </Col>
                        <Col xs={24} sm={12} md={6}>
                          <Card>
                            <Statistic
                              title="Compliance Score"
                              value={complianceStats.compliancePercentage}
                              suffix="%"
                            />
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {/* Compliance Table */}
                    {complianceStatus.length === 0 ? (
                      <Empty description="No compliance requirements found" />
                    ) : (
                      <Table
                        columns={complianceColumns}
                        dataSource={complianceStatus}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                      />
                    )}
                  </>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* Role Assignment Modal */}
      <Modal
        title={selectedUser ? 'Update User Role' : 'Assign User Role'}
        open={roleModalVisible}
        onCancel={() => setRoleModalVisible(false)}
        footer={null}
      >
        <Form form={form} onFinish={handleRoleSubmit} layout="vertical">
          <Form.Item
            label="User ID"
            name="userId"
            rules={[{ required: true, message: 'Please enter user ID' }]}
          >
            <Input placeholder="user@example.com" disabled={!!selectedUser} />
          </Form.Item>

          <Form.Item
            label="Role"
            name="role"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select
              placeholder="Select role"
              options={[
                { value: 'owner', label: 'Owner (Full Access)' },
                { value: 'admin', label: 'Admin (Most Access)' },
                { value: 'finance', label: 'Finance (Payments & Reports)' },
                { value: 'viewer', label: 'Viewer (Read-Only)' },
              ]}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {selectedUser ? 'Update' : 'Assign'} Role
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Security Event Detail Drawer */}
      <Drawer
        title="Security Event Details"
        placement="right"
        width={500}
        onClose={() => setEventDrawerVisible(false)}
        open={eventDrawerVisible}
      >
        {selectedEvent && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Event Type
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                {selectedEvent.eventType}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Severity
              </div>
              <Tag color={getSeverityColor(selectedEvent.severity)}>
                {selectedEvent.severity.toUpperCase()}
              </Tag>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Description
              </div>
              <div style={{ fontSize: '14px' }}>
                {selectedEvent.description}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Timestamp
              </div>
              <div style={{ fontSize: '14px' }}>
                {dayjs(selectedEvent.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </div>

            {selectedEvent.sourceIp && (
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Source IP
                </div>
                <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                  {selectedEvent.sourceIp}
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Status
              </div>
              {selectedEvent.resolvedAt ? (
                <Tag color="green">Resolved</Tag>
              ) : (
                <Button
                  type="primary"
                  danger
                  onClick={() => handleResolveEvent(selectedEvent.id)}
                >
                  Mark as Resolved
                </Button>
              )}
            </div>
          </Space>
        )}
      </Drawer>

      {/* Compliance Update Modal */}
      <Modal
        title="Update Compliance Status"
        open={complianceModalVisible}
        onCancel={() => setComplianceModalVisible(false)}
        footer={null}
      >
        {selectedCompliance && (
          <Form
            form={complianceForm}
            onFinish={handleComplianceSubmit}
            layout="vertical"
          >
            <Form.Item
              label="Requirement"
              value={selectedCompliance.requirementName}
            >
              <div>{selectedCompliance.requirementName}</div>
            </Form.Item>

            <Form.Item
              label="Status"
              name="status"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'pending', label: 'Pending' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="Remediation Plan"
              name="remediationPlan"
            >
              <Input.TextArea rows={3} />
            </Form.Item>

            <Form.Item
              label="Notes"
              name="notes"
            >
              <Input.TextArea rows={2} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block>
                Update Status
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default SecurityPage;
