import {
  DesktopOutlined,
  ExpandOutlined,
  MobileOutlined,
} from "@ant-design/icons";
import { Radio, Spin, Tooltip, Typography } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

const DEVICE_WIDTHS = {
  desktop: 1280,
  mobile: 375,
};

export default function PreviewCanvas({
  viewMode,
  onViewModeChange,
  activeTemplate,
  config,
  storeName,
  products,
  isLoading,
}) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  const computeScale = useCallback(() => {
    if (!wrapperRef.current) return;
    const wrapperWidth = wrapperRef.current.clientWidth - 48; // padding
    const targetWidth = DEVICE_WIDTHS[viewMode];
    const newScale = Math.min(1, wrapperWidth / targetWidth);
    setScale(newScale);
  }, [viewMode]);

  useEffect(() => {
    computeScale();
    const resizeObserver = new ResizeObserver(computeScale);
    if (wrapperRef.current) {
      resizeObserver.observe(wrapperRef.current);
    }
    return () => resizeObserver.disconnect();
  }, [computeScale]);

  const TemplateComponent = activeTemplate?.component;
  const deviceWidth = DEVICE_WIDTHS[viewMode];

  return (
    <div className="wb-preview-panel" ref={wrapperRef}>
      {/* ── Top toolbar ── */}
      <div className="wb-preview-toolbar">
        <Radio.Group
          value={viewMode}
          onChange={(e) => onViewModeChange(e.target.value)}
          size="small"
          optionType="button"
          buttonStyle="solid"
        >
          <Tooltip title="Desktop view (1280px)">
            <Radio.Button value="desktop">
              <DesktopOutlined /> Desktop
            </Radio.Button>
          </Tooltip>
          <Tooltip title="Mobile view (375px)">
            <Radio.Button value="mobile">
              <MobileOutlined /> Mobile
            </Radio.Button>
          </Tooltip>
        </Radio.Group>

        <div className="wb-preview-meta">
          <Typography.Text type="secondary" className="wb-preview-dim">
            {deviceWidth}px &middot; {Math.round(scale * 100)}%
          </Typography.Text>
          <Tooltip title="Fit to window">
            <button
              type="button"
              className="wb-preview-fit-btn"
              onClick={computeScale}
            >
              <ExpandOutlined />
            </button>
          </Tooltip>
        </div>
      </div>

      {/* ── Viewport ── */}
      <div className="wb-preview-viewport-wrapper">
        <div
          className={`wb-preview-viewport ${viewMode === "mobile" ? "wb-preview-viewport--mobile" : ""}`}
          style={{
            width: deviceWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {isLoading ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <Spin tip="Loading preview..." />
            </div>
          ) : TemplateComponent ? (
            <TemplateComponent
              config={config}
              storeName={storeName}
              products={products}
            />
          ) : (
            <div className="wb-preview-empty">
              <Typography.Text type="secondary">
                Select a template to preview
              </Typography.Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
