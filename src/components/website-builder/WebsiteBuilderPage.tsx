import {
  ArrowLeftOutlined,
  EyeOutlined,
  UndoOutlined,
} from "@ant-design/icons";
import { App, Button, Modal, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { CatalogOption } from "../../services/api";
import {
  getCatalogOptions,
  getProductsForPreview,
  toggleStorePublish,
} from "../../services/api";
import type { PreviewProduct } from "../../types";
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
  const { message } = App.useApp();
  const { store, refreshSession } = useAuth();
  const {
    state,
    activeTemplate,
    isLoading,
    isSaving,
    selectTemplate,
    setViewMode,
    updateText,
    updateColor,
    updateImage,
    updateCatalog,
    resetConfig,
  } = useTemplateBuilder();

  const [isPublished, setIsPublished] = useState<boolean>(false);
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState<CatalogOption[]>([]);
  const [previewProducts, setPreviewProducts] = useState<PreviewProduct[]>([]);

  useEffect(() => {
    setIsPublished(store?.isPublished ?? false);
    setSubdomain(store?.subdomain ?? null);
  }, [store]);

  useEffect(() => {
    getCatalogOptions()
      .then(setCatalogOptions)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoading) return;
    getProductsForPreview(
      state.config.catalog?.collectionId ?? null,
      state.config.catalog?.displayCount ?? 6,
    )
      .then(setPreviewProducts)
      .catch(() => {});
  }, [
    state.config.catalog?.collectionId,
    state.config.catalog?.displayCount,
    isLoading,
  ]);

  async function handlePublishToggle() {
    setIsPublishing(true);
    try {
      const result = await toggleStorePublish(!isPublished);
      setIsPublished((prev) => !prev);
      setSubdomain(result.subdomain);
      await refreshSession();
      message.success(
        isPublished ? "Store unpublished." : "Store is now live!",
      );
    } catch (err: any) {
      message.error(err.message || "Failed to update publish status.");
    } finally {
      setIsPublishing(false);
    }
  }

  function handleSelectTemplate(newId: string) {
    if (newId === state.selectedTemplateId) return;
    Modal.confirm({
      title: "Switch template?",
      content:
        "Switching resets your text and image customisations. Catalog settings are kept.",
      okText: "Switch template",
      cancelText: "Keep current",
      okButtonProps: { danger: true },
      onOk: () => selectTemplate(newId),
    });
  }

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
            icon={<EyeOutlined />}
            onClick={() => {
              const slug = store?.handle;
              if (slug)
                window.open(
                  `/preview?store=${slug}`,
                  "_blank",
                  "noopener,noreferrer",
                );
            }}
            size="middle"
          >
            Preview
          </Button>
          <Button icon={<UndoOutlined />} onClick={resetConfig} size="middle">
            Reset
          </Button>
          <Typography.Text
            type="secondary"
            style={{ fontSize: 12, minWidth: 60, textAlign: "center" }}
          >
            {isSaving ? "Saving..." : "Saved"}
          </Typography.Text>
          <Button type="primary" size="middle">
            Save Template
          </Button>
          <Button
            type={isPublished ? "default" : "primary"}
            loading={isPublishing}
            onClick={handlePublishToggle}
          >
            {isPublished ? "Unpublish" : "Publish Store"}
          </Button>
        </div>
      </div>

      {/* —— Live URL Banner —— */}
      {isPublished && subdomain ? (
        <div
          style={{
            background: "#E8F3F1",
            padding: "8px 16px",
            borderBottom: "1px solid #A3C9C2",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Typography.Text style={{ fontSize: 13 }}>
            Your store is live at{" "}
            <Typography.Link
              href={`https://${subdomain}.skye.id`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {subdomain}.skye.id
            </Typography.Link>
          </Typography.Text>
        </div>
      ) : null}

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
              onSelect={handleSelectTemplate}
            />
          </section>

          <div className="wb-panel-divider" />

          <section className="wb-section">
            <Typography.Text strong className="wb-section-title">
              Customize
            </Typography.Text>
            <CustomizationPanel
              config={state.config}
              catalogOptions={catalogOptions}
              onUpdateText={updateText}
              onUpdateColor={updateColor}
              onUpdateImage={updateImage}
              onUpdateCatalog={updateCatalog}
            />
          </section>
        </aside>

        {/* Right Panel — Preview */}
        <main className="wb-right-panel">
          {isLoading ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <Spin tip="Loading your store..." />
            </div>
          ) : (
            <PreviewCanvas
              viewMode={state.viewMode}
              onViewModeChange={setViewMode}
              activeTemplate={activeTemplate}
              config={state.config}
              storeName={store?.name ?? "My Store"}
              products={previewProducts}
            />
          )}
        </main>
      </div>
    </div>
  );
}
