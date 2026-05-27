import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showSwitchDialog, setShowSwitchDialog] = useState(false);
  const [pendingSwitchId, setPendingSwitchId] = useState(null);
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
        toast.success("Store unpublished");
      } else {
        setShowPublishModal(false);
        setShowCelebration(true);
      }
    } catch (err) {
      toast.error(err.message || "Failed to update publish status");
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
    setShowResetDialog(true);
  }

  function confirmReset() {
    resetConfig();
    setChangeCount(0);
    setShowResetDialog(false);
  }

  function handleUseTemplate(id) {
    if (id === state.selectedTemplateId) {
      setView("editor");
      return;
    }
    setPendingSwitchId(id);
    setShowSwitchDialog(true);
  }

  function confirmSwitch() {
    if (pendingSwitchId) {
      selectTemplate(pendingSwitchId);
      setChangeCount(0);
      setView("editor");
    }
    setShowSwitchDialog(false);
    setPendingSwitchId(null);
  }

  function handleSwitchTemplateFromPanel(id) {
    if (id === state.selectedTemplateId) return;
    setPendingSwitchId(id);
    setShowSwitchDialog(true);
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
          <span style={{ fontSize: 13 }}>
            Your store is live at{" "}
            <a
              href={`https://${subdomain}.skye.id`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              {subdomain}.skye.id
            </a>
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
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

      {showResetDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          onClick={() => setShowResetDialog(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Reset customizations?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              This will restore all text, colors, and images to their template
              defaults.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="builder-modal-btn builder-modal-btn--secondary"
                style={{ flex: "initial", padding: "0 16px", height: 36 }}
                onClick={() => setShowResetDialog(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="builder-modal-btn builder-modal-btn--primary"
                style={{
                  flex: "initial",
                  padding: "0 16px",
                  height: 36,
                  background: "#dc2626",
                }}
                onClick={confirmReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {showSwitchDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          onClick={() => setShowSwitchDialog(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Switch template?</h3>
            <p className="text-sm text-muted-foreground mb-5">
              Switching resets your text and image customisations. Catalog
              settings are kept.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="builder-modal-btn builder-modal-btn--secondary"
                style={{ flex: "initial", padding: "0 16px", height: 36 }}
                onClick={() => setShowSwitchDialog(false)}
              >
                Keep current
              </button>
              <button
                type="button"
                className="builder-modal-btn builder-modal-btn--primary"
                style={{
                  flex: "initial",
                  padding: "0 16px",
                  height: 36,
                  background: "#dc2626",
                }}
                onClick={confirmSwitch}
              >
                Switch template
              </button>
            </div>
          </div>
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
