import { Card, Space, Typography } from "antd";

export default function OrderAddressCard({ address }) {
  return (
    <Card title="Shipping address" style={{ marginBottom: 12 }}>
      {address ? (
        <Space direction="vertical" size={2}>
          <Typography.Text strong style={{ fontSize: 13 }}>
            {address.fullName}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 13 }}>
            {address.addressLine1}
          </Typography.Text>
          {Boolean(address.addressLine2) && (
            <Typography.Text style={{ fontSize: 13 }}>
              {String(address.addressLine2)}
            </Typography.Text>
          )}
          <Typography.Text style={{ fontSize: 13 }}>
            {[address.city, address.postalCode].filter(Boolean).join(", ")}
          </Typography.Text>
          <Typography.Text style={{ fontSize: 13 }}>
            {address.country}
          </Typography.Text>
        </Space>
      ) : (
        <Typography.Text type="secondary">No address provided.</Typography.Text>
      )}
    </Card>
  );
}
