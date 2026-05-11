import {
    EyeOutlined,
    FilterOutlined,
    ReloadOutlined
} from '@ant-design/icons';
import {
    Alert,
    Button,
    Card,
    Col,
    DatePicker,
    Drawer,
    Empty,
    Row,
    Select,
    Space,
    Spin,
    Statistic,
    Table,
    Tag
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import * as auditService from '../services/auditService';

const AuditPage = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [stats, setStats] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    eventType: undefined,
    eventCategory: undefined,
    severity: undefined,
    startDate: null,
    endDate: null,
    limit: 100,
  });

  // Load audit logs and statistics on mount and filter changes
  useEffect(() => {
    loadAuditData();
  }, [filters]);

  const loadAuditData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Get current store from auth context (assuming it's available)
      const storeId = localStorage.getItem('storeId') || 'demo-store';

      const logsPromise = auditService.getAuditLogs(storeId, filters);
      const statsPromise = auditService.getAuditStatistics(storeId, 30);

      const [logs, statistics] = await Promise.all([logsPromise, statsPromise]);

      setAuditLogs(logs);
      setStats(statistics);
    } catch (err) {
      console.error('Error loading audit data:', err);
      setError('Failed to load audit logs. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'red',
      warning: 'orange',
      info: 'blue',
      debug: 'default',
    };
    return colors[severity] || 'default';
  };

  const getCategoryColor = (category) => {
    const colors = {
      authentication: 'blue',
      data_change: 'orange',
      financial: 'green',
      settings: 'purple',
      security: 'red',
    };
    return colors[category] || 'default';
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateRangeChange = (dates) => {
    if (dates) {
      setFilters((prev) => ({
        ...prev,
        startDate: dates[0],
        endDate: dates[1],
      }));
    } else {
      setFilters((prev) => ({
        ...prev,
        startDate: null,
        endDate: null,
      }));
    }
  };

  const showLogDetails = (log) => {
    setSelectedLog(log);
    setDrawerVisible(true);
  };

  const eventTypeOptions = [
    { value: 'user.login', label: 'User Login' },
    { value: 'user.login_failed', label: 'Login Failed' },
    { value: 'user.logout', label: 'User Logout' },
    { value: 'user.password_changed', label: 'Password Changed' },
    { value: 'data.created', label: 'Data Created' },
    { value: 'data.updated', label: 'Data Updated' },
    { value: 'data.deleted', label: 'Data Deleted' },
    { value: 'payment.processed', label: 'Payment Processed' },
    { value: 'payment.failed', label: 'Payment Failed' },
    { value: 'access.denied', label: 'Access Denied' },
    { value: 'settings.changed', label: 'Settings Changed' },
  ];

  const eventCategoryOptions = [
    { value: 'authentication', label: 'Authentication' },
    { value: 'data_change', label: 'Data Change' },
    { value: 'financial', label: 'Financial' },
    { value: 'settings', label: 'Settings' },
    { value: 'security', label: 'Security' },
  ];

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss'),
      sorter: (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
    },
    {
      title: 'Event Type',
      dataIndex: 'eventType',
      key: 'eventType',
      width: 150,
      render: (eventType) => <Tag>{eventType}</Tag>,
    },
    {
      title: 'Category',
      dataIndex: 'eventCategory',
      key: 'eventCategory',
      width: 120,
      render: (category) => <Tag color={getCategoryColor(category)}>{category}</Tag>,
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
      title: 'Entity',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 120,
      render: (type, record) => (type ? `${type}/${record.entityId}` : '—'),
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => showLogDetails(record)}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1>Audit Logs</h1>
        <p style={{ color: '#666' }}>
          View and analyze all system events, security activities, and data changes.
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Total Events"
                value={stats.totalEvents}
                precision={0}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Critical"
                value={stats.criticalCount}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Warnings"
                value={stats.warningCount}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card>
              <Statistic
                title="Last 30 Days"
                value={stats.totalEvents}
                suffix="events"
              />
            </Card>
          </Col>
        </Row>
      )}

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

      {/* Filters Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#333' }}>
            <FilterOutlined /> Filters
          </div>

          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Event Type"
                allowClear
                value={filters.eventType}
                onChange={(value) => handleFilterChange('eventType', value)}
                options={eventTypeOptions}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Category"
                allowClear
                value={filters.eventCategory}
                onChange={(value) => handleFilterChange('eventCategory', value)}
                options={eventCategoryOptions}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Severity"
                allowClear
                value={filters.severity}
                onChange={(value) => handleFilterChange('severity', value)}
                options={[
                  { value: 'debug', label: 'Debug' },
                  { value: 'info', label: 'Info' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'critical', label: 'Critical' },
                ]}
                style={{ width: '100%' }}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadAuditData}
                style={{ width: '100%' }}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <DatePicker.RangePicker
                value={
                  filters.startDate && filters.endDate
                    ? [dayjs(filters.startDate), dayjs(filters.endDate)]
                    : null
                }
                onChange={handleDateRangeChange}
                style={{ width: '100%' }}
                format="YYYY-MM-DD"
              />
            </Col>
            <Col xs={24} md={12}>
              <Select
                placeholder="Results per page"
                value={filters.limit}
                onChange={(value) => handleFilterChange('limit', value)}
                options={[
                  { value: 50, label: '50' },
                  { value: 100, label: '100' },
                  { value: 250, label: '250' },
                  { value: 500, label: '500' },
                ]}
                style={{ width: '100%' }}
              />
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
          </div>
        ) : auditLogs.length === 0 ? (
          <Empty
            description="No audit logs found"
            style={{ marginTop: '40px', marginBottom: '40px' }}
          >
            <Button type="primary" onClick={loadAuditData}>
              Refresh
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={auditLogs}
            rowKey="id"
            pagination={{ pageSize: 20, showSizeChanger: true }}
            scroll={{ x: 1200 }}
          />
        )}
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title="Audit Log Details"
        placement="right"
        width={500}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedLog && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Event Type
              </div>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>
                {selectedLog.eventType}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Category
              </div>
              <Tag color={getCategoryColor(selectedLog.eventCategory)}>
                {selectedLog.eventCategory}
              </Tag>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Severity
              </div>
              <Tag color={getSeverityColor(selectedLog.severity)}>
                {selectedLog.severity.toUpperCase()}
              </Tag>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                Timestamp
              </div>
              <div style={{ fontSize: '14px' }}>
                {dayjs(selectedLog.createdAt).format('YYYY-MM-DD HH:mm:ss')}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                User ID
              </div>
              <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                {selectedLog.userId || '—'}
              </div>
            </div>

            {selectedLog.entityType && (
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Entity
                </div>
                <div style={{ fontSize: '14px' }}>
                  {selectedLog.entityType} / {selectedLog.entityId}
                </div>
              </div>
            )}

            {selectedLog.sourceIp && (
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Source IP
                </div>
                <div style={{ fontSize: '14px', fontFamily: 'monospace' }}>
                  {selectedLog.sourceIp}
                </div>
              </div>
            )}

            {selectedLog.newValues && (
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  New Values
                </div>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(selectedLog.newValues, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.oldValues && (
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Old Values
                </div>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(selectedLog.oldValues, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.errorMessage && (
              <Alert type="error" message={selectedLog.errorMessage} />
            )}

            {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
              <div>
                <div style={{ fontSize: '12px', color: '#999', marginBottom: '4px' }}>
                  Metadata
                </div>
                <pre
                  style={{
                    background: '#f5f5f5',
                    padding: '8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    overflow: 'auto',
                  }}
                >
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            )}
          </Space>
        )}
      </Drawer>
    </div>
  );
};

export default AuditPage;
