import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
import KpiCard from "../components/KpiCard.jsx";
import AnalyticsBreakdownTableCard from "../components/analytics/AnalyticsBreakdownTableCard.jsx";
import AnalyticsTrendChartCard from "../components/analytics/AnalyticsTrendChartCard.jsx";
import { useLocalization } from "../context/LocalizationContext.jsx";
import {
  getAnalyticsMetricDictionary,
  getAnalyticsOverviewReport,
} from "../services/api.js";

const rangeOptions = [
  { value: 7, label: "Last 7 days" },
  { value: 14, label: "Last 14 days" },
  { value: 30, label: "Last 30 days" },
  { value: 90, label: "Last 90 days" },
];

const compareOptions = [
  { value: "previous", label: "Compare with previous period" },
  { value: "none", label: "No comparison" },
];

function formatDelta(value) {
  const numeric = Number(value || 0);
  const prefix = numeric > 0 ? "+" : "";
  return `${prefix}${numeric.toFixed(2)}%`;
}

export default function AnalyticsPage() {
  const { formatCurrency, formatNumber } = useLocalization();
  const [rangeDays, setRangeDays] = useState(30);
  const [compareMode, setCompareMode] = useState("previous");
  const [report, setReport] = useState(null);
  const [dictionary, setDictionary] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadAnalytics(showRefreshNotice = false) {
    setError("");
    setNotice("");
    setIsLoading(true);

    try {
      const [reportData, metricDictionary] = await Promise.all([
        getAnalyticsOverviewReport({ rangeDays, compareMode }),
        getAnalyticsMetricDictionary(),
      ]);
      setReport(reportData);
      setDictionary(metricDictionary);

      if (showRefreshNotice) {
        setNotice(
          reportData.cached
            ? "Analytics refreshed from cached snapshot."
            : "Analytics refreshed from live data.",
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load analytics overview.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAnalytics();
  }, [rangeDays, compareMode]);

  const statusColumns = useMemo(
    () => [
      { title: "Status", dataIndex: "status", key: "status" },
      { title: "Orders", dataIndex: "orders", key: "orders" },
      {
        title: "Gross Sales",
        dataIndex: "grossSales",
        key: "grossSales",
        type: "currency",
      },
      {
        title: "Share",
        dataIndex: "share",
        key: "share",
        type: "percent",
      },
    ],
    [],
  );

  const productColumns = useMemo(
    () => [
      {
        title: "Product",
        dataIndex: "productTitle",
        key: "productTitle",
      },
      {
        title: "Qty Sold",
        dataIndex: "quantity",
        key: "quantity",
      },
      {
        title: "Gross Sales",
        dataIndex: "grossSales",
        key: "grossSales",
        type: "currency",
      },
      {
        title: "Share",
        dataIndex: "share",
        key: "share",
        type: "percent",
      },
    ],
    [],
  );

  if (isLoading) {
    return (
      <Card>
        <Spin />
        <Typography.Text style={{ marginLeft: 8 }}>
          Loading analytics dashboard...
        </Typography.Text>
      </Card>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: "100%" }}>
      <div>
        <Typography.Title level={3} style={{ marginBottom: 0 }}>
          Analytics & Reporting
        </Typography.Title>
        <Typography.Text type="secondary">
          Monitor sales performance, conversion health, and report breakdowns
          with comparison windows.
        </Typography.Text>
      </div>

      {error ? (
        <Alert
          type="error"
          message={error}
          showIcon
          action={
            <Button size="small" onClick={() => loadAnalytics(true)}>
              Retry
            </Button>
          }
        />
      ) : null}

      {notice ? <Alert type="success" message={notice} showIcon /> : null}

      <Card title="Report Controls">
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Typography.Text type="secondary">Date range</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              value={rangeDays}
              options={rangeOptions}
              onChange={setRangeDays}
            />
          </Col>
          <Col xs={24} md={10}>
            <Typography.Text type="secondary">Comparison</Typography.Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              value={compareMode}
              options={compareOptions}
              onChange={setCompareMode}
            />
          </Col>
          <Col xs={24} md={6}>
            <Typography.Text type="secondary">Actions</Typography.Text>
            <Button
              type="primary"
              style={{ width: "100%", marginTop: 4 }}
              onClick={() => loadAnalytics(true)}
            >
              Refresh report
            </Button>
          </Col>
        </Row>
      </Card>

      {report?.cached ? (
        <Alert
          type="info"
          showIcon
          message="Showing cached report snapshot (5-minute cache window)."
        />
      ) : null}

      {!report?.hasEnoughData ? (
        <Card>
          <Empty
            description="Not enough order data for trend reporting yet."
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Typography.Text type="secondary">
              Complete a checkout to populate order metrics and reporting
              breakdowns.
            </Typography.Text>
          </Empty>
        </Card>
      ) : (
        <>
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12} xl={6}>
              <KpiCard
                title="Total Sales"
                value={formatCurrency(report?.kpis?.totalSales?.value || 0)}
                delta={formatDelta(report?.kpis?.totalSales?.delta || 0)}
                icon="TS"
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <KpiCard
                title="Total Orders"
                value={formatNumber(report?.kpis?.totalOrders?.value || 0)}
                delta={formatDelta(report?.kpis?.totalOrders?.delta || 0)}
                icon="TO"
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <KpiCard
                title="Avg Order Value"
                value={formatCurrency(
                  report?.kpis?.averageOrderValue?.value || 0,
                )}
                delta={formatDelta(report?.kpis?.averageOrderValue?.delta || 0)}
                icon="AOV"
              />
            </Col>
            <Col xs={24} md={12} xl={6}>
              <KpiCard
                title="Conversion Rate"
                value={`${Number(report?.kpis?.conversionRate?.value || 0).toFixed(2)}%`}
                delta={formatDelta(report?.kpis?.conversionRate?.delta || 0)}
                icon="CV"
              />
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} xl={16}>
              <AnalyticsTrendChartCard data={report?.trendSeries || []} />
            </Col>
            <Col xs={24} xl={8}>
              <Card title="Metric Dictionary" style={{ height: "100%" }}>
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  {(dictionary || []).map((item) => (
                    <Card key={item.metricKey} size="small">
                      <Space
                        direction="vertical"
                        size={4}
                        style={{ width: "100%" }}
                      >
                        <Space>
                          <Typography.Text strong>{item.label}</Typography.Text>
                          <Tag>{item.unit}</Tag>
                        </Space>
                        <Typography.Text type="secondary">
                          {item.description || "No description."}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          Source: {item.dataSource || "N/A"}
                        </Typography.Text>
                        <Typography.Text type="secondary">
                          Refresh cadence:{" "}
                          {Number(item.refreshCadenceMinutes || 0)} minutes
                        </Typography.Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Card>
            </Col>
          </Row>

          <Row gutter={[12, 12]}>
            <Col xs={24} xl={12}>
              <AnalyticsBreakdownTableCard
                title="Order Status Breakdown"
                rows={report?.statusBreakdown || []}
                rowKey="status"
                columns={statusColumns}
                emptyText="No status distribution for this range."
              />
            </Col>
            <Col xs={24} xl={12}>
              <AnalyticsBreakdownTableCard
                title="Top Products by Revenue"
                rows={report?.productBreakdown || []}
                rowKey="productTitle"
                columns={productColumns}
                emptyText="No product sales data in this range."
              />
            </Col>
          </Row>
        </>
      )}
    </Space>
  );
}
