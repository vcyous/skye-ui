import {
  App,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Table,
} from "antd";
import { useEffect, useState } from "react";
import { SHIPMENT_STATUS_OPTIONS } from "../constants";

export default function CreateShipmentModal({
  open,
  orders,
  methods,
  isSaving,
  fetchFulfillmentItems,
  onSubmit,
  onCancel,
}) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [fulfillmentItems, setFulfillmentItems] = useState([]);
  const [shipmentItemQty, setShipmentItemQty] = useState({});

  useEffect(() => {
    if (!open) {
      form.resetFields();
      setSelectedOrderId("");
      setFulfillmentItems([]);
      setShipmentItemQty({});
    }
  }, [open, form]);

  async function handleSelectOrder(orderId) {
    setSelectedOrderId(orderId);
    form.setFieldValue("orderId", orderId);
    if (!orderId) {
      setFulfillmentItems([]);
      setShipmentItemQty({});
      return;
    }
    const items = await fetchFulfillmentItems(orderId);
    setFulfillmentItems(items);
    setShipmentItemQty(
      items.reduce((acc, item) => {
        acc[item.id] = 0;
        return acc;
      }, {}),
    );
  }

  async function handleFinish(values) {
    const selectedItems = Object.entries(shipmentItemQty)
      .map(([orderItemId, quantity]) => ({
        orderItemId,
        quantity: Number(quantity || 0),
      }))
      .filter((item) => item.quantity > 0);

    if (!selectedItems.length) {
      message.warning("Select at least one item quantity for shipment.");
      return;
    }

    const ok = await onSubmit({ ...values, items: selectedItems });
    if (ok) {
      form.resetFields();
      setSelectedOrderId("");
      setFulfillmentItems([]);
      setShipmentItemQty({});
    }
  }

  const activeMethodOptions = methods
    .filter((item) => item.isActive)
    .map((item) => ({ value: item.id, label: item.name }));

  const orderOptions = orders.map((item) => ({
    value: item.id,
    label: item.orderNumber,
  }));

  return (
    <Modal
      title="Create Shipment"
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={isSaving}
      destroyOnClose
      width={900}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="orderId" label="Order" rules={[{ required: true }]}>
          <Select onChange={handleSelectOrder} options={orderOptions} />
        </Form.Item>
        <Form.Item
          name="shippingMethodId"
          label="Shipping Method"
          rules={[{ required: true }]}
        >
          <Select options={activeMethodOptions} />
        </Form.Item>
        <Form.Item name="carrier" label="Carrier">
          <Input />
        </Form.Item>
        <Form.Item name="trackingNumber" label="Tracking Number">
          <Input />
        </Form.Item>
        <Form.Item name="status" label="Status" initialValue="pending">
          <Select options={SHIPMENT_STATUS_OPTIONS} />
        </Form.Item>

        {selectedOrderId ? (
          <Card size="small" title="Split Shipment Items">
            <Table
              rowKey="id"
              pagination={false}
              dataSource={fulfillmentItems}
              locale={{ emptyText: "No fulfillable items for this order." }}
              columns={[
                {
                  title: "Item",
                  key: "item",
                  render: (_, record) =>
                    `${record.productTitle}${record.variantTitle ? ` - ${record.variantTitle}` : ""}`,
                },
                { title: "SKU", dataIndex: "sku", key: "sku" },
                { title: "Ordered", dataIndex: "orderedQty", key: "orderedQty" },
                { title: "Remaining", dataIndex: "remainingQty", key: "remainingQty" },
                {
                  title: "Ship Qty",
                  key: "shipQty",
                  render: (_, record) => (
                    <InputNumber
                      min={0}
                      max={record.remainingQty}
                      value={shipmentItemQty[record.id] || 0}
                      onChange={(value) =>
                        setShipmentItemQty((prev) => ({
                          ...prev,
                          [record.id]: Number(value || 0),
                        }))
                      }
                    />
                  ),
                },
              ]}
            />
          </Card>
        ) : null}
      </Form>
    </Modal>
  );
}
