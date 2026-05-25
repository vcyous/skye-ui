import { Button, Form, Input, Select, Typography } from "antd";

interface StoreBasicsValues {
  storeName: string;
  currency: string;
  timezone: string;
}

interface Props {
  onNext: (values: StoreBasicsValues) => void;
}

const CURRENCY_OPTIONS = [
  { value: "IDR", label: "IDR — Indonesian Rupiah" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "MYR", label: "MYR — Malaysian Ringgit" },
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB)" },
  { value: "Asia/Makassar", label: "Asia/Makassar (WITA)" },
  { value: "Asia/Jayapura", label: "Asia/Jayapura (WIT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore" },
  { value: "UTC", label: "UTC" },
];

export default function StoreBasicsStep({ onNext }: Props) {
  const [form] = Form.useForm();

  return (
    <>
      <Typography.Title level={3}>Tell us about your store</Typography.Title>
      <Typography.Paragraph type="secondary">
        You can change these settings later from your dashboard.
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ currency: "IDR", timezone: "Asia/Jakarta" }}
        onFinish={onNext}
        requiredMark={false}
      >
        <Form.Item
          label="Store name"
          name="storeName"
          rules={[
            { required: true, message: "Store name is required" },
            { min: 3, message: "Minimum 3 characters" },
            { max: 100, message: "Maximum 100 characters" },
          ]}
        >
          <Input placeholder="e.g. Batik Nusantara" size="large" />
        </Form.Item>
        <Form.Item label="Currency" name="currency">
          <Select options={CURRENCY_OPTIONS} size="large" />
        </Form.Item>
        <Form.Item label="Timezone" name="timezone">
          <Select options={TIMEZONE_OPTIONS} size="large" />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit" size="large" block>
            Continue
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}
