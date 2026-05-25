import { Button, Card, Col, Row, Space, Typography } from "antd";
import { useState } from "react";
import { templateRegistry } from "../../../components/website-builder/templateRegistry";

interface Props {
  onNext: (templateSlug: string) => void;
  onBack: () => void;
}

export default function TemplatePickStep({ onNext, onBack }: Props) {
  const [selected, setSelected] = useState<string>(
    templateRegistry[0]?.id ?? "modern-minimal",
  );

  return (
    <>
      <Typography.Title level={3}>Choose a template</Typography.Title>
      <Typography.Paragraph type="secondary">
        Pick a starting point for your storefront. You can customise everything
        after launch.
      </Typography.Paragraph>
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {templateRegistry.map((tmpl) => (
          <Col xs={24} sm={8} key={tmpl.id}>
            <Card
              hoverable
              onClick={() => setSelected(tmpl.id)}
              style={{
                border:
                  selected === tmpl.id
                    ? "2px solid #0D5C53"
                    : "2px solid transparent",
                cursor: "pointer",
              }}
              styles={{ body: { padding: 0 } }}
            >
              <div
                style={{
                  height: 120,
                  background: `linear-gradient(135deg, ${tmpl.gradientFrom}, ${tmpl.gradientTo})`,
                  borderRadius: "8px 8px 0 0",
                }}
              />
              <div style={{ padding: "12px 16px" }}>
                <Typography.Text strong>{tmpl.name}</Typography.Text>
                <br />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {tmpl.description}
                </Typography.Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      <Space style={{ width: "100%", justifyContent: "space-between" }}>
        <Button size="large" onClick={onBack}>
          Back
        </Button>
        <Button type="primary" size="large" onClick={() => onNext(selected)}>
          Use this template
        </Button>
      </Space>
    </>
  );
}
