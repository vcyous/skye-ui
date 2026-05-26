import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import {
  Avatar,
  Badge,
  Button,
  Popconfirm,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { formatCurrency } from "../../../shared/format";
import { STATUS_COLOR } from "../constants";

function buildColumns({ onEdit, onAddToCart, onDelete }) {
  return [
    {
      title: "Product",
      key: "product",
      render: (_, record) => (
        <Space>
          {record.mediaUrls?.[0] ? (
            <Avatar
              shape="square"
              size={40}
              src={record.mediaUrls[0]}
              style={{ borderRadius: 6, border: "1px solid var(--line)" }}
            />
          ) : (
            <Avatar
              shape="square"
              size={40}
              style={{
                background: "var(--paper)",
                color: "var(--ink-3)",
                borderRadius: 6,
              }}
            >
              {record.name?.[0]?.toUpperCase()}
            </Avatar>
          )}
          <Space direction="vertical" size={0}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              {record.name}
            </Typography.Text>
            {record.vendor && (
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                {record.vendor}
              </Typography.Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (value) => (
        <Badge
          status={STATUS_COLOR[value]}
          text={
            <span style={{ textTransform: "capitalize", fontSize: 13 }}>
              {value}
            </span>
          }
        />
      ),
    },
    {
      title: "Inventory",
      key: "stock",
      render: (_, record) => {
        const qty = record.quantity_in_stock ?? record.stock ?? 0;
        return (
          <Typography.Text
            type={Number(qty) === 0 ? "danger" : undefined}
            style={{ fontSize: 13 }}
          >
            {Number(qty) === 0 ? "Out of stock" : `${qty} in stock`}
          </Typography.Text>
        );
      },
    },
    {
      title: "Price",
      key: "price",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text style={{ fontSize: 13 }}>
            {formatCurrency(Number(record.price))}
          </Typography.Text>
          {record.compareAtPrice && (
            <Typography.Text type="secondary" delete style={{ fontSize: 12 }}>
              {formatCurrency(Number(record.compareAtPrice))}
            </Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: "Type",
      key: "productType",
      render: (_, record) => (
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {record.productType || "—"}
        </Typography.Text>
      ),
    },
    {
      title: "",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Space>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Add to cart">
            <Button
              type="text"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => onAddToCart(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete this product?"
            onConfirm={() => onDelete(record)}
            okText="Delete"
            cancelText="Cancel"
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

export default function ProductsTable({
  products,
  isLoading,
  selectedRowKeys,
  onSelectionChange,
  onEdit,
  onAddToCart,
  onDelete,
}) {
  const columns = buildColumns({ onEdit, onAddToCart, onDelete });

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      rowSelection={{
        selectedRowKeys,
        onChange: onSelectionChange,
      }}
      columns={columns}
      dataSource={products}
      pagination={{
        pageSize: 20,
        showSizeChanger: false,
        showTotal: (total) => `${total} products`,
      }}
      size="middle"
    />
  );
}
