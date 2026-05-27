import { Loader2, Upload } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { uploadStoreAsset } from "../../services/api";

function camelToLabel(key) {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

function ImageUploadField({ assetKey, label, currentUrl, onUploaded }) {
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
    <div className="builder-field">
      <div className="builder-field__label">{label}</div>
      {currentUrl && (
        <img
          src={currentUrl}
          alt={label}
          style={{
            height: 60,
            objectFit: "contain",
            borderRadius: 4,
            marginBottom: 8,
            display: "block",
          }}
        />
      )}
      <label>
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
          disabled={uploading}
          asChild={false}
          onClick={(e) => e.currentTarget.previousSibling?.click()}
          type="button"
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" />
          )}
          {uploading ? "Uploading..." : currentUrl ? "Replace" : "Upload"}
        </Button>
      </label>
    </div>
  );
}

const SECTION_TITLES = {
  hero: "Hero Section",
  content: "Featured Section",
  products: "Product Catalog",
  colors: "Colors & Style",
  branding: "Branding & Media",
};

function getHeroKeys(texts) {
  return Object.keys(texts).filter(
    (k) => k.toLowerCase().startsWith("hero") || k === "ctaButton",
  );
}

function getContentKeys(texts) {
  return Object.keys(texts).filter(
    (k) =>
      !k.toLowerCase().startsWith("hero") &&
      k !== "ctaButton" &&
      (k.toLowerCase().includes("heading") ||
        k.toLowerCase().includes("quote") ||
        k.toLowerCase().includes("newsletter") ||
        k.toLowerCase().includes("collection")),
  );
}

export default function BuilderDrawer({
  open,
  sectionKey,
  config,
  catalogOptions,
  onClose,
  onUpdateText,
  onUpdateColor,
  onUpdateImage,
  onUpdateCatalog,
}) {
  const title = sectionKey ? (SECTION_TITLES[sectionKey] ?? sectionKey) : "";

  function renderContent() {
    if (!sectionKey) return null;

    if (sectionKey === "hero") {
      const keys = getHeroKeys(config.texts);
      return (
        <div className="flex flex-col gap-3 p-4">
          {keys.map((key) => (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {camelToLabel(key)}
              </span>
              <Input
                value={config.texts[key]}
                onChange={(e) => onUpdateText(key, e.target.value)}
                placeholder={camelToLabel(key)}
              />
            </div>
          ))}
        </div>
      );
    }

    if (sectionKey === "content") {
      const keys = getContentKeys(config.texts);
      if (keys.length === 0) {
        return (
          <div className="p-4 text-sm text-muted-foreground">
            No content fields for this template.
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-3 p-4">
          {keys.map((key) => (
            <div key={key} className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {camelToLabel(key)}
              </span>
              <Input
                value={config.texts[key]}
                onChange={(e) => onUpdateText(key, e.target.value)}
                placeholder={camelToLabel(key)}
              />
            </div>
          ))}
        </div>
      );
    }

    if (sectionKey === "products") {
      return (
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Featured Collection
            </span>
            <Select
              value={config.catalog.collectionId ?? "__all__"}
              onValueChange={(val) =>
                onUpdateCatalog({
                  collectionId: val === "__all__" ? null : val,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a collection..." />
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
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Products to show
            </span>
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
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Grid layout
            </span>
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
        </div>
      );
    }

    if (sectionKey === "colors") {
      return (
        <div className="flex flex-col gap-2 p-4">
          {Object.entries(config.colors).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center gap-2.5 rounded-md border bg-card px-2.5 py-2"
            >
              <input
                type="color"
                className="h-7 w-7 cursor-pointer rounded border-0 p-0"
                value={value}
                onChange={(e) => onUpdateColor(key, e.target.value)}
              />
              <span className="flex-1 text-xs text-foreground">
                {camelToLabel(key)}
              </span>
              <code className="font-mono text-[10px] text-muted-foreground">
                {value}
              </code>
            </div>
          ))}
        </div>
      );
    }

    if (sectionKey === "branding") {
      return (
        <div className="flex flex-col gap-4 p-4">
          <ImageUploadField
            assetKey="logo"
            label="Store Logo"
            currentUrl={config.images.logoUrl || ""}
            onUploaded={(url) => onUpdateImage("logoUrl", url)}
          />
          <ImageUploadField
            assetKey="hero"
            label="Hero Banner Image"
            currentUrl={config.images.heroImageUrl || ""}
            onUploaded={(url) => onUpdateImage("heroImageUrl", url)}
          />
        </div>
      );
    }

    return null;
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-[400px] p-0 overflow-y-auto">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle>{title}</SheetTitle>
        </SheetHeader>
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
