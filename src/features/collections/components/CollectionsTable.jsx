import { DeleteOutlined, EditOutlined } from "@ant-design/icons";
import {
  Badge,
  Button,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";

function buildColumns({ onEdit, onAssign, onPreview, onDelete }) {
  return [
    {
      title: "Title",
      key: "name",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong style={{ fontSize: 13 }}>
            {record.name}
          </Typography.Text>
          {record.urlHandle && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              /{record.urlHandle}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Products",
      key: "productCount",
      render: (_, record) => (
        <Typography.Text style={{ fontSize: 13 }}>
          {record.productCount ?? 0}
        </Typography.Text>
      ),
    },
    {
      title: "Type",
      key: "collectionType",
      render: (_, record) =>
        record.collectionType === "smart" ? (
          <Tag color="purple" style={{ fontSize: 12 }}>
            Smart
          </Tag>
        ) : (
          <Tag style={{ fontSize: 12 }}>Manual</Tag>
        ),
    },
    {
      title: "Status",
      key: "status",
      render: (_, record) => (
        <Badge
          status={record.status === "active" ? "success" : "default"}
          text={
            <span style={{ textTransform: "capitalize", fontSize: 13 }}>
              {record.status}
            </span>
          }
        />
      ),
    },
    {
      title: "",
      key: "actions",
      width: 180,
      render: (_, record) => (
        <Space>
          {record.collectionType === "manual" ? (
            <Button size="small" onClick={() => onAssign(record)}>
              Assign products
            </Button>
          ) : (
            <Button size="small" onClick={() => onPreview(record)}>
              Preview
            </Button>
          )}
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this collection?"
            okText="Delete"
            cancelText="Cancel"
            onConfirm={() => onDelete(record)}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];
}

export default function CollectionsTable({
  collections,
  onEdit,
  onAssign,
  onPreview,
  onDelete,
}) {
  return (
    <Table
      rowKey="id"
      columns={buildColumns({ onEdit, onAssign, onPreview, onDelete })}
      dataSource={collections}
      pagination={{
        pageSize: 20,
        showSizeChanger: false,
        showTotal: (total) => `${total} collections`,
      }}
      size="middle"
    />
  );
}
