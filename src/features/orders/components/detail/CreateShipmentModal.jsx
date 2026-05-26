import { Form, Input, Modal, Select } from "antd";
import { CARRIER_OPTIONS } from "../../constants";

export default function CreateShipmentModal({
  open,
  isShipping,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();

  async function handleFinish(values) {
    const ok = await onSubmit(values);
    if (ok) form.resetFields();
  }

  function handleCancel() {
    form.resetFields();
    onCancel();
  }

  return (
    <Modal
      title="Create shipment"
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={isShipping}
      okText="Create shipment"
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="carrier" label="Carrier" rules={[{ required: true }]}>
          <Select options={CARRIER_OPTIONS} placeholder="Select carrier" />
        </Form.Item>
        <Form.Item
          name="trackingNumber"
          label="Tracking number"
          rules={[{ required: true }]}
        >
          <Input placeholder="e.g. JNE1234567890" />
        </Form.Item>
        <Form.Item name="note" label="Note (optional)">
          <Input.TextArea
            rows={2}
            placeholder="Handling instructions, etc."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
