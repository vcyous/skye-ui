import { Card, Col, Row, Typography } from "antd";

const METRIC_CARDS = [
  { key: "methods", title: "Methods" },
  { key: "zones", title: "Zones" },
  { key: "pending", title: "Pending" },
  { key: "activeShipments", title: "Active Shipments" },
];

export default function ShippingMetrics({ metrics }) {
  return (
    <Row gutter={[12, 12]}>
      {METRIC_CARDS.map((card) => (
        <Col xs={12} md={6} key={card.key}>
          <Card size="small" title={card.title}>
            <Typography.Title level={4} style={{ margin: 0 }}>
              {metrics[card.key]}
            </Typography.Title>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
