import { App, Modal, Spin, Typography } from "antd";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getCatalogOptions,
  getProductsForPreview,
  toggleStorePublish,
} from "../../services/api";
import BuilderGallery from "./BuilderGallery";
import BuilderPanel from "./BuilderPanel";
import { CelebrationModal, PublishModal } from "./BuilderPublishModals";
import BuilderRail from "./BuilderRail";
import BuilderStage from "./BuilderStage";
import BuilderTopbar from "./BuilderTopbar";
import { useTemplateBuilder } from "./useTemplateBuilder";
import "./WebsiteBuilderPage.css";

export default function WebsiteBuilderPage() {
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

  const [view, setView] = useState("gallery");
  const [activePanel, setActivePanel] = useState(null);
  const [isPublished, setIsPublished] = useState(false);
  const [subdomain, setSubdomain] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [catalogOptions, setCatalogOptions] = useState([]);
  const [previewProducts, setPreviewProducts] = useState([]);
  const [changeCount, setChangeCount] = useState(0);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const hasAutoSwitched = useRef(false);
  const prevIsSaving = useRef(false);

  useEffect(() => {
    setIsPublished(store?.isPublished ?? false);
    setSubdomain(store?.subdomain ?? null);
  }, [store]);

  useEffect(() => {
    if (!isLoading && activeTemplate && !hasAutoSwitched.current) {
      hasAutoSwitched.current = true;
      setView("editor");
    }
  }, [isLoading, activeTemplate]);

  useEffect(() => {
    if (prevIsSaving.current && !isSaving) {
      setChangeCount(0);
    }
    prevIsSaving.current = isSaving;
  }, [isSaving]);

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

  function trackChange() {
    setChangeCount((c) => c + 1);
  }

  function handleUpdateText(key, value) {
    updateText(key, value);
    trackChange();
  }

  function handleUpdateColor(key, value) {
    updateColor(key, value);
    trackChange();
  }

  function handleUpdateImage(key, url) {
    updateImage(key, url);
    trackChange();
  }

  function handleUpdateCatalog(patch) {
    updateCatalog(patch);
    trackChange();
  }

  function handlePublishToggle() {
    if (isPublished) {
      void runPublishToggle();
    } else {
      setShowPublishModal(true);
    }
  }

  async function runPublishToggle() {
    setIsPublishing(true);
    try {
      const wasPublished = isPublished;
      const result = await toggleStorePublish(!isPublished);
      setIsPublished((prev) => !prev);
      setSubdomain(result.subdomain);
      await refreshSession();
      if (wasPublished) {
        message.success("Store unpublished.");
      } else {
        setShowPublishModal(false);
        setShowCelebration(true);
      }
    } catch (err) {
      message.error(err.message || "Failed to update publish status.");
    } finally {
      setIsPublishing(false);
    }
  }

  function handlePreview() {
    const slug = store?.handle;
    if (slug)
      window.open(`/preview?store=${slug}`, "_blank", "noopener,noreferrer");
  }

  function handleReset() {
    Modal.confirm({
      title: "Reset customizations?",
      content:
        "This will restore all text, colors, and images to their template defaults.",
      okText: "Reset",
      okButtonProps: { danger: true },
      onOk: () => {
        resetConfig();
        setChangeCount(0);
      },
    });
  }

  function handleUseTemplate(id) {
    if (id === state.selectedTemplateId) {
      setView("editor");
      return;
    }
    Modal.confirm({
      title: "Switch template?",
      content:
        "Switching resets your text and image customisations. Catalog settings are kept.",
      okText: "Switch template",
      cancelText: "Keep current",
      okButtonProps: { danger: true },
      onOk: () => {
        selectTemplate(id);
        setChangeCount(0);
        setView("editor");
      },
    });
  }

  function handleSwitchTemplateFromPanel(id) {
    if (id === state.selectedTemplateId) return;
    Modal.confirm({
      title: "Switch template?",
      content:
        "Switching resets your text and image customisations. Catalog settings are kept.",
      okText: "Switch template",
      cancelText: "Keep current",
      okButtonProps: { danger: true },
      onOk: () => {
        selectTemplate(id);
        setChangeCount(0);
      },
    });
  }

  function handleEditSection(key) {
    setActivePanel((prev) => (prev === key ? null : key));
  }

  function handleOpenTheme() {
    setActivePanel((prev) => (prev === "theme" ? null : "theme"));
  }

  return (
    <div className="builder-shell">
      <BuilderTopbar
        view={view}
        templateName={activeTemplate?.name ?? ""}
        isPublished={isPublished}
        isSaving={isSaving}
        isPublishing={isPublishing}
        changeCount={changeCount}
        viewMode={state.viewMode}
        onViewModeChange={setViewMode}
        onNavigateToGallery={() => {
          setActivePanel(null);
          setView("gallery");
        }}
        onPreview={handlePreview}
        onReset={handleReset}
        onPublishToggle={handlePublishToggle}
        onOpenTheme={handleOpenTheme}
      />

      {isPublished && subdomain && (
        <div className="builder-live-banner">
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
      )}

      {isLoading ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Spin tip="Loading your store…" />
        </div>
      ) : view === "gallery" ? (
        <BuilderGallery
          selectedId={state.selectedTemplateId}
          onUseTemplate={handleUseTemplate}
        />
      ) : (
        <div className="builder-editor">
          <BuilderRail
            activePanel={activePanel}
            onEditSection={handleEditSection}
          />

          <BuilderStage
            viewMode={state.viewMode}
            activeTemplate={activeTemplate}
            config={state.config}
            storeName={store?.name ?? "My Store"}
            products={previewProducts}
            subdomain={subdomain}
          />

          <BuilderPanel
            activePanel={activePanel}
            config={state.config}
            catalogOptions={catalogOptions}
            storeName={store?.name ?? ""}
            subdomain={subdomain}
            activeTemplateId={state.selectedTemplateId}
            onClose={() => setActivePanel(null)}
            onSwitchTemplate={handleSwitchTemplateFromPanel}
            onUpdateText={handleUpdateText}
            onUpdateColor={handleUpdateColor}
            onUpdateImage={handleUpdateImage}
            onUpdateCatalog={handleUpdateCatalog}
          />
        </div>
      )}

      <PublishModal
        open={showPublishModal}
        isPublishing={isPublishing}
        storeName={store?.name ?? ""}
        subdomain={subdomain}
        onConfirm={runPublishToggle}
        onClose={() => setShowPublishModal(false)}
      />

      <CelebrationModal
        open={showCelebration}
        storeName={store?.name ?? ""}
        subdomain={subdomain}
        onClose={() => setShowCelebration(false)}
      />
    </div>
  );
}
