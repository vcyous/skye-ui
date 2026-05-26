import { Card, List, Tag, Typography } from "antd";
import { formatCurrency } from "../../../../shared/format";

const EMPTY_TEXT = (
  <div style={{ padding: "16px", textAlign: "center" }}>
    <Typography.Text type="secondary">No transactions yet</Typography.Text>
  </div>
);

export default function OrderTransactionsCard({ transactions }) {
  return (
    <Card title="Transactions" bodyStyle={{ padding: 0 }}>
      <List
        dataSource={transactions}
        locale={{ emptyText: EMPTY_TEXT }}
        renderItem={(item) => (
          <List.Item key={item.id} style={{ padding: "10px 16px" }}>
            <List.Item.Meta
              title={
                <Typography.Text strong style={{ fontSize: 13 }}>
                  {item.paymentMethodName} · {formatCurrency(item.amount)}
                </Typography.Text>
              }
              description={
                <Tag color={item.status === "success" ? "success" : "default"}>
                  {item.status}
                </Tag>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
}
