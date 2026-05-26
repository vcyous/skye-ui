import {
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Switch,
} from "antd";
import { useEffect } from "react";
import { SHIPPING_TYPE_OPTIONS } from "../constants";

function toFormValues(method) {
  if (!method) return {};
  return {
    name: method.name,
    shippingType: method.shippingType,
    baseRate: method.baseRate,
    isActive: method.isActive,
    zoneIds: (method.zones || []).map((zone) => zone.id),
  };
}

export default function MethodFormModal({
  mode,
  open,
  method,
  zones,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && method) {
      form.setFieldsValue(toFormValues(method));
    } else {
      form.resetFields();
    }
  }, [open, isEdit, method, form]);

  async function handleFinish(values) {
    const ok = await onSubmit(values);
    if (ok) form.resetFields();
  }

  function handleCancel() {
    form.resetFields();
    onCancel();
  }

  const zoneOptions = zones
    .filter((item) => item.isActive)
    .map((item) => ({ value: item.id, label: item.name }));

  return (
    <Modal
      title={isEdit ? "Edit Shipping Method" : "Add Shipping Method"}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={!isEdit ? false : undefined}
      >
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="shippingType"
          label="Type"
          initialValue={isEdit ? undefined : "flat_rate"}
          rules={[{ required: true }]}
        >
          <Select options={SHIPPING_TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item
          name="baseRate"
          label="Base Rate"
          initialValue={isEdit ? undefined : 0}
        >
          <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          name="isActive"
          label="Active"
          valuePropName="checked"
          initialValue={isEdit ? undefined : true}
        >
          <Switch />
        </Form.Item>
        <Form.Item name="zoneIds" label="Zones">
          <Select
            mode="multiple"
            allowClear
            placeholder={isEdit ? undefined : "All zones when empty"}
            options={zoneOptions}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
