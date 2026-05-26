import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { Card, Divider, Space, Table, Tag, Typography } from "antd";
import { formatCurrency } from "../../../../shared/format";

function buildColumns({ fulfillmentItems }) {
  return [
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong style={{ fontSize: 13 }}>
            {record.productTitle}
          </Typography.Text>
          {record.variantTitle && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {record.variantTitle}
            </Typography.Text>
          )}
          {record.sku && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              SKU: {record.sku}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Qty",
      dataIndex: "quantity",
      key: "quantity",
      width: 60,
      render: (value) => (
        <Typography.Text style={{ fontSize: 13 }}>{value}</Typography.Text>
      ),
    },
    {
      title: "Price",
      key: "price",
      width: 100,
      render: (_, record) => (
        <Typography.Text style={{ fontSize: 13 }}>
          {formatCurrency(record.unitPrice)}
        </Typography.Text>
      ),
    },
    {
      title: "Total",
      key: "total",
      width: 110,
      render: (_, record) => (
        <Typography.Text strong style={{ fontSize: 13 }}>
          {formatCurrency(record.lineTotal)}
        </Typography.Text>
      ),
    },
    {
      title: "Fulfillment",
      key: "fulfillment",
      width: 120,
      render: (_, record) => {
        const fi = fulfillmentItems.find((item) => item.id === record.id);
        if (!fi) return <Tag>—</Tag>;
        return fi.remainingQty === 0 ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            Fulfilled
          </Tag>
        ) : (
          <Tag icon={<ClockCircleOutlined />} color="warning">
            {fi.allocatedQty}/{fi.orderedQty} shipped
          </Tag>
        );
      },
    },
  ];
}

export default function OrderItemsCard({ order, fulfillmentItems, hasUnshipped }) {
  const currency = order?.displayCurrencyCode || order?.currencyCode || "USD";
  const totalsRows = [
    {
      label: "Subtotal",
      value: order?.displaySubtotalAmount ?? order?.subtotalAmount ?? 0,
    },
    {
      label: "Shipping",
      value: order?.displayShippingAmount ?? order?.shippingAmount ?? 0,
    },
    {
      label: "Discount",
      value: -(order?.displayDiscountAmount ?? order?.discountAmount ?? 0),
    },
    {
      label: "Tax",
      value: order?.displayTaxAmount ?? order?.taxAmount ?? 0,
    },
  ];

  return (
    <Card
      title="Items"
      bodyStyle={{ padding: 0 }}
      style={{ marginBottom: 12 }}
      extra={
        !hasUnshipped && (
          <Tag color="success" icon={<CheckCircleOutlined />}>
            Fully shipped
          </Tag>
        )
      }
    >
      <Table
        rowKey="id"
        columns={buildColumns({ fulfillmentItems })}
        dataSource={order?.items ?? []}
        pagination={false}
        size="middle"
      />

      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--line)" }}>
        {totalsRows.map((row) => (
          <div
            key={row.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              {row.label}
            </Typography.Text>
            <Typography.Text style={{ fontSize: 13 }}>
              {formatCurrency(Math.abs(row.value), { currency })}
            </Typography.Text>
          </div>
        ))}
        <Divider style={{ margin: "8px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography.Text strong>Total</Typography.Text>
          <Typography.Text strong style={{ fontSize: 15 }}>
            {formatCurrency(
              order?.displayTotalAmount ?? order?.totalAmount ?? 0,
              { currency },
            )}
          </Typography.Text>
        </div>
      </div>
    </Card>
  );
}
