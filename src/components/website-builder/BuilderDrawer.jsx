import { UploadOutlined } from "@ant-design/icons";
import {
  App,
  Button,
  ColorPicker,
  Drawer,
  Image,
  Input,
  Select,
  Spin,
  Typography,
  Upload,
} from "antd";
import { useState } from "react";
import { uploadStoreAsset } from "../../services/api";

function camelToLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function ImageUploadField({ assetKey, label, currentUrl, onUploaded }) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file) {
    setUploading(true);
    try {
      const url = await uploadStoreAsset(file, assetKey);
      onUploaded(url);
    } catch (err) {
      message.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
    return false;
  }

  return (
    <div className="builder-field">
      <div className="builder-field__label">{label}</div>
      {currentUrl && (
        <Image
          src={currentUrl}
          height={60}
          style={{
            objectFit: "contain",
            borderRadius: 4,
            marginBottom: 8,
            display: "block",
          }}
          preview={false}
        />
      )}
      <Upload
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        showUploadList={false}
        beforeUpload={handleUpload}
        disabled={uploading}
      >
        <Button
          icon={uploading ? <Spin size="small" /> : <UploadOutlined />}
          size="small"
          disabled={uploading}
        >
          {uploading ? "Uploading..." : currentUrl ? "Replace" : "Upload"}
        </Button>
      </Upload>
    </div>
  );
}

const SECTION_TITLES = {
  hero: "Hero Section",
  content: "Featured Section",
  products: "Product Catalog",
  colors: "Colors & Style",
  branding: "Branding & Media",
};

function getHeroKeys(texts) {
  return Object.keys(texts).filter(
    (k) => k.toLowerCase().startsWith("hero") || k === "ctaButton",
  );
}

function getContentKeys(texts) {
  return Object.keys(texts).filter(
    (k) =>
      !k.toLowerCase().startsWith("hero") &&
      k !== "ctaButton" &&
      (k.toLowerCase().includes("heading") ||
        k.toLowerCase().includes("quote") ||
        k.toLowerCase().includes("newsletter") ||
        k.toLowerCase().includes("collection")),
  );
}

export default function BuilderDrawer({
  open,
  sectionKey,
  config,
  catalogOptions,
  onClose,
  onUpdateText,
  onUpdateColor,
  onUpdateImage,
  onUpdateCatalog,
}) {
  const title = sectionKey ? (SECTION_TITLES[sectionKey] ?? sectionKey) : "";

  function renderContent() {
    if (!sectionKey) return null;

    if (sectionKey === "hero") {
      const keys = getHeroKeys(config.texts);
      return (
        <div className="builder-drawer-fields">
          {keys.map((key) => (
            <div key={key} className="builder-field">
              <div className="builder-field__label">{camelToLabel(key)}</div>
              <Input
                value={config.texts[key]}
                onChange={(e) => onUpdateText(key, e.target.value)}
                placeholder={camelToLabel(key)}
              />
            </div>
          ))}
        </div>
      );
    }

    if (sectionKey === "content") {
      const keys = getContentKeys(config.texts);
      if (keys.length === 0) {
        return (
          <Typography.Text type="secondary">
            No content fields for this template.
          </Typography.Text>
        );
      }
      return (
        <div className="builder-drawer-fields">
          {keys.map((key) => (
            <div key={key} className="builder-field">
              <div className="builder-field__label">{camelToLabel(key)}</div>
              <Input
                value={config.texts[key]}
                onChange={(e) => onUpdateText(key, e.target.value)}
                placeholder={camelToLabel(key)}
              />
            </div>
          ))}
        </div>
      );
    }

    if (sectionKey === "products") {
      return (
        <div className="builder-drawer-fields">
          <div className="builder-field">
            <div className="builder-field__label">Featured Collection</div>
            <Select
              style={{ width: "100%" }}
              value={config.catalog.collectionId ?? "__all__"}
              onChange={(val) =>
                onUpdateCatalog({
                  collectionId: val === "__all__" ? null : val,
                })
              }
              options={[
                { value: "__all__", label: "All products (latest)" },
                ...catalogOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                })),
              ]}
              placeholder="Select a collection..."
            />
          </div>
          <div className="builder-field">
            <div className="builder-field__label">Products to show</div>
            <Select
              style={{ width: "100%" }}
              value={config.catalog.displayCount}
              onChange={(val) => onUpdateCatalog({ displayCount: val })}
              options={[
                { value: 3, label: "3 products" },
                { value: 6, label: "6 products" },
                { value: 9, label: "9 products" },
              ]}
            />
          </div>
          <div className="builder-field">
            <div className="builder-field__label">Grid layout</div>
            <Select
              style={{ width: "100%" }}
              value={config.catalog.layout}
              onChange={(val) => onUpdateCatalog({ layout: val })}
              options={[
                { value: "grid-2", label: "2 columns" },
                { value: "grid-3", label: "3 columns" },
                { value: "grid-4", label: "4 columns" },
              ]}
            />
          </div>
        </div>
      );
    }

    if (sectionKey === "colors") {
      return (
        <div className="builder-drawer-fields">
          {Object.entries(config.colors).map(([key, value]) => (
            <div key={key} className="builder-color-field">
              <div className="builder-color-field__left">
                <ColorPicker
                  size="small"
                  value={value}
                  onChange={(_, hex) => onUpdateColor(key, hex)}
                  showText={false}
                />

                <span className="builder-color-field__label">
                  {camelToLabel(key)}
                </span>
              </div>
              <code className="builder-color-field__hex">{value}</code>
            </div>
          ))}
        </div>
      );
    }

    if (sectionKey === "branding") {
      return (
        <div className="builder-drawer-fields">
          <ImageUploadField
            assetKey="logo"
            label="Store Logo"
            currentUrl={config.images.logoUrl || ""}
            onUploaded={(url) => onUpdateImage("logoUrl", url)}
          />

          <ImageUploadField
            assetKey="hero"
            label="Hero Banner Image"
            currentUrl={config.images.heroImageUrl || ""}
            onUploaded={(url) => onUpdateImage("heroImageUrl", url)}
          />
        </div>
      );
    }

    return null;
  }

  return (
    <Drawer
      title={title}
      placement="right"
      width={400}
      open={open}
      onClose={onClose}
      styles={{ body: { padding: 20 } }}
    >
      {renderContent()}
    </Drawer>
  );
}
