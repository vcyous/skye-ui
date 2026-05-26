import { Card, Select, Space, Typography } from "antd";

const ROWS = [
  {
    label: "Payment status",
    valueKey: "paymentStatus",
    optionsKey: "paymentStatus",
    patchKey: "paymentStatus",
    noteLabel: "Payment status",
  },
  {
    label: "Order status",
    valueKey: "status",
    optionsKey: "status",
    patchKey: "status",
    noteLabel: "Order status",
  },
  {
    label: "Fulfillment status",
    valueKey: "fulfillmentStatus",
    optionsKey: "fulfillmentStatus",
    patchKey: "fulfillmentStatus",
    noteLabel: "Fulfillment",
    fallback: "unfulfilled",
  },
];

export default function OrderPaymentCard({
  order,
  lifecycleOptions,
  isSaving,
  onPatch,
}) {
  return (
    <Card title="Payment" style={{ marginBottom: 12 }}>
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        {ROWS.map((row) => (
          <div
            key={row.valueKey}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography.Text style={{ fontSize: 13 }}>{row.label}</Typography.Text>
            <Select
              size="small"
              value={order?.[row.valueKey] || row.fallback}
              disabled={isSaving}
              onChange={(value) =>
                onPatch({
                  [row.patchKey]: value,
                  note: `${row.noteLabel} → ${value}`,
                })
              }
              options={lifecycleOptions[row.optionsKey].map((item) => ({
                value: item,
                label: item,
              }))}
              style={{ width: 180 }}
            />
          </div>
        ))}
      </Space>
    </Card>
  );
}
