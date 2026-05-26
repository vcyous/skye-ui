import { Button, Modal, Table, Tag, Typography } from "antd";

export default function CollectionPreviewModal({ collection, products, onClose }) {
  const open = Boolean(collection);
  const matchingProducts = products.filter((item) =>
    (collection?.productIds || []).includes(item.id),
  );

  return (
    <Modal
      title={`Preview — ${collection?.name ?? ""}`}
      open={open}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          Close
        </Button>
      }
      width={700}
      destroyOnClose
    >
      <Typography.Text
        type="secondary"
        style={{ display: "block", marginBottom: 12 }}
      >
        This collection matches {collection?.productCount ?? 0} products based on
        your conditions.
      </Typography.Text>
      <Table
        size="small"
        rowKey="id"
        dataSource={matchingProducts}
        pagination={{ pageSize: 8 }}
        columns={[
          { title: "Name", dataIndex: "name", key: "name" },
          { title: "SKU", dataIndex: "sku", key: "sku" },
          {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (v) => <Tag>{v}</Tag>,
          },
        ]}
      />
    </Modal>
  );
}
