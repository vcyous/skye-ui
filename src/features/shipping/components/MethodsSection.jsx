import { Button, Card, Empty, Space, Table, Tag } from "antd";

function buildColumns({ onEdit, onDelete }) {
  return [
    { title: "Name", dataIndex: "name", key: "name" },
    {
      title: "Type",
      dataIndex: "shippingType",
      key: "shippingType",
      render: (value) => <Tag>{value}</Tag>,
    },
    { title: "Base Rate", dataIndex: "baseRate", key: "baseRate" },
    {
      title: "Zones",
      key: "zones",
      render: (_, record) =>
        record.zones?.length
          ? record.zones.map((zone) => zone.name).join(", ")
          : "All zones",
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) =>
        record.isActive ? <Tag color="green">active</Tag> : <Tag>inactive</Tag>,
    },
    {
      title: "Actions",
      key: "actions",
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => onEdit(record)}>
            Edit
          </Button>
          <Button size="small" danger onClick={() => onDelete(record)}>
            Delete
          </Button>
        </Space>
      ),
    },
  ];
}

export default function MethodsSection({
  methods,
  onAdd,
  onCreateShipment,
  onEdit,
  onDelete,
}) {
  return (
    <Card
      title="Shipping Methods"
      extra={
        <Space>
          <Button type="primary" onClick={onAdd}>
            Add Method
          </Button>
          <Button onClick={onCreateShipment}>Create Shipment</Button>
        </Space>
      }
    >
      {methods.length ? (
        <Table
          rowKey="id"
          columns={buildColumns({ onEdit, onDelete })}
          dataSource={methods}
          pagination={{ pageSize: 6 }}
        />
      ) : (
        <Empty description="No shipping methods configured yet." />
      )}
    </Card>
  );
}
