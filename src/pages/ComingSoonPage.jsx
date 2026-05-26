import { RocketOutlined } from "@ant-design/icons";
import { Button, Card, Result, Space, Tag, Typography } from "antd";
import { useNavigate } from "react-router-dom";

export default function ComingSoonPage() {
  const navigate = useNavigate();

  return (
    <Card>
      <Result
        icon={<RocketOutlined style={{ color: "#0D5C53", fontSize: 64 }} />}
        title="Feature Under Development"
        subTitle={
          <Space direction="vertical" size={4}>
            <Typography.Text type="secondary">
              This feature is part of our upcoming roadmap and will be available
              in a future release.
            </Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              We're focusing on the core commerce experience for now — store
              setup, products, and orders.
            </Typography.Text>
          </Space>
        }
        extra={
          <Space direction="vertical" align="center" size={12}>
            <Tag
              color="processing"
              style={{ fontSize: 13, padding: "4px 12px" }}
            >
              Coming Soon
            </Tag>
            <Button
              type="primary"
              size="large"
              onClick={() => navigate("/dashboard")}
            >
              Back to Dashboard
            </Button>
          </Space>
        }
      />
    </Card>
  );
}
