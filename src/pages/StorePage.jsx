import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  List,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import { useEffect, useMemo, useState } from "react";
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
  "Asia/Jakarta",
  "Asia/Singapore",
  "UTC",
  "Europe/London",
  "America/New_York",
].map((value) => ({ value, label: value }));

const localeOptions = [
  { value: "id", label: "Indonesian (id)" },
  { value: "en", label: "English (en)" },
];

const countryOptions = [
  { value: "ID", label: "Indonesia" },
  { value: "SG", label: "Singapore" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
];

const statusOptions = ["draft", "active", "inactive", "archived"].map(
  (value) => ({ value, label: value }),
);

export default function StorePage() {
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [settingsNotice, setSettingsNotice] = useState(null);
  const [brandingNotice, setBrandingNotice] = useState(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [isSettingsDirty, setIsSettingsDirty] = useState(false);
  const [isBrandingDirty, setIsBrandingDirty] = useState(false);
  const [settingsForm] = Form.useForm();
  const [brandingForm] = Form.useForm();

  const activeTemplateName =
    useMemo(
      () => templates.find((item) => item.active)?.name || "Default Branding",
      [templates],
    ) || "Default Branding";

  async function loadStoreData() {
    setLoadError("");
    setIsLoading(true);
    try {
      const [store, list] = await Promise.all([
        getStoreProfile(),
        getTemplates(),
      ]);
      setProfile(store);
      setTemplates(list);

      settingsForm.setFieldsValue({
        storeName: store.storeName,
        description: store.description || "",
        status: store.status || "active",
        currencyCode: store.currencyCode || "IDR",
        timezone: store.timezone || "Asia/Jakarta",
        locale: store.locale || "id",
        country: store.country || "ID",
        contactEmail: store.contactEmail || store.email || "",
        contactPhone: store.contactPhone || "",
        address: store.address || "",
        city: store.city || "",
        province: store.province || "",
        postalCode: store.postalCode || "",
      });

      brandingForm.setFieldsValue({
        logoUrl: store.branding?.logoUrl || "",
        primaryColor: store.branding?.primaryColor || "#006c9c",
        accentColor: store.branding?.accentColor || "#ffd566",
        headingFont: store.branding?.headingFont || "Space Grotesk",
        bodyFont: store.branding?.bodyFont || "Manrope",
      });

      setIsSettingsDirty(false);
      setIsBrandingDirty(false);
    } catch (err) {
      setLoadError(err.message || "Failed to load store settings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStoreData();
  }, []);

  async function onSaveSettings(values) {
    setSettingsNotice(null);
    setIsSavingSettings(true);
    try {
      const updated = await updateStoreProfile(values);
      setProfile(updated);
      setSettingsNotice({ type: "success", message: "Store settings saved." });
      setIsSettingsDirty(false);
    } catch (err) {
      setSettingsNotice({
        type: "error",
        message: err.message || "Failed to save store settings.",
      });
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function onSaveBranding(values) {
    setBrandingNotice(null);
    setIsSavingBranding(true);
    try {
      const result = await updateStoreBranding(values);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              branding: {
                ...prev.branding,
                ...result.branding,
              },
            }
          : prev,
      );
      setBrandingNotice({
        type: "success",
        message:
          result.persistedIn === "stores.settings"
            ? "Branding saved with fallback storage."
            : "Branding saved to active theme.",
      });
      setIsBrandingDirty(false);
    } catch (err) {
      setBrandingNotice({
        type: "error",
        message: err.message || "Failed to save branding.",
      });
    } finally {
      setIsSavingBranding(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <Space align="center" size={12}>
          <Spin />
          <Typography.Text>Loading store profile...</Typography.Text>
        </Space>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <Alert
          type="error"
          showIcon
          message="Unable to load store settings"
          description={
            <Space direction="vertical">
              <Typography.Text>{loadError}</Typography.Text>
              <Button onClick={loadStoreData}>Retry</Button>
            </Space>
          }
        />
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <Alert
          type="warning"
          showIcon
          message="Store profile not found"
          description="Please retry. If this persists, relogin to regenerate your store context."
        />
      </Card>
    );
  }

  const brandingPreview = {
    logoUrl:
      brandingForm.getFieldValue("logoUrl") || profile.branding?.logoUrl || "",
    primaryColor:
      brandingForm.getFieldValue("primaryColor") ||
      profile.branding?.primaryColor ||
      "#006c9c",
    accentColor:
      brandingForm.getFieldValue("accentColor") ||
      profile.branding?.accentColor ||
      "#ffd566",
    headingFont:
      brandingForm.getFieldValue("headingFont") ||
      profile.branding?.headingFont ||
      "Space Grotesk",
    bodyFont:
      brandingForm.getFieldValue("bodyFont") ||
      profile.branding?.bodyFont ||
      "Manrope",
  };

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
          <Card title="Store">{profile.storeName}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Templates">{templates.length || 0}</Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="Active Theme">{activeTemplateName}</Card>
        </Col>
      </Row>

      <Card title="Profile">
        {settingsNotice?.message ? (
          <Alert
            type={settingsNotice.type}
            message={settingsNotice.message}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form
          form={settingsForm}
          layout="vertical"
          onFinish={onSaveSettings}
          onValuesChange={() => setIsSettingsDirty(true)}
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
              <Form.Item name="contactEmail" label="Contact email">
                <Input type="email" placeholder="store@example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="contactPhone" label="Contact phone">
                <Input placeholder="+62..." />
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
            <Col xs={24} md={12}>
              <Form.Item
                name="locale"
                label="Locale"
                rules={[{ required: true, message: "Locale is required." }]}
              >
                <Select options={localeOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="country"
                label="Country"
                rules={[{ required: true, message: "Country is required." }]}
              >
                <Select options={countryOptions} />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Divider style={{ margin: "8px 0" }} />
            </Col>
            <Col xs={24}>
              <Form.Item name="address" label="Address">
                <Input placeholder="Street address" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="city" label="City">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="province" label="Province">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name="postalCode" label="Postal code">
                <Input />
              </Form.Item>
            </Col>
            <Col xs={24}>
              <Form.Item name="description" label="Description">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          <Button
            type="primary"
            htmlType="submit"
            loading={isSavingSettings}
            disabled={!isSettingsDirty}
          >
            Save store settings
          </Button>
        </Form>
      </Card>

      <Card title="Template / Decoration">
        {brandingNotice?.message ? (
          <Alert
            type={brandingNotice.type}
            message={brandingNotice.message}
            showIcon
            style={{ marginBottom: 16 }}
          />
        ) : null}

        <Form
          form={brandingForm}
          layout="vertical"
          onFinish={onSaveBranding}
          onValuesChange={() => setIsBrandingDirty(true)}
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

          <Button
            type="primary"
            htmlType="submit"
            loading={isSavingBranding}
            disabled={!isBrandingDirty}
          >
            Save branding
          </Button>
        </Form>

        <Card style={{ marginBottom: 16 }}>
          <Typography.Title level={5} style={{ marginTop: 0 }}>
            Branding Preview
          </Typography.Title>
          <div
            style={{
              border: `1px solid ${brandingPreview.accentColor}`,
              borderRadius: 12,
              padding: 16,
              background: "rgba(255,255,255,0.5)",
            }}
          >
            {brandingPreview.logoUrl ? (
              <img
                src={brandingPreview.logoUrl}
                alt="Store logo"
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  objectFit: "cover",
                }}
              />
            ) : (
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 8,
                  background: brandingPreview.primaryColor,
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 700,
                }}
              >
                {String(profile.storeName || "S")
                  .slice(0, 1)
                  .toUpperCase()}
              </div>
            )}

            <Typography.Title
              level={4}
              style={{
                margin: "10px 0 4px",
                color: brandingPreview.primaryColor,
                fontFamily: brandingPreview.headingFont,
              }}
            >
              {profile.storeName}
            </Typography.Title>
            <Typography.Text style={{ fontFamily: brandingPreview.bodyFont }}>
              {profile.description || "No store description yet."}
            </Typography.Text>
          </div>
        </Card>

        <List
          dataSource={templates}
          renderItem={(item) => (
            <List.Item key={item.id}>
              <List.Item.Meta title={item.name} />
              {item.active ? <Tag color="green">active</Tag> : null}
            </List.Item>
          )}
          locale={{
            emptyText:
              "No templates available yet. Fallback branding is active.",
          }}
        />
      </Card>
    </section>
  );
}
