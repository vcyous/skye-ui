import { UploadOutlined } from "@ant-design/icons";
import {
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Typography,
  Upload,
} from "antd";
import { useEffect, useState } from "react";
import { STATUS_OPTIONS } from "../constants";
import { toProductFormValues } from "../productMapper";

function ImageUploader({ onUpload, urls }) {
  const [isBusy, setIsBusy] = useState(false);

  const beforeUpload = async (file) => {
    setIsBusy(true);
    try {
      await onUpload(file);
    } finally {
      setIsBusy(false);
    }
    return false;
  };

  return (
    <>
      <Upload
        beforeUpload={beforeUpload}
        accept="image/*"
        listType="picture-card"
        showUploadList={false}
        multiple
      >
        <div style={{ padding: "16px 0" }}>
          <UploadOutlined style={{ fontSize: 20, color: "var(--ink-3)" }} />
          <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-2)" }}>
            Add image
          </div>
        </div>
      </Upload>
      {urls.length > 0 && (
        <Space wrap style={{ marginTop: 8 }}>
          {urls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              style={{
                width: 72,
                height: 72,
                objectFit: "cover",
                borderRadius: 6,
                border: "1px solid var(--line)",
              }}
            />
          ))}
        </Space>
      )}
      {isBusy && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Uploading...
        </Typography.Text>
      )}
    </>
  );
}

export default function ProductFormModal({
  mode,
  open,
  product,
  isSubmitting,
  onSubmit,
  onCancel,
  onUploadImage,
}) {
  const [form] = Form.useForm();
  const [mediaUrls, setMediaUrls] = useState([]);

  const isEdit = mode === "edit";
  const title = isEdit ? "Edit product" : "Add product";
  const okText = isEdit ? "Save changes" : "Save product";

  useEffect(() => {
    if (!open) return;
    if (isEdit && product) {
      form.setFieldsValue(toProductFormValues(product));
      setMediaUrls([...(product.mediaUrls || [])]);
    } else {
      form.resetFields();
      setMediaUrls([]);
    }
  }, [open, isEdit, product, form]);

  async function handleUpload(file) {
    const url = await onUploadImage(file);
    if (url) {
      setMediaUrls((prev) => [...prev, url]);
    }
  }

  async function handleFinish(values) {
    const ok = await onSubmit(values, mediaUrls);
    if (ok) {
      form.resetFields();
      setMediaUrls([]);
    }
  }

  function handleCancel() {
    form.resetFields();
    setMediaUrls([]);
    onCancel();
  }

  return (
    <Modal
      title={title}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      confirmLoading={isSubmitting}
      destroyOnClose
      width={960}
      okText={okText}
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={16}>
          <Col xs={24} md={16}>
            <Card size="small" style={{ marginBottom: 12 }}>
              <Form.Item
                name="name"
                label="Title"
                rules={[{ required: true }]}
                style={{ marginBottom: 12 }}
              >
                <Input
                  placeholder={isEdit ? undefined : "Short sleeve t-shirt"}
                  size="large"
                />
              </Form.Item>
              <Form.Item
                name="description"
                label="Description"
                style={{ marginBottom: 0 }}
              >
                <Input.TextArea
                  rows={4}
                  placeholder={isEdit ? undefined : "Describe your product..."}
                />
              </Form.Item>
            </Card>

            <Card size="small" title="Media" style={{ marginBottom: 12 }}>
              <ImageUploader onUpload={handleUpload} urls={mediaUrls} />
            </Card>

            <Card size="small" title="Pricing" style={{ marginBottom: 12 }}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="price"
                    label="Price"
                    rules={[{ required: true }]}
                  >
                    <InputNumber
                      min={0}
                      step={0.01}
                      style={{ width: "100%" }}
                      prefix="$"
                      placeholder={isEdit ? undefined : "0.00"}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="compareAtPrice" label="Compare-at price">
                    <InputNumber
                      min={0}
                      step={0.01}
                      style={{ width: "100%" }}
                      prefix="$"
                      placeholder={isEdit ? undefined : "0.00"}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="costPrice" label="Cost per item">
                    <InputNumber
                      min={0}
                      step={0.01}
                      style={{ width: "100%" }}
                      prefix="$"
                      placeholder={isEdit ? undefined : "0.00"}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Inventory" style={{ marginBottom: 12 }}>
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    name="sku"
                    label={isEdit ? "SKU" : "SKU (Stock Keeping Unit)"}
                    rules={[{ required: true }]}
                  >
                    <Input placeholder={isEdit ? undefined : "SKU-001"} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="stock"
                    label="Quantity"
                    rules={[{ required: true }]}
                  >
                    <InputNumber min={0} style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Card size="small" title="Search engine listing">
              <Form.Item name="urlHandle" label="URL handle">
                <Input
                  prefix="products/"
                  placeholder={isEdit ? undefined : "short-sleeve-t-shirt"}
                />
              </Form.Item>
              <Form.Item name="seoTitle" label="Page title">
                <Input
                  placeholder={isEdit ? undefined : "SEO title (70 characters max)"}
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
                  placeholder={
                    isEdit ? undefined : "SEO description (160 characters max)"
                  }
                  maxLength={160}
                  showCount
                />
              </Form.Item>
            </Card>
          </Col>

          <Col xs={24} md={8}>
            <Card size="small" title="Status" style={{ marginBottom: 12 }}>
              <Form.Item
                name="status"
                initialValue={isEdit ? undefined : "draft"}
                rules={[{ required: true }]}
                style={{ marginBottom: 0 }}
              >
                <Select options={STATUS_OPTIONS} />
              </Form.Item>
            </Card>

            <Card
              size="small"
              title="Product organization"
              style={{ marginBottom: 12 }}
            >
              <Form.Item
                name="vendor"
                label="Vendor"
                style={{ marginBottom: 8 }}
              >
                <Input placeholder={isEdit ? undefined : "Acme"} />
              </Form.Item>
              <Form.Item
                name="productType"
                label="Product type"
                style={{ marginBottom: 8 }}
              >
                <Input placeholder={isEdit ? undefined : "Apparel"} />
              </Form.Item>
              <Form.Item name="tags" label="Tags" style={{ marginBottom: 0 }}>
                <Input
                  placeholder={
                    isEdit
                      ? "comma separated"
                      : "fashion, summer (comma separated)"
                  }
                />
              </Form.Item>
            </Card>

            <Card size="small" title="Sale schedule">
              <Form.Item name="priceStartAt" label="Start date">
                <DatePicker
                  showTime
                  style={{ width: "100%" }}
                  placeholder={isEdit ? undefined : "No start date"}
                />
              </Form.Item>
              <Form.Item
                name="priceEndAt"
                label="End date"
                style={{ marginBottom: 0 }}
              >
                <DatePicker
                  showTime
                  style={{ width: "100%" }}
                  placeholder={isEdit ? undefined : "No end date"}
                />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
