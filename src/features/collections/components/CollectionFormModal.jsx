import { Card, Col, Form, Input, Modal, Row, Select } from "antd";
import { useEffect } from "react";
import { COLLECTION_TYPE_OPTIONS, STATUS_OPTIONS } from "../constants";
import { CREATE_INITIAL_VALUES, toCollectionFormValues } from "../collectionMapper";
import CollectionRuleBuilder from "./CollectionRuleBuilder";

export default function CollectionFormModal({
  mode,
  open,
  collection,
  isSubmitting,
  onSubmit,
  onCancel,
}) {
  const [form] = Form.useForm();
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    if (isEdit && collection) {
      form.setFieldsValue(toCollectionFormValues(collection));
    } else {
      form.resetFields();
    }
  }, [open, isEdit, collection, form]);

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
      title={isEdit ? "Edit collection" : "Create collection"}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={isSubmitting}
      destroyOnClose
      width={860}
      okText={isEdit ? "Save changes" : "Save collection"}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark={!isEdit ? false : undefined}
        initialValues={isEdit ? undefined : CREATE_INITIAL_VALUES}
      >
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Card size="small" style={{ marginBottom: 12 }}>
              <Form.Item
                name="name"
                label="Title"
                rules={[{ required: true, message: "Title is required." }]}
                style={{ marginBottom: 12 }}
              >
                <Input
                  placeholder={isEdit ? undefined : "Summer Launch"}
                  size="large"
                />
              </Form.Item>
              <Form.Item
                name="description"
                label="Description"
                style={{ marginBottom: 0 }}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={
                    isEdit ? undefined : "Optional collection description"
                  }
                />
              </Form.Item>
            </Card>

            <Card size="small" title="Collection type" style={{ marginBottom: 12 }}>
              <Form.Item
                name="collectionType"
                rules={[{ required: true }]}
                style={{ marginBottom: 0 }}
              >
                <Select options={COLLECTION_TYPE_OPTIONS} />
              </Form.Item>
              <CollectionRuleBuilder form={form} />
            </Card>

            <Card size="small" title="Search engine listing">
              <Form.Item name="urlHandle" label="URL handle">
                <Input
                  prefix="collections/"
                  placeholder={isEdit ? undefined : "summer-launch"}
                />
              </Form.Item>
              <Form.Item name="seoTitle" label="Page title">
                <Input
                  placeholder={isEdit ? undefined : "SEO title"}
                  maxLength={70}
                  showCount
                />
              </Form.Item>
              <Form.Item
                name="seoDescription"
                label="Meta description"
                style={{ marginBottom: 0 }}
              >
                <Input.TextArea
                  rows={3}
                  placeholder={isEdit ? undefined : "SEO description"}
                  maxLength={160}
                  showCount
                />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card size="small" title="Status">
              <Form.Item
                name="status"
                rules={[{ required: true }]}
                style={{ marginBottom: 0 }}
              >
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
