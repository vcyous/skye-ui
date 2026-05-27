import { Loader2, Lock, Upload, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { uploadStoreAsset } from "../../services/api";
import { templateRegistry } from "./templateRegistry";

const TEXT_MAX = {
  heroEyebrow: 40,
  heroTitle: 90,
  heroSubtitle: 320,
  ctaButton: 28,
  heroSecondaryButton: 28,
  featuredHeading: 60,
  collectionHeading: 60,
  testimonialQuote: 220,
  newsletterHeading: 60,
};

const TEXT_LABELS = {
  heroEyebrow: "Eyebrow",
  heroTitle: "Heading",
  heroSubtitle: "Body",
  ctaButton: "Primary button",
  heroSecondaryButton: "Secondary button",
  featuredHeading: "Heading",
  collectionHeading: "Heading",
  testimonialQuote: "Quote",
  newsletterHeading: "Heading",
};

function camelToLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function PanelGroup({ title, children }) {
  return (
    <div className="builder-panel__group">
      <div className="builder-panel__group-title">{title}</div>
      {children}
    </div>
  );
}

function TextField({ label, value, maxLength, multiline, hint, onChange }) {
  return (
    <div className="builder-panel__field">
      <div className="builder-panel__field-header">
        <span className="builder-panel__field-label">{label}</span>
        <span className="builder-panel__field-count">
          {value.length}/{maxLength}
        </span>
      </div>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          className="min-h-[80px] resize-none"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
        />
      )}
      {hint && <div className="builder-panel__field-hint">{hint}</div>}
    </div>
  );
}

function ImageUploadField({ label, assetKey, currentUrl, onUploaded }) {
  const [uploading, setUploading] = useState(false);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadStoreAsset(file, assetKey);
      onUploaded(url);
    } catch (err) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="builder-panel__field">
      <div className="builder-panel__field-label">{label}</div>
      {currentUrl && (
        <img
          src={currentUrl}
          alt={label}
          className="builder-panel__img-preview"
        />
      )}
      <label className="inline-block">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="sr-only"
          disabled={uploading}
          onChange={handleFileChange}
        />
        <Button
          size="sm"
          variant="outline"
          type="button"
          disabled={uploading}
          onClick={(e) => {
            e.preventDefault();
            e.currentTarget.closest("label")?.querySelector("input")?.click();
          }}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {uploading ? "Uploading…" : currentUrl ? "Replace" : "Upload"}
        </Button>
      </label>
    </div>
  );
}

function getContentKeys(texts) {
  return Object.keys(texts).filter(
    (k) =>
      !k.toLowerCase().startsWith("hero") &&
      k !== "ctaButton" &&
      !k.toLowerCase().includes("newsletter"),
  );
}

function getNewsletterKeys(texts) {
  return Object.keys(texts).filter((k) =>
    k.toLowerCase().includes("newsletter"),
  );
}

export default function BuilderPanel({
  activePanel,
  config,
  catalogOptions,
  storeName,
  subdomain,
  activeTemplateId,
  onClose,
  onSwitchTemplate,
  onUpdateText,
  onUpdateColor,
  onUpdateImage,
  onUpdateCatalog,
}) {
  if (!activePanel) return null;

  const isTheme = activePanel === "theme";
  const kicker = isTheme ? "THEME" : `SECTION · ${activePanel.toUpperCase()}`;
  const title = isTheme ? "Look & feel" : `Edit ${activePanel}`;

  function renderBody() {
    if (isTheme) return renderThemePanel();
    if (activePanel === "hero") return renderHeroPanel();
    if (activePanel === "content") return renderContentPanel();
    if (activePanel === "products") return renderProductsPanel();
    if (activePanel === "newsletter") return renderNewsletterPanel();
    if (activePanel === "footer") return renderFooterPanel();
    return null;
  }

  function renderThemePanel() {
    return (
      <>
        <PanelGroup title="STORE NAME">
          <div className="builder-panel__field">
            <div className="builder-panel__field-label">
              Store name (used everywhere)
            </div>
            <Input value={storeName} readOnly />
            {subdomain && (
              <div className="builder-panel__address-chip">
                {subdomain}.skye.id
              </div>
            )}
          </div>
        </PanelGroup>

        <PanelGroup title="TEMPLATE">
          <div
            className="builder-panel__field-hint"
            style={{ marginBottom: 12 }}
          >
            Changing this restyles every section. Your content stays.
          </div>
          <div className="builder-panel__template-grid">
            {templateRegistry.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`builder-panel__tthumb${t.id === activeTemplateId ? " active" : ""}`}
                onClick={() => onSwitchTemplate(t.id)}
              >
                <div
                  className="builder-panel__tthumb-img"
                  style={{
                    background: `linear-gradient(135deg, ${t.gradientFrom}, ${t.gradientTo})`,
                  }}
                >
                  <div className="builder-panel__tthumb-wire" />
                </div>
                <span className="builder-panel__tthumb-name">{t.name}</span>
              </button>
            ))}
          </div>
        </PanelGroup>

        <PanelGroup title="COLORS">
          {Object.entries(config.colors).map(([key, value]) => (
            <div key={key} className="builder-panel__color-row">
              <input
                type="color"
                className="h-6 w-6 cursor-pointer rounded border-0 p-0 shrink-0"
                value={value}
                onChange={(e) => onUpdateColor(key, e.target.value)}
              />
              <span className="builder-panel__color-label">
                {camelToLabel(key)}
              </span>
              <code className="builder-panel__color-hex">{value}</code>
            </div>
          ))}
        </PanelGroup>

        <PanelGroup title="BRANDING">
          <ImageUploadField
            label="Store Logo"
            assetKey="logo"
            currentUrl={config.images.logoUrl || ""}
            onUploaded={(url) => onUpdateImage("logoUrl", url)}
          />
          <ImageUploadField
            label="Hero Banner Image"
            assetKey="hero"
            currentUrl={config.images.heroImageUrl || ""}
            onUploaded={(url) => onUpdateImage("heroImageUrl", url)}
          />
        </PanelGroup>

        <PanelGroup title="LOCKED BY SKYE">
          {[
            {
              icon: "T",
              label: "Typography",
              hint: "Sora — picked for legibility on every screen.",
            },
            {
              icon: "◑",
              label: "Color rules",
              hint: "Accent + Ink combinations tested for contrast.",
            },
            {
              icon: "⊞",
              label: "Section layouts",
              hint: "Spacing and grid stay consistent across all pages.",
            },
          ].map((item) => (
            <div key={item.label} className="builder-panel__locked-row">
              <span className="builder-panel__locked-icon">{item.icon}</span>
              <div className="builder-panel__locked-text">
                <div className="builder-panel__locked-label">{item.label}</div>
                <div className="builder-panel__locked-hint">{item.hint}</div>
              </div>
              <Lock className="builder-panel__locked-padlock size-3" />
            </div>
          ))}
        </PanelGroup>
      </>
    );
  }

  function renderHeroPanel() {
    return (
      <>
        <PanelGroup title="LAYOUT">
          <div className="builder-panel__field">
            <div className="builder-panel__field-label">Hero layout</div>
            <div className="flex rounded-md border overflow-hidden">
              {["split", "centered"].map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className={`flex-1 py-1.5 text-xs font-medium capitalize transition-colors ${
                    (config.texts.heroLayout || "split") === opt
                      ? "bg-foreground text-background"
                      : "bg-card text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => onUpdateText("heroLayout", opt)}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </PanelGroup>

        <PanelGroup title="TEXT">
          <TextField
            label="Eyebrow"
            value={config.texts.heroEyebrow || ""}
            maxLength={TEXT_MAX.heroEyebrow}
            onChange={(v) => onUpdateText("heroEyebrow", v)}
          />
          <TextField
            label="Heading"
            value={config.texts.heroTitle || ""}
            maxLength={TEXT_MAX.heroTitle}
            onChange={(v) => onUpdateText("heroTitle", v)}
          />
          <TextField
            label="Body"
            value={config.texts.heroSubtitle || ""}
            maxLength={TEXT_MAX.heroSubtitle}
            multiline
            onChange={(v) => onUpdateText("heroSubtitle", v)}
          />
        </PanelGroup>

        <PanelGroup title="BUTTONS">
          <TextField
            label="Primary button"
            value={config.texts.ctaButton || ""}
            maxLength={TEXT_MAX.ctaButton}
            onChange={(v) => onUpdateText("ctaButton", v)}
          />
          <TextField
            label="Secondary button"
            value={config.texts.heroSecondaryButton || ""}
            maxLength={TEXT_MAX.heroSecondaryButton}
            hint="Leave blank to hide"
            onChange={(v) => onUpdateText("heroSecondaryButton", v)}
          />
        </PanelGroup>
      </>
    );
  }

  function renderContentPanel() {
    const keys = getContentKeys(config.texts);
    if (keys.length === 0) {
      return (
        <div className="builder-panel__empty">
          <p>No content fields for this template.</p>
        </div>
      );
    }
    return (
      <PanelGroup title="TEXT">
        {keys.map((key) => (
          <TextField
            key={key}
            label={TEXT_LABELS[key] ?? camelToLabel(key)}
            value={config.texts[key] || ""}
            maxLength={TEXT_MAX[key] ?? 100}
            multiline={key === "testimonialQuote"}
            onChange={(v) => onUpdateText(key, v)}
          />
        ))}
      </PanelGroup>
    );
  }

  function renderProductsPanel() {
    return (
      <PanelGroup title="CATALOG">
        <div className="builder-panel__field">
          <div className="builder-panel__field-label">Featured Collection</div>
          <Select
            value={config.catalog.collectionId ?? "__all__"}
            onValueChange={(val) =>
              onUpdateCatalog({
                collectionId: val === "__all__" ? null : val,
              })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All products (latest)</SelectItem>
              {catalogOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="builder-panel__field">
          <div className="builder-panel__field-label">Products to show</div>
          <Select
            value={String(config.catalog.displayCount)}
            onValueChange={(val) =>
              onUpdateCatalog({ displayCount: Number(val) })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 products</SelectItem>
              <SelectItem value="6">6 products</SelectItem>
              <SelectItem value="9">9 products</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="builder-panel__field">
          <div className="builder-panel__field-label">Grid layout</div>
          <Select
            value={config.catalog.layout}
            onValueChange={(val) => onUpdateCatalog({ layout: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid-2">2 columns</SelectItem>
              <SelectItem value="grid-3">3 columns</SelectItem>
              <SelectItem value="grid-4">4 columns</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PanelGroup>
    );
  }

  function renderNewsletterPanel() {
    const keys = getNewsletterKeys(config.texts);
    if (keys.length === 0) {
      return (
        <div className="builder-panel__empty">
          <p>This section isn't part of your current template.</p>
          <p className="builder-panel__empty-hint">
            Switch to a template that includes a newsletter section.
          </p>
        </div>
      );
    }
    return (
      <PanelGroup title="TEXT">
        {keys.map((key) => (
          <TextField
            key={key}
            label={TEXT_LABELS[key] ?? camelToLabel(key)}
            value={config.texts[key] || ""}
            maxLength={TEXT_MAX[key] ?? 80}
            onChange={(v) => onUpdateText(key, v)}
          />
        ))}
      </PanelGroup>
    );
  }

  function renderFooterPanel() {
    return (
      <div className="builder-panel__empty">
        <Lock className="size-5 mb-2 text-muted-foreground" />
        <p>The footer layout is managed by Skye to ensure consistency.</p>
      </div>
    );
  }

  return (
    <>
      <div className="builder-panel-backdrop" onClick={onClose} />
      <div className="builder-panel">
        <div className="builder-panel__header">
          <div>
            <div className="builder-panel__kicker">{kicker}</div>
            <div className="builder-panel__title">{title}</div>
          </div>
          <button
            type="button"
            className="builder-panel__close"
            onClick={onClose}
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="builder-panel__body">{renderBody()}</div>

        <div className="builder-panel__footer">
          <span className="builder-panel__saved">✓ Saved automatically</span>
          <button
            type="button"
            className="builder-panel__done-btn"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </>
  );
}
