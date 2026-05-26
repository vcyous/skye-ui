import { Card, List, Typography } from "antd";

const EMPTY_TEXT = (
  <div style={{ padding: "16px", textAlign: "center" }}>
    <Typography.Text type="secondary">No shipments yet</Typography.Text>
  </div>
);

export default function OrderShipmentsCard({ shipments }) {
  return (
    <Card title="Shipments" bodyStyle={{ padding: 0 }}>
      <List
        dataSource={shipments}
        locale={{ emptyText: EMPTY_TEXT }}
        renderItem={(item) => (
          <List.Item key={item.id} style={{ padding: "10px 16px" }}>
            <List.Item.Meta
              title={
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {item.carrier || "Unknown"} · {item.status}
                </Typography.Text>
              }
              description={
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  Tracking: {item.trackingNumber || "—"}
                </Typography.Text>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
