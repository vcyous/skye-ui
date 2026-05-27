import { Eye, Monitor, Settings, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BuilderTopbar({
  view,
  templateName,
  isPublished,
  isSaving,
  isPublishing,
  changeCount,
  viewMode,
  onViewModeChange,
  onNavigateToGallery,
  onPreview,
  onReset,
  onPublishToggle,
  onOpenTheme,
}) {
  return (
    <div className="builder-topbar">
      <div className="builder-topbar__brand">
        <div className="builder-topbar__mark" />
        <span className="builder-topbar__wordmark">skye</span>
      </div>

      <div className="builder-topbar__sep" />

      <div className="builder-topbar__crumbs">
        {view === "editor" ? (
          <>
            <button
              type="button"
              className="builder-topbar__crumb-link"
              onClick={onNavigateToGallery}
            >
              Templates
            </button>
            <span className="builder-topbar__crumb-sep">›</span>
            <strong>{templateName}</strong>
          </>
        ) : (
          <strong>Choose a template</strong>
        )}
      </div>

      <div className="builder-topbar__spacer" />

      {view === "editor" && (
        <div className="builder-device-toggle">
          <button
            type="button"
            className={viewMode === "desktop" ? "active" : ""}
            onClick={() => onViewModeChange("desktop")}
          >
            <Monitor className="size-3.5" /> Desktop
          </button>
          <button
            type="button"
            className={viewMode === "mobile" ? "active" : ""}
            onClick={() => onViewModeChange("mobile")}
          >
            <Smartphone className="size-3.5" /> Mobile
          </button>
        </div>
      )}

      <div className="builder-topbar__spacer" />

      <div className="builder-topbar__actions">
        <div
          className={`builder-draft-badge ${isPublished ? "builder-draft-badge--live" : ""}`}
        >
          <span className="builder-draft-badge__dot" />
          {isPublished ? "Live" : "Draft"}
        </div>

        {view === "editor" && (
          <>
            {changeCount > 0 && (
              <span className="builder-topbar__change-count">
                · {changeCount} {changeCount === 1 ? "change" : "changes"}
              </span>
            )}
            <span className="builder-topbar__save-status">
              {isSaving ? "Saving…" : "Saved"}
            </span>
            <button
              type="button"
              className="builder-topbar__icon-btn"
              onClick={onOpenTheme}
              title="Look & feel"
            >
              <Settings className="size-3.5" />
            </button>
            <Button size="sm" variant="outline" onClick={onPreview}>
              <Eye className="size-3.5" />
              Preview
            </Button>
            <Button size="sm" variant="outline" onClick={onReset}>
              Reset
            </Button>
          </>
        )}

        <button
          type="button"
          className={`builder-topbar__publish-btn ${isPublished ? "builder-topbar__publish-btn--live" : ""}`}
          disabled={isPublishing}
          onClick={onPublishToggle}
        >
          {isPublishing ? "…" : isPublished ? "Unpublish" : "Publish"}
        </button>
      </div>
    </div>
  );
}
