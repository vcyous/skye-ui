import { GlobalOutlined, LayoutOutlined, SaveOutlined, ShopOutlined } from "@ant-design/icons";
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
import { useNavigate } from "react-router-dom";
import {
  getStoreProfile,
  getTemplates,
  updateStoreBranding,
  updateStoreProfile,
} from "../../services/api.js";

interface StoreProfile {
  id: string;
  storeName: string;
  description?: string;
  status?: string;
  currencyCode?: string;
  timezone?: string;
  locale?: string;
  country?: string;
  contactEmail?: string;
  email?: string;
  contactPhone?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    accentColor?: string;
    headingFont?: string;
    bodyFont?: string;
  };
}

interface Template {
  id: string;
  name: string;
  active: boolean;
}

interface Notice {
  type: "success" | "error" | "info" | "warning";
  message: string;
}

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
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StoreProfile | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>("");
  const [settingsNotice, setSettingsNotice] = useState<Notice | null>(null);
  const [brandingNotice, setBrandingNotice] = useState<Notice | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [isSavingBranding, setIsSavingBranding] = useState<boolean>(false);
  const [isSettingsDirty, setIsSettingsDirty] = useState<boolean>(false);
  const [isBrandingDirty, setIsBrandingDirty] = useState<boolean>(false);
  const [settingsForm] = Form.useForm();
  const [brandingForm] = Form.useForm();

  const activeTemplateName = useMemo(
    () => templates.find((item) => item.active)?.name || "Default branding",
    [templates],
  );

  async function loadStoreData() {
    setLoadError("");
    setIsLoading(true);
    try {
      const [store, list] = await Promise.all([getStoreProfile(), getTemplates()]);
      const s = store as StoreProfile;
      const t = list as Template[];
      setProfile(s);
      setTemplates(t);

      settingsForm.setFieldsValue({
        storeName: s.storeName,
        description: s.description || "",
        status: s.status || "active",
        currencyCode: s.currencyCode || "IDR",
        timezone: s.timezone || "Asia/Jakarta",
        locale: s.locale || "id",
        country: s.country || "ID",
        contactEmail: s.contactEmail || s.email || "",
        contactPhone: s.contactPhone || "",
        address: s.address || "",
        city: s.city || "",
        province: s.province || "",
        postalCode: s.postalCode || "",
      });

      brandingForm.setFieldsValue({
        logoUrl: s.branding?.logoUrl || "",
        primaryColor: s.branding?.primaryColor || "#006c9c",
        accentColor: s.branding?.accentColor || "#ffd566",
        headingFont: s.branding?.headingFont || "Space Grotesk",
        bodyFont: s.branding?.bodyFont || "Manrope",
      });

      setIsSettingsDirty(false);
      setIsBrandingDirty(false);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : "Failed to load store settings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadStoreData();
  }, []);

  async function onSaveSettings(values: Record<string, unknown>) {
    setSettingsNotice(null);
    setIsSavingSettings(true);
    try {
      const updated = await updateStoreProfile(values);
      setProfile(updated as StoreProfile);
      setSettingsNotice({ type: "success", message: "Store settings saved." });
      setIsSettingsDirty(false);
    } catch (err: unknown) {
      setSettingsNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save store settings.",
      });
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function onSaveBranding(values: Record<string, unknown>) {
    setBrandingNotice(null);
    setIsSavingBranding(true);
    try {
      const result = (await updateStoreBranding(values)) as { branding: Record<string, unknown>; persistedIn: string };
      setProfile((prev) =>
        prev ? { ...prev, branding: { ...prev.branding, ...(result.branding as StoreProfile["branding"]) } } : prev,
      );
      setBrandingNotice({
        type: "success",
        message:
          result.persistedIn === "stores.settings"
            ? "Branding saved (fallback storage)."
            : "Branding saved to active theme.",
      });
      setIsBrandingDirty(false);
    } catch (err: unknown) {
      setBrandingNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save branding.",
      });
    } finally {
      setIsSavingBranding(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <Space>
          <Spin />
          <Typography.Text>Loading store settings...</Typography.Text>
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
          description={loadError}
          action={<Button size="small" onClick={loadStoreData}>Retry</Button>}
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
          description="Please retry. If this persists, re-login to regenerate your store context."
        />
      </Card>
    );
  }

  const brandingPreview = {
    logoUrl: brandingForm.getFieldValue("logoUrl") || profile.branding?.logoUrl || "",
    primaryColor: brandingForm.getFieldValue("primaryColor") || profile.branding?.primaryColor || "#006c9c",
    accentColor: brandingForm.getFieldValue("accentColor") || profile.branding?.accentColor || "#ffd566",
    headingFont: brandingForm.getFieldValue("headingFont") || profile.branding?.headingFont || "Space Grotesk",
    bodyFont: brandingForm.getFieldValue("bodyFont") || profile.branding?.bodyFont || "Manrope",
  };

  return (
    <section style={{ display: "grid", gap: 16 }}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Settings
        </Typography.Title>
        <Button
          type="primary"
          icon={<LayoutOutlined />}
          onClick={() => navigate("/store/website-builder")}
        >
          Open website builder
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {/* Store details */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <ShopOutlined />
                Store details
              </Space>
            }
            style={{ marginBottom: 16 }}
            extra={
              isSettingsDirty && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  size="small"
                  loading={isSavingSettings}
                  onClick={() => settingsForm.submit()}
                >
                  Save
                </Button>
              )
            }
          >
            {settingsNotice?.message && (
              <Alert
                type={settingsNotice.type}
                message={settingsNotice.message}
                showIcon
                style={{ marginBottom: 16 }}
                closable
                onClose={() => setSettingsNotice(null)}
              />
            )}

            <Form
              form={settingsForm}
              layout="vertical"
              onFinish={onSaveSettings}
              onValuesChange={() => setIsSettingsDirty(true)}
              requiredMark={false}
            >
              {/* Business name + description */}
              <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 12 }}>
                Business information
              </Typography.Text>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="storeName" label="Store name" rules={[{ required: true }]}>
                    <Input placeholder="My Awesome Store" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                    <Select options={statusOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item name="description" label="Store description">
                    <Input.TextArea rows={2} placeholder="Brief description of your store" />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: "8px 0 16px" }} />

              {/* Contact */}
              <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 12 }}>
                Contact information
              </Typography.Text>
              <Row gutter={12}>
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
              </Row>

              <Divider style={{ margin: "8px 0 16px" }} />

              {/* Address */}
              <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 12 }}>
                Store address
              </Typography.Text>
              <Form.Item name="address" label="Address">
                <Input placeholder="Street address" />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} md={8}>
                  <Form.Item name="city" label="City">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="province" label="Province / State">
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="postalCode" label="Postal code">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>

              <Divider style={{ margin: "8px 0 16px" }} />

              {/* Locale & preferences */}
              <Typography.Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase", fontWeight: 600, display: "block", marginBottom: 12 }}>
                Store defaults
              </Typography.Text>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="currencyCode" label="Currency" rules={[{ required: true }]}>
                    <Select options={currencyOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="country" label="Country" rules={[{ required: true }]}>
                    <Select options={countryOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="timezone" label="Timezone" rules={[{ required: true }]}>
                    <Select options={timezoneOptions} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="locale" label="Language" rules={[{ required: true }]}>
                    <Select options={localeOptions} />
                  </Form.Item>
                </Col>
              </Row>

              <Button
                type="primary"
                htmlType="submit"
                loading={isSavingSettings}
                disabled={!isSettingsDirty}
                icon={<SaveOutlined />}
              >
                Save settings
              </Button>
            </Form>
          </Card>

          {/* Branding card */}
          <Card
            title={
              <Space>
                <GlobalOutlined />
                Brand & appearance
              </Space>
            }
            extra={
              isBrandingDirty && (
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  size="small"
                  loading={isSavingBranding}
                  onClick={() => brandingForm.submit()}
                >
                  Save
                </Button>
              )
            }
          >
            {brandingNotice?.message && (
              <Alert
                type={brandingNotice.type}
                message={brandingNotice.message}
                showIcon
                style={{ marginBottom: 16 }}
                closable
                onClose={() => setBrandingNotice(null)}
              />
            )}

            <Form
              form={brandingForm}
              layout="vertical"
              onFinish={onSaveBranding}
              onValuesChange={() => setIsBrandingDirty(true)}
              requiredMark={false}
            >
              <Form.Item name="logoUrl" label="Logo URL">
                <Input placeholder="https://..." />
              </Form.Item>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="primaryColor" label="Primary color">
                    <Space.Compact style={{ width: "100%" }}>
                      <Form.Item name="primaryColor" noStyle>
                        <Input placeholder="#006c9c" />
                      </Form.Item>
                      <Form.Item shouldUpdate noStyle>
                        {() => (
                          <div
                            style={{
                              width: 36,
                              background: brandingForm.getFieldValue("primaryColor") || "#006c9c",
                              border: "1px solid #d9d9d9",
                              borderLeft: "none",
                              borderRadius: "0 6px 6px 0",
                            }}
                          />
                        )}
                      </Form.Item>
                    </Space.Compact>
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
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
                icon={<SaveOutlined />}
              >
                Save branding
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Right sidebar */}
        <Col xs={24} lg={8}>
          {/* Store overview */}
          <Card style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 10,
                  background: brandingPreview.primaryColor,
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {profile.storeName?.[0]?.toUpperCase()}
              </div>
              <div>
                <Typography.Text strong style={{ display: "block" }}>
                  {profile.storeName}
                </Typography.Text>
                <Tag color={profile.status === "active" ? "success" : "default"} style={{ fontSize: 12 }}>
                  {profile.status || "draft"}
                </Tag>
              </div>
            </div>
            {profile.description && (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {profile.description}
              </Typography.Text>
            )}
          </Card>

          {/* Brand preview */}
          <Card title="Branding preview" style={{ marginBottom: 12 }}>
            <div
              style={{
                border: `2px solid ${brandingPreview.accentColor}`,
                borderRadius: 10,
                padding: 16,
              }}
            >
              {brandingPreview.logoUrl ? (
                <img
                  src={brandingPreview.logoUrl}
                  alt="Store logo"
                  style={{ width: 44, height: 44, borderRadius: 8, objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 8,
                    background: brandingPreview.primaryColor,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 18,
                  }}
                >
                  {profile.storeName?.[0]?.toUpperCase()}
                </div>
              )}
              <Typography.Title
                level={5}
                style={{ margin: "10px 0 4px", color: brandingPreview.primaryColor, fontFamily: brandingPreview.headingFont }}
              >
                {profile.storeName}
              </Typography.Title>
              <Typography.Text style={{ fontSize: 13, fontFamily: brandingPreview.bodyFont, color: "#666" }}>
                {profile.description || "Your store description"}
              </Typography.Text>
            </div>
          </Card>

          {/* Templates list */}
          <Card title="Themes" extra={<Button size="small" onClick={() => navigate("/store/website-builder")}>Manage</Button>}>
            {templates.length === 0 ? (
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                No themes yet. Default branding is active.
              </Typography.Text>
            ) : (
              <List
                size="small"
                dataSource={templates}
                renderItem={(item) => (
                  <List.Item
                    key={item.id}
                    extra={item.active ? <Tag color="success">Active</Tag> : null}
                  >
                    <Typography.Text style={{ fontSize: 13 }}>{item.name}</Typography.Text>
                  </List.Item>
                )}
              />
            )}
            <div style={{ marginTop: 12 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Active theme: {activeTemplateName}
              </Typography.Text>
            </div>
          </Card>
        </Col>
      </Row>
    </section>
  );
}
