import { ArrowLeftOutlined, UndoOutlined } from "@ant-design/icons";
import { Button, Typography } from "antd";
import { useNavigate } from "react-router-dom";
import CustomizationPanel from "./CustomizationPanel.jsx";
import PreviewCanvas from "./PreviewCanvas.jsx";
import TemplateSelector from "./TemplateSelector.jsx";
import { useTemplateBuilder } from "./useTemplateBuilder.js";
import "./WebsiteBuilderPage.css";

/**
 * Website Template Builder — split-screen page.
 * Left panel: template selection + customization controls.
 * Right panel: responsive live preview.
 */
export default function WebsiteBuilderPage() {
  const navigate = useNavigate();
  const {
    state,
    activeTemplate,
    selectTemplate,
    setViewMode,
    updateText,
    updateColor,
    resetConfig,
  } = useTemplateBuilder();

  return (
    <div className="wb-root">
      {/* ── Top Action Bar ── */}
      <div className="wb-action-bar">
        <div className="wb-action-bar-left">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/store")}
            className="wb-back-btn"
          >
            Back
          </Button>
          <div className="wb-action-bar-divider" />
          <div>
            <Typography.Title level={4} className="wb-page-title">
              Website Builder
            </Typography.Title>
            <Typography.Text type="secondary" className="wb-page-subtitle">
              {activeTemplate
                ? `Editing: ${activeTemplate.name}`
                : "Select a template"}
            </Typography.Text>
          </div>
        </div>
        <div className="wb-action-bar-right">
          <Button
            icon={<UndoOutlined />}
            onClick={resetConfig}
            size="middle"
          >
            Reset
          </Button>
          <Button type="primary" size="middle">
            Save Template
          </Button>
        </div>
      </div>

      {/* ── Split Layout ── */}
      <div className="wb-split">
        {/* Left Panel — Controls */}
        <aside className="wb-left-panel">
          <section className="wb-section">
            <Typography.Text strong className="wb-section-title">
              Choose Template
            </Typography.Text>
            <TemplateSelector
              selectedId={state.selectedTemplateId}
              onSelect={selectTemplate}
            />
          </section>

          <div className="wb-panel-divider" />

          <section className="wb-section">
            <Typography.Text strong className="wb-section-title">
              Customize
            </Typography.Text>
            <CustomizationPanel
              config={state.config}
              onUpdateText={updateText}
              onUpdateColor={updateColor}
            />
          </section>
        </aside>

        {/* Right Panel — Preview */}
        <main className="wb-right-panel">
          <PreviewCanvas
            viewMode={state.viewMode}
            onViewModeChange={setViewMode}
            activeTemplate={activeTemplate}
            config={state.config}
          />
        </main>
      </div>
    </div>
  );
}
