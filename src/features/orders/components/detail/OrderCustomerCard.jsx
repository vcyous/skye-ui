import { Card, Typography } from "antd";

export default function OrderCustomerCard({ order }) {
  return (
    <Card title="Customer" style={{ marginBottom: 12 }}>
      <Typography.Text strong style={{ fontSize: 13 }}>
        {order?.customerName || "Guest"}
      </Typography.Text>
      <br />
      {order?.customerEmail && (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {order.customerEmail}
        </Typography.Text>
      )}
      {order?.customerPhone && (
        <>
          <br />
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {order.customerPhone}
          </Typography.Text>
        </>
      )}
    </Card>
  );
}
