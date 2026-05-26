import { Button, Card, Space, Table, Tag } from "antd";

function buildColumns({ onEdit, onDelete }) {
  return [
    { title: "Name", dataIndex: "name", key: "name" },
    { title: "Country", dataIndex: "countryCode", key: "countryCode" },
    { title: "Region", dataIndex: "regionCode", key: "regionCode" },
    {
      title: "Postal Pattern",
      dataIndex: "postalCodePattern",
      key: "postalCodePattern",
      render: (value) => value || "-",
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

export default function ZonesSection({ zones, onAdd, onEdit, onDelete }) {
  return (
    <Card
      title="Shipping Zones"
      extra={
        <Button type="primary" onClick={onAdd}>
          Add Zone
        </Button>
      }
    >
      <Table
        rowKey="id"
        columns={buildColumns({ onEdit, onDelete })}
        dataSource={zones}
        pagination={{ pageSize: 6 }}
        locale={{ emptyText: "No shipping zones configured." }}
      />
    </Card>
  );
}
