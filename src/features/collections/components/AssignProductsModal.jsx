import { Form, Modal, Select } from "antd";
import { useEffect } from "react";

export default function AssignProductsModal({
  collection,
  products,
  isSaving,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();
  const open = Boolean(collection);

  useEffect(() => {
    if (open && collection) {
      form.setFieldsValue({ productIds: collection.productIds || [] });
    }
  }, [open, collection, form]);

  async function handleFinish(values) {
    const ok = await onSubmit(collection.id, values.productIds || []);
    if (ok) form.resetFields();
  }

  return (
    <Modal
      title={`Assign products — ${collection?.name ?? ""}`}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="Save"
      confirmLoading={isSaving}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item name="productIds" label="Products">
          <Select
            mode="multiple"
            optionFilterProp="label"
            placeholder="Search and select products"
            options={products.map((item) => ({
              value: item.id,
              label: `${item.name} (${item.sku})`,
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
