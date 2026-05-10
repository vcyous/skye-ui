import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  createMarketingCampaign,
  getDiscounts,
  getMarketingCampaignAnalytics,
  getMarketingCampaigns,
  linkCampaignCoupons,
  setMarketingCampaignStatus,
  updateMarketingCampaign,
} from "../services/api.js";

const statusOptions = [
  "all",
  "draft",
  "active",
  "paused",
  "completed",
  "archived",
].map((value) => ({
  label: value === "all" ? "All statuses" : value,
  value,
}));

const channelOptions = [
  { label: "Email", value: "email" },
  { label: "Social", value: "social" },
  { label: "Search", value: "search" },
  { label: "Influencer", value: "influencer" },
  { label: "Affiliate", value: "affiliate" },
  { label: "Other", value: "other" },
];

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function normalizeCampaignPayload(values) {
  return {
    name: String(values.name || "").trim(),
    goal: values.goal || "",
    channel: values.channel || "other",
    status: values.status || "draft",
    startsAt: values.startsAt ? values.startsAt.toISOString() : null,
    endsAt: values.endsAt ? values.endsAt.toISOString() : null,
    budgetAmount:
      values.budgetAmount === undefined || values.budgetAmount === null
        ? null
        : Number(values.budgetAmount),
    attributionMetadata: {
      utmSource: values.utmSource || null,
      utmMedium: values.utmMedium || null,
      utmCampaign: values.utmCampaign || null,
    },
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [analytics, setAnalytics] = useState({
    summary: {
      totalCampaigns: 0,
      activeCampaigns: 0,
      pausedCampaigns: 0,
      linkedCoupons: 0,
      totalCouponUses: 0,
      attributedRevenue: 0,
      conversionRate: 0,
    },
    trend: [],
  });
  const [discounts, setDiscounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState({ type: "", message: "" });
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [couponTargetCampaign, setCouponTargetCampaign] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [campaignForm] = Form.useForm();
  const [couponForm] = Form.useForm();

  async function loadData(nextStatus = statusFilter) {
    setIsLoading(true);
    setLoadError("");
    try {
      const [campaignRows, analyticsData, discountRows] = await Promise.all([
        getMarketingCampaigns(nextStatus),
        getMarketingCampaignAnalytics(nextStatus),
        getDiscounts("all"),
      ]);
      setCampaigns(campaignRows);
      setAnalytics(analyticsData);
      setDiscounts(discountRows);
    } catch (err) {
      setLoadError(err.message || "Failed to load campaign data.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData(statusFilter);
  }, [statusFilter]);

  function openCreateModal() {
    setEditingCampaign(null);
    campaignForm.resetFields();
    campaignForm.setFieldsValue({
      channel: "email",
      status: "draft",
      budgetAmount: null,
    });
    setIsCampaignModalOpen(true);
  }

  function openEditModal(campaign) {
    setEditingCampaign(campaign);
    const metadata = campaign.attributionMetadata || {};
    campaignForm.setFieldsValue({
      name: campaign.name,
      goal: campaign.goal,
      channel: campaign.channel,
      status: campaign.status,
      startsAt: campaign.startsAt ? dayjs(campaign.startsAt) : null,
      endsAt: campaign.endsAt ? dayjs(campaign.endsAt) : null,
      budgetAmount: campaign.budgetAmount || null,
      utmSource: metadata.utmSource || "",
      utmMedium: metadata.utmMedium || "",
      utmCampaign: metadata.utmCampaign || "",
    });
    setIsCampaignModalOpen(true);
  }

  async function onSaveCampaign(values) {
    setNotice({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      const payload = normalizeCampaignPayload(values);
      if (editingCampaign) {
        await updateMarketingCampaign(editingCampaign.id, payload);
        setNotice({ type: "success", message: "Campaign updated." });
      } else {
        await createMarketingCampaign(payload);
        setNotice({ type: "success", message: "Campaign created." });
      }
      setEditingCampaign(null);
      setIsCampaignModalOpen(false);
      campaignForm.resetFields();
      await loadData(statusFilter);
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to save campaign.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onQuickStatus(campaign, nextStatus) {
    setNotice({ type: "", message: "" });
    try {
      await setMarketingCampaignStatus(campaign.id, nextStatus);
      await loadData(statusFilter);
      setNotice({ type: "success", message: `Campaign ${nextStatus}.` });
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to update campaign status.",
      });
    }
  }

  function openCouponModal(campaign) {
    setCouponTargetCampaign(campaign);
    couponForm.setFieldsValue({
      discountIds: (campaign.coupons || []).map((item) => item.id),
    });
  }

  async function onSaveCouponLinks(values) {
    if (!couponTargetCampaign) {
      return;
    }

    setNotice({ type: "", message: "" });
    setIsSubmitting(true);
    try {
      await linkCampaignCoupons(
        couponTargetCampaign.id,
        values.discountIds || [],
      );
      setCouponTargetCampaign(null);
      setNotice({ type: "success", message: "Coupon links updated." });
      await loadData(statusFilter);
    } catch (err) {
      setNotice({
        type: "error",
        message: err.message || "Failed to link coupons.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const campaignColumns = [
    {
      title: "Campaign",
      key: "campaign",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.name}</Typography.Text>
          <Typography.Text type="secondary">
            {record.goal || "No goal"}
          </Typography.Text>
          <Tag>{record.channel}</Tag>
        </Space>
      ),
    },
    {
      title: "Window",
      key: "window",
      render: (_, record) => {
        const start = record.startsAt
          ? new Date(record.startsAt).toLocaleDateString()
          : "-";
        const end = record.endsAt
          ? new Date(record.endsAt).toLocaleDateString()
          : "-";
        return `${start} to ${end}`;
      },
    },
    {
      title: "Coupons",
      key: "coupons",
      render: (_, record) => (
        <Space wrap>
          {(record.coupons || []).length
            ? record.coupons.map((coupon) => (
                <Tag key={coupon.id}>{coupon.code}</Tag>
              ))
            : "-"}
        </Space>
      ),
    },
    {
      title: "Coupon Uses",
      key: "uses",
      render: (_, record) =>
        (record.coupons || []).reduce(
          (sum, coupon) => sum + Number(coupon.usesCount || 0),
          0,
        ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Tag
          color={
            value === "active"
              ? "green"
              : value === "paused"
                ? "orange"
                : "blue"
          }
        >
          {value}
        </Tag>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space wrap>
          <Button size="small" onClick={() => openEditModal(record)}>
            Edit
          </Button>
          <Button size="small" onClick={() => openCouponModal(record)}>
            Link coupons
          </Button>
          {record.status === "active" ? (
            <Button
              size="small"
              onClick={() => onQuickStatus(record, "paused")}
            >
              Pause
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              onClick={() => onQuickStatus(record, "active")}
            >
              Activate
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const discountOptions = useMemo(
    () =>
      discounts.map((item) => ({
        label: `${item.code} (${item.status})`,
        value: item.id,
      })),
    [discounts],
  );

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        Marketing Campaigns & Coupons
      </Typography.Title>
      <Typography.Text type="secondary">
        Create campaigns, attach coupon codes, monitor usage, and manage launch
        status.
      </Typography.Text>

      {loadError ? <Alert type="error" message={loadError} showIcon /> : null}
      {notice.message ? (
        <Alert
          type={notice.type === "error" ? "error" : "success"}
          message={notice.message}
          showIcon
        />
      ) : null}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Campaigns"
              value={analytics.summary.totalCampaigns}
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Active"
              value={analytics.summary.activeCampaigns}
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Paused"
              value={analytics.summary.pausedCampaigns}
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Linked coupons"
              value={analytics.summary.linkedCoupons}
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Coupon uses"
              value={analytics.summary.totalCouponUses}
            />
          </Card>
        </Col>
        <Col xs={24} md={8} xl={4}>
          <Card>
            <Statistic
              title="Conversion rate"
              value={analytics.summary.conversionRate}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="Attribution Trend (14 days)"
        extra={
          <Typography.Text>
            {formatCurrency(analytics.summary.attributedRevenue)} revenue
          </Typography.Text>
        }
      >
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={analytics.trend || []}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid stroke="#e6edf1" strokeDasharray="3 3" />
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                fontSize={12}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="visits"
                stroke="#8c8c8c"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="conversions"
                stroke="#006c9c"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card
        title="Campaign List"
        extra={
          <Space wrap>
            <Select
              value={statusFilter}
              options={statusOptions}
              onChange={setStatusFilter}
              style={{ minWidth: 180 }}
            />
            <Button type="primary" onClick={openCreateModal}>
              New campaign
            </Button>
          </Space>
        }
      >
        {!isLoading && !campaigns.length ? (
          <Empty
            description="No campaigns yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={openCreateModal}>
              Launch first campaign
            </Button>
          </Empty>
        ) : (
          <Table
            rowKey="id"
            loading={isLoading}
            dataSource={campaigns}
            columns={campaignColumns}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 980 }}
          />
        )}
      </Card>

      <Modal
        title={editingCampaign ? "Edit campaign" : "Create campaign"}
        open={isCampaignModalOpen}
        onCancel={() => {
          setIsCampaignModalOpen(false);
          setEditingCampaign(null);
          campaignForm.resetFields();
        }}
        onOk={() => campaignForm.submit()}
        confirmLoading={isSubmitting}
        okText={editingCampaign ? "Save changes" : "Create campaign"}
        width={760}
      >
        <Form form={campaignForm} layout="vertical" onFinish={onSaveCampaign}>
          <Row gutter={12}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Campaign name"
                rules={[{ required: true }]}
              >
                <Input placeholder="Summer Launch 2026" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="channel"
                label="Channel"
                rules={[{ required: true }]}
              >
                <Select options={channelOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item
                name="status"
                label="Initial status"
                rules={[{ required: true }]}
              >
                <Select
                  options={statusOptions.filter((item) => item.value !== "all")}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="goal" label="Campaign goal">
            <Input.TextArea
              rows={2}
              placeholder="Increase conversion for first-time buyers"
            />
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="startsAt" label="Starts at">
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="endsAt" label="Ends at">
                <DatePicker showTime style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="budgetAmount" label="Budget amount">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} md={8}>
              <Form.Item name="utmSource" label="UTM source">
                <Input placeholder="newsletter" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="utmMedium" label="UTM medium">
                <Input placeholder="email" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="utmCampaign" label="UTM campaign">
                <Input placeholder="summer-launch" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      <Modal
        title={
          couponTargetCampaign
            ? `Link coupons: ${couponTargetCampaign.name}`
            : "Link coupons"
        }
        open={Boolean(couponTargetCampaign)}
        onCancel={() => setCouponTargetCampaign(null)}
        onOk={() => couponForm.submit()}
        confirmLoading={isSubmitting}
      >
        <Form form={couponForm} layout="vertical" onFinish={onSaveCouponLinks}>
          <Form.Item name="discountIds" label="Coupon codes">
            <Select
              mode="multiple"
              options={discountOptions}
              placeholder="Select coupons"
            />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
