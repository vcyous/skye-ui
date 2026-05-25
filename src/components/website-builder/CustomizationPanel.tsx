// @ts-nocheck
import { BgColorsOutlined, FontColorsOutlined } from "@ant-design/icons";
import { Collapse, ColorPicker, Input, Typography } from "antd";

/**
 * Converts a camelCase key to a human-readable Title Case label.
 * e.g. "heroTitle" → "Hero Title", "ctaButton" → "Cta Button"
 */
function camelToLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/**
 * Customization panel — accordion with text and color editing sections.
 *
 * @param {{
 *   config: { texts: Record<string, string>, colors: Record<string, string> },
 *   onUpdateText: (key: string, value: string) => void,
 *   onUpdateColor: (key: string, value: string) => void,
 * }} props
 */
export default function CustomizationPanel({
  config,
  onUpdateText,
  onUpdateColor,
}) {
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
          <span className="wb-collapse-count">{colorEntries.length} colors</span>
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