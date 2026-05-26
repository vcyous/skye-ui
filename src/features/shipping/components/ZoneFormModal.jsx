import { Form, Input, Modal, Switch } from "antd";
import { useEffect } from "react";

function toFormValues(zone) {
  if (!zone) return {};
  return {
    name: zone.name,
    countryCode: zone.countryCode,
    regionCode: zone.regionCode,
    postalCodePattern: zone.postalCodePattern,
    isActive: zone.isActive,
  };
}

export default function ZoneFormModal({ mode, open, zone, onSubmit, onCancel }) {
  const [form] = Form.useForm();
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && zone) {
      form.setFieldsValue(toFormValues(zone));
    } else {
      form.resetFields();
    }
  }, [open, isEdit, zone, form]);

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
      title={isEdit ? "Edit Shipping Zone" : "Add Shipping Zone"}
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
        <Form.Item name="name" label="Zone Name" rules={[{ required: true }]}>
          <Input placeholder={isEdit ? undefined : "Jakarta Metro"} />
        </Form.Item>
        <Form.Item name="countryCode" label="Country">
          <Input placeholder={isEdit ? undefined : "ID"} />
        </Form.Item>
        <Form.Item name="regionCode" label="Region">
          <Input placeholder={isEdit ? undefined : "JK"} />
        </Form.Item>
        <Form.Item name="postalCodePattern" label="Postal Pattern">
          <Input placeholder={isEdit ? undefined : "10*"} />
        </Form.Item>
        <Form.Item
          name="isActive"
          label="Active"
          valuePropName="checked"
          initialValue={isEdit ? undefined : true}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
