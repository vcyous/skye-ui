import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  Row,
  Select,
  Tag,
  Typography,
} from "antd";
import { useEffect, useState } from "react";
import {
  getStoreProfile,
  getTemplates,
  updateStoreBranding,
  updateStoreProfile,
} from "../services/api.js";

const currencyOptions = ["USD", "IDR", "SGD", "EUR", "GBP"].map((code) => ({
  value: code,
  label: code,
}));

const timezoneOptions = [
  "UTC",
  "Asia/Jakarta",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
].map((value) => ({ value, label: value }));

const statusOptions = ["draft", "active", "inactive", "archived"].map(
  (value) => ({ value, label: value }),
);

export default function StorePage() {
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [settingsNotice, setSettingsNotice] = useState("");
  const [brandingNotice, setBrandingNotice] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [settingsForm] = Form.useForm();
  const [brandingForm] = Form.useForm();

  useEffect(() => {
    Promise.all([getStoreProfile(), getTemplates()]).then(([store, list]) => {
      setProfile(store);
      setTemplates(list);
      settingsForm.setFieldsValue({
        storeName: store.storeName,
        description: store.description || "",
        currencyCode: store.currencyCode || "USD",
        timezone: store.timezone || "UTC",
        status: store.status || "active",
      });
      brandingForm.setFieldsValue({
        logoUrl: "",
        primaryColor: "#006c9c",
        accentColor: "#ffd566",
        headingFont: "Space Grotesk",
        bodyFont: "Manrope",
      });
    });
  }, []);

  async function onSaveSettings(values) {
    setSettingsNotice("");
    setIsSavingSettings(true);
    try {
      const updated = await updateStoreProfile(values);
      setProfile(updated);
      setSettingsNotice("Store settings saved.");
    } catch (err) {
      setSettingsNotice(err.message || "Failed to save store settings.");
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function onSaveBranding(values) {
    setBrandingNotice("");
    setIsSavingBranding(true);
    try {
      await updateStoreBranding(values);
      setBrandingNotice("Branding saved to active theme.");
    } catch (err) {
      setBrandingNotice(err.message || "Failed to save branding.");
    } finally {
      setIsSavingBranding(false);
    }
  }

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
        {settingsNotice ? (
          <Alert
            type={settingsNotice.includes("Failed") ? "error" : "success"}
            message={settingsNotice}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={onSaveSettings}
          requiredMark={false}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="storeName"
                label="Store name"
                rules={[{ required: true, message: "Store name is required." }]}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="status"
                label="Status"
                rules={[{ required: true, message: "Status is required." }]}
              >
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="currencyCode"
                label="Currency"
                rules={[{ required: true, message: "Currency is required." }]}
              >
                <Select options={currencyOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="timezone"
                label="Timezone"
                rules={[{ required: true, message: "Timezone is required." }]}
              >
                <Select options={timezoneOptions} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" loading={isSavingSettings}>
            Save store settings
          </Button>
        </Form>
      </Card>

      <Card title="Template / Decoration">
        {brandingNotice ? (
          <Alert
            type={brandingNotice.includes("Failed") ? "error" : "success"}
            message={brandingNotice}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form
          form={brandingForm}
          layout="vertical"
          onFinish={onSaveBranding}
          requiredMark={false}
          style={{ marginBottom: 16 }}
        >
          <Row gutter={[12, 12]}>
            <Col xs={24} md={12}>
              <Form.Item name="logoUrl" label="Logo URL">
                <Input placeholder="https://..." />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="primaryColor" label="Primary color">
                <Input placeholder="#006c9c" />
              </Form.Item>
            </Col>
            <Col xs={24} md={6}>
              <Form.Item name="accentColor" label="Accent color">
                <Input placeholder="#ffd566" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="headingFont" label="Heading font">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="bodyFont" label="Body font">
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Button type="primary" htmlType="submit" loading={isSavingBranding}>
            Save branding
          </Button>
        </Form>

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
