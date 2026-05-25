import {
  AppstoreOutlined,
  BgColorsOutlined,
  FontColorsOutlined,
  PictureOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import {
  App,
  Button,
  Collapse,
  ColorPicker,
  Image,
  Input,
  Select,
  Space,
  Spin,
  Typography,
  Upload,
} from "antd";
import { useState } from "react";
import type { CatalogConfig, CatalogOption } from "../../services/api";
import { uploadStoreAsset } from "../../services/api";

/**
 * Converts a camelCase key to a human-readable Title Case label.
 * e.g. "heroTitle" → "Hero Title", "ctaButton" → "Cta Button"
 */
function camelToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

interface Props {
  config: {
    texts: Record<string, string>;
    colors: Record<string, string>;
    images: Record<string, string>;
    catalog: CatalogConfig;
  };
  catalogOptions: CatalogOption[];
  onUpdateText: (key: string, value: string) => void;
  onUpdateColor: (key: string, value: string) => void;
  onUpdateImage: (key: string, url: string) => void;
  onUpdateCatalog: (patch: Partial<CatalogConfig>) => void;
}

function ImageUploadButton({
  assetKey,
  label,
  onUploaded,
}: {
  assetKey: string;
  label: string;
  onUploaded: (url: string) => void;
}) {
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const url = await uploadStoreAsset(file, assetKey);
      onUploaded(url);
    } catch (err: any) {
      message.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
    return false; // prevent antd's default XHR upload
  }

  return (
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
        {uploading ? "Uploading..." : label}
      </Button>
    </Upload>
  );
}

export default function CustomizationPanel({
  config,
  catalogOptions,
  onUpdateText,
  onUpdateColor,
  onUpdateImage,
  onUpdateCatalog,
}: Props) {
  const textEntries = Object.entries(config.texts);
  const colorEntries = Object.entries(config.colors);

  const items = [
    {
      key: "texts",
      label: (
        <span className="wb-collapse-label">
          <FontColorsOutlined />
          <span>Text Content</span>
          <span className="wb-collapse-count">{textEntries.length} fields</span>
        </span>
      ),
      children: (
        <div className="wb-customization-fields">
          {textEntries.map(([key, value]) => (
            <div key={key} className="wb-field-group">
              <Typography.Text className="wb-field-label">
                {camelToLabel(key)}
              </Typography.Text>
              <Input
                size="middle"
                value={value}
                onChange={(e) => onUpdateText(key, e.target.value)}
                placeholder={camelToLabel(key)}
              />
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "colors",
      label: (
        <span className="wb-collapse-label">
          <BgColorsOutlined />
          <span>Theme Colors</span>
          <span className="wb-collapse-count">
            {colorEntries.length} colors
          </span>
        </span>
      ),
      children: (
        <div className="wb-customization-fields">
          {colorEntries.map(([key, value]) => (
            <div key={key} className="wb-color-field">
              <div className="wb-color-field-left">
                <ColorPicker
                  size="small"
                  value={value}
                  onChange={(_, hex) => onUpdateColor(key, hex)}
                  showText={false}
                />
                <Typography.Text className="wb-field-label">
                  {camelToLabel(key)}
                </Typography.Text>
              </div>
              <Typography.Text code className="wb-color-hex">
                {value}
              </Typography.Text>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "branding",
      label: (
        <span className="wb-collapse-label">
          <PictureOutlined />
          <span>Branding &amp; Media</span>
        </span>
      ),
      children: (
        <div className="wb-customization-fields">
          <div className="wb-field-group">
            <Typography.Text className="wb-field-label">
              Store Logo
            </Typography.Text>
            {config.images.logoUrl ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Image
                  src={config.images.logoUrl}
                  height={48}
                  style={{ objectFit: "contain", borderRadius: 4 }}
                  preview={false}
                />
                <ImageUploadButton
                  assetKey="logo"
                  label="Replace Logo"
                  onUploaded={(url) => onUpdateImage("logoUrl", url)}
                />
              </Space>
            ) : (
              <ImageUploadButton
                assetKey="logo"
                label="Upload Logo"
                onUploaded={(url) => onUpdateImage("logoUrl", url)}
              />
            )}
          </div>
          <div className="wb-field-group">
            <Typography.Text className="wb-field-label">
              Hero Banner Image
            </Typography.Text>
            {config.images.heroImageUrl ? (
              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                <Image
                  src={config.images.heroImageUrl}
                  height={80}
                  style={{ objectFit: "cover", borderRadius: 4, width: "100%" }}
                  preview={false}
                />
                <ImageUploadButton
                  assetKey="hero"
                  label="Replace Hero"
                  onUploaded={(url) => onUpdateImage("heroImageUrl", url)}
                />
              </Space>
            ) : (
              <ImageUploadButton
                assetKey="hero"
                label="Upload Hero Image"
                onUploaded={(url) => onUpdateImage("heroImageUrl", url)}
              />
            )}
          </div>
        </div>
      ),
    },
    {
      key: "catalog",
      label: (
        <span className="wb-collapse-label">
          <AppstoreOutlined />
          <span>Product Catalog</span>
        </span>
      ),
      children: (
        <div className="wb-customization-fields">
          <div className="wb-field-group">
            <Typography.Text className="wb-field-label">
              Featured Collection
            </Typography.Text>
            <Select
              style={{ width: "100%" }}
              value={config.catalog.collectionId ?? "__all__"}
              onChange={(val: string) =>
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
          <div className="wb-field-group">
            <Typography.Text className="wb-field-label">
              Products to show
            </Typography.Text>
            <Select
              style={{ width: "100%" }}
              value={config.catalog.displayCount}
              onChange={(val: number) => onUpdateCatalog({ displayCount: val })}
              options={[
                { value: 3, label: "3 products" },
                { value: 6, label: "6 products" },
                { value: 9, label: "9 products" },
              ]}
            />
          </div>
          <div className="wb-field-group">
            <Typography.Text className="wb-field-label">
              Grid layout
            </Typography.Text>
            <Select
              style={{ width: "100%" }}
              value={config.catalog.layout}
              onChange={(val: string) =>
                onUpdateCatalog({ layout: val as CatalogConfig["layout"] })
              }
              options={[
                { value: "grid-2", label: "2 columns" },
                { value: "grid-3", label: "3 columns" },
                { value: "grid-4", label: "4 columns" },
              ]}
            />
          </div>
        </div>
      ),
    },
  ];

  return (
    <Collapse
      defaultActiveKey={["texts", "colors"]}
      ghost
      items={items}
      className="wb-customization-collapse"
    />
  );
}
