import { Card, Col, List, Row, Spin, Typography } from "antd";
import { lazy, Suspense, useEffect, useState } from "react";
import KpiCard from "../components/KpiCard.jsx";
import { getDashboardSummary } from "../services/api.js";

const DashboardCharts = lazy(() => import("../components/DashboardCharts.jsx"));

function formatCurrency(value) {
  return `$${Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function DashboardPage() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  useEffect(() => {
    getDashboardSummary()
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((err) =>
        setState({
          loading: false,
          data: null,
          error: err.message || "Failed",
        }),
      );
  }, []);

  if (state.loading) {
    return (
      <Card>
        <Spin />
        <Typography.Text style={{ marginLeft: 8 }}>
          Loading dashboard...
        </Typography.Text>
      </Card>
    );
  }

  if (state.error) {
    return <Card>{state.error}</Card>;
  }

  const { data } = state;
  const totalPipeline =
    (data.topStatuses?.not_paid || 0) +
    (data.topStatuses?.need_ship || 0) +
    (data.topStatuses?.ongoing_shipped || 0);

  const shippedShare = totalPipeline
    ? Math.round(
        ((data.topStatuses?.ongoing_shipped || 0) / totalPipeline) * 100,
      )
    : 0;

  const trendSeries = [
    { day: "Sun", sales: Number(data.todaysSales) * 0.56 },
    { day: "Mon", sales: Number(data.todaysSales) * 0.69 },
    { day: "Tue", sales: Number(data.todaysSales) * 0.73 },
    { day: "Wed", sales: Number(data.todaysSales) * 0.82 },
    { day: "Thu", sales: Number(data.todaysSales) * 0.94 },
    { day: "Fri", sales: Number(data.todaysSales) * 1.06 },
    { day: "Sat", sales: Number(data.todaysSales) },
  ];

  const statusSeries = [
    {
      name: "Not paid",
      value: data.topStatuses?.not_paid || 0,
      fill: "#7abdd8",
    },
    {
      name: "Need ship",
      value: data.topStatuses?.need_ship || 0,
      fill: "#32a6d0",
    },
    {
      name: "Ongoing shipped",
      value: data.topStatuses?.ongoing_shipped || 0,
      fill: "#006c9c",
    },
  ];

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Dashboard Overview
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Track sales signals, order pipeline, and store momentum in one place.
        </Typography.Text>
      </header>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={12} xl={6}>
          <KpiCard
            title="Today Sales"
            value={formatCurrency(data.todaysSales)}
            delta="+12.4%"
            icon="TS"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <KpiCard
            title="Gross Revenue"
            value={formatCurrency(data.grossRevenue)}
            delta="+8.1%"
            icon="GR"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <KpiCard
            title="Visitors"
            value={Number(data.visitors || 0).toLocaleString("en-US")}
            delta="+4.6%"
            icon="VS"
          />
        </Col>
        <Col xs={24} md={12} xl={6}>
          <KpiCard
            title="Total Products"
            value={Number(data.products || 0).toLocaleString("en-US")}
            delta="+2.0%"
            icon="PD"
          />
        </Col>
      </Row>

      <Suspense
        fallback={
          <Card>
            <Spin />
            <Typography.Text style={{ marginLeft: 8 }}>
              Loading charts...
            </Typography.Text>
          </Card>
        }
      >
        <DashboardCharts
          todaysSales={data.todaysSales}
          trendSeries={trendSeries}
          statusSeries={statusSeries}
          shippedShare={shippedShare}
        />
      </Suspense>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={12}>
          <Card title="Operations Snapshot">
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Card size="small">
                  <Typography.Text type="secondary">
                    Total Orders
                  </Typography.Text>
                  <Typography.Title level={4} style={{ margin: 0 }}>
                    {data.orders}
                  </Typography.Title>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Typography.Text type="secondary">
                    Store Health
                  </Typography.Text>
                  <Typography.Title
                    level={4}
                    style={{ margin: 0, color: "#0f8b53" }}
                  >
                    Stable
                  </Typography.Title>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Quick Insight">
            <List
              size="small"
              dataSource={[
                `Follow up ${data.topStatuses?.not_paid || 0} pending payment orders.`,
                `Prepare shipment workflow for ${data.topStatuses?.need_ship || 0} items.`,
                `Revenue target today is ${formatCurrency(data.todaysSales * 1.15)}.`,
              ]}
              renderItem={(item) => <List.Item>{item}</List.Item>}
            />
          </Card>
        </Col>
      </Row>
    </section>
  );
}
