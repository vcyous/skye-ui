import { Card, Empty, Select, Space, Table, Tag } from "antd";
import { SHIPMENT_STATUS_OPTIONS } from "../constants";

function buildColumns({ onStatusChange }) {
  return [
    { title: "Order", dataIndex: "orderNumber", key: "orderNumber" },
    {
      title: "Method",
      dataIndex: "shippingMethodName",
      key: "shippingMethodName",
    },
    { title: "Tracking", dataIndex: "trackingNumber", key: "trackingNumber" },
    { title: "Carrier", dataIndex: "carrier", key: "carrier" },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => <Tag color="blue">{value}</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Select
            size="small"
            value={record.status}
            style={{ width: 130 }}
            onChange={(value) => onStatusChange(record, value)}
            options={SHIPMENT_STATUS_OPTIONS.map((opt) => ({
              value: opt.value,
              label: opt.value,
            }))}
          />
        </Space>
      ),
    },
  ];
}

export default function ShipmentsSection({ shipments, onStatusChange }) {
  return (
    <Card title="Shipments">
      {shipments.length ? (
        <Table
          rowKey="id"
          columns={buildColumns({ onStatusChange })}
          dataSource={shipments}
          pagination={{ pageSize: 6 }}
        />
      ) : (
        <Empty description="No shipments yet. Create first fulfillment batch." />
      )}
    </Card>
  );
}
