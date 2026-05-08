import { Card, Col, Descriptions, List, Row, Tag, Typography } from "antd";
import { useEffect, useState } from "react";
import { getStoreProfile, getTemplates } from "../services/api.js";

export default function StorePage() {
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    getStoreProfile().then(setProfile);
    getTemplates().then(setTemplates);
  }, []);

  if (!profile) return <Card>Loading store profile...</Card>;

  return (
    <section style={{ display: "grid", gap: 16 }}>
      <header>
        <Typography.Title level={3} className="page-title">
          Store Management
        </Typography.Title>
        <Typography.Text className="page-subtitle">
          Profile, Template/Decoration, Logistics/Shipping, Payment Gateway,
          financial report.
        </Typography.Text>
      </header>

      <Row gutter={[12, 12]}>
        <Col xs={24} md={8}>
          <Card title="Store">{profile.storeName ?? profile.store_name}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Templates">{templates.length}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Active Theme">
            {templates.find((item) => item.active)?.name || "Not selected"}
          </Card>
        </Col>
      </Row>

      <Card title="Profile">
        <Descriptions bordered column={{ xs: 1, md: 2 }}>
          <Descriptions.Item label="Owner">
            {profile.ownerName ?? profile.owner_name}
          </Descriptions.Item>
          <Descriptions.Item label="Logistics">
            {profile.logisticsProvider ?? profile.logistics_provider}
          </Descriptions.Item>
          <Descriptions.Item label="Payment Gateway" span={2}>
            {profile.paymentGateway ?? profile.payment_gateway}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Template / Decoration">
        <List
          dataSource={templates}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <List.Item.Meta title={item.name} />
              {item.active ? <Tag color="green">active</Tag> : null}
            </List.Item>
          )}
        />
      </Card>
    </section>
  );
}
