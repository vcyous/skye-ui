import { Card, Space, Tag, Typography } from "antd";

export default function OrderMetaCard({ order }) {
  const currency = order?.displayCurrencyCode || order?.currencyCode || "USD";

  return (
    <Card title="Order details" bodyStyle={{ padding: "12px 16px" }}>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        {order?.subscriptionContext && (
          <div>
            <Typography.Text
              type="secondary"
              style={{ fontSize: 12, display: "block", marginBottom: 2 }}
            >
              Subscription
            </Typography.Text>
            <Space>
              <Tag color="purple">
                {order.subscriptionContext.planName || "Subscription"}
              </Tag>
              <Tag>
                {order.subscriptionContext.isRenewal ? "Renewal" : "First charge"}
              </Tag>
            </Space>
          </div>
        )}
        <div>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, display: "block", marginBottom: 2 }}
          >
            Currency
          </Typography.Text>
          <Tag>{currency}</Tag>
          {order?.currencySnapshot && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {" "}
              FX: {order.currencySnapshot.fxRate}
            </Typography.Text>
          )}
        </div>
      </Space>
    </Card>
  );
}
