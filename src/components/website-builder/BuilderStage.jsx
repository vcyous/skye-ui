import { LockOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { useCallback, useEffect, useRef, useState } from "react";

const DEVICE_WIDTHS = { desktop: 1280, mobile: 375 };

export default function BuilderStage({
  viewMode,
  activeTemplate,
  config,
  storeName,
  products,
  isLoading,
  subdomain,
}) {
  const wrapperRef = useRef(null);
  const [scale, setScale] = useState(1);

  const computeScale = useCallback(() => {
    if (!wrapperRef.current) return;
    const available = wrapperRef.current.clientWidth - 48;
    const target = DEVICE_WIDTHS[viewMode];
    setScale(Math.min(1, available / target));
  }, [viewMode]);

  useEffect(() => {
    computeScale();
    const ro = new ResizeObserver(computeScale);
    if (wrapperRef.current) ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [computeScale]);

  const TemplateComponent = activeTemplate?.component;
  const deviceWidth = DEVICE_WIDTHS[viewMode];
  const displayUrl = subdomain ? `${subdomain}.skye.id` : "yourstore.skye.id";

  return (
    <div className="builder-stage">
      <div className="builder-url-bar">
        <LockOutlined style={{ fontSize: 11, opacity: 0.5 }} />
        <span className="builder-url-bar__text">{displayUrl}</span>
        <span className="builder-url-bar__dim">
          &middot; {deviceWidth}px &middot; {Math.round(scale * 100)}%
        </span>
      </div>

      <div className="builder-stage__viewport" ref={wrapperRef}>
        <div
          className={`builder-canvas${viewMode === "mobile" ? " builder-canvas--mobile" : ""}`}
          style={{
            width: deviceWidth,
            transform: `scale(${scale})`,
            transformOrigin: "top center",
          }}
        >
          {isLoading ? (
            <div style={{ padding: 64, textAlign: "center" }}>
              <Spin tip="Loading preview..." />
            </div>
          ) : TemplateComponent ? (
            <TemplateComponent
              config={config}
              storeName={storeName}
              products={products}
            />
          ) : (
            <div className="builder-canvas__empty">
              Select a template to start editing
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
