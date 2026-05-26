import { Button, Descriptions, Space, Typography } from "antd";

export default function LaunchStep({ values, onLaunch, onBack, isLaunching }) {
  return (
    <>
      <Typography.Title level={3}>You&apos;re ready to launch</Typography.Title>
      <Typography.Paragraph type="secondary">
        Review your store details and hit Launch when you&apos;re ready.
      </Typography.Paragraph>
      <Descriptions bordered column={1} style={{ marginBottom: 24 }}>
        <Descriptions.Item label="Store name">
          {values.storeName}
        </Descriptions.Item>
        <Descriptions.Item label="Template">
          {values.templateSlug}
        </Descriptions.Item>
        <Descriptions.Item label="Currency">
          {values.currency}
        </Descriptions.Item>
        <Descriptions.Item label="Timezone">
          {values.timezone}
        </Descriptions.Item>
      </Descriptions>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Button size="large" onClick={onBack} disabled={isLaunching}>
          Back
        </Button>
        <Button
          type="primary"
          size="large"
          loading={isLaunching}
          onClick={onLaunch}
          block
        >
          Launch My Store
        </Button>
      </Space>
    </>
  );
}
