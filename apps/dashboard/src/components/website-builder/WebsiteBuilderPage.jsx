import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { supabase, uploadStoreAsset } from "../../services/api";

function TemplateThumbnail({ config }) {
  const primary = config?.primaryColor || "#1a1a1a";
  const accent = config?.accent || "#3d5af1";
  const radius = Number(config?.borderRadius ?? 8);
  const heading = config?.fontHeading || "Inter";

  return (
    <div
      className="h-32 w-full flex flex-col justify-between p-3 overflow-hidden"
      style={{
        background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)",
      }}
    >
      <div className="flex items-center justify-between">
        <div className="h-2 w-12 rounded-sm" style={{ background: primary }} />
        <div className="flex gap-1">
          <div className="h-1.5 w-3 rounded-sm bg-muted-foreground/40" />
          <div className="h-1.5 w-3 rounded-sm bg-muted-foreground/40" />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <div
          className="h-3 w-3/4 rounded-sm"
          style={{ background: primary, fontFamily: heading }}
        />
        <div className="h-1.5 w-1/2 rounded-sm bg-muted-foreground/30" />
      </div>
      <div className="grid grid-cols-2 gap-1">
        <div className="h-6 bg-white border" style={{ borderRadius: radius }} />
        <div
          className="h-6 border"
          style={{ background: accent, borderRadius: radius }}
        />
      </div>
    </div>
  );
}

function TemplateCard({ template, isSelected, isActive, onSelect }) {
  const config = template.default_config || {};
  const primary = config.primaryColor || "#1a1a1a";

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`relative text-left rounded-lg overflow-hidden border-2 transition-all ${
        isSelected
          ? "border-primary shadow-md"
          : "border-border hover:border-muted-foreground/40"
      }`}
    >
      {isSelected && (
        <div className="absolute top-2 right-2 z-10 size-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
          <Check className="size-3.5" />
        </div>
      )}
      {isActive && !isSelected && (
        <div className="absolute top-2 right-2 z-10">
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
            Aktif
          </Badge>
        </div>
      )}

      <TemplateThumbnail config={config} />

      <div className="p-3 bg-card">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="size-3 rounded-full shrink-0"
            style={{ background: primary }}
          />
          <h3 className="text-sm font-semibold truncate">{template.name}</h3>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
          {template.description}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
            radius {config.borderRadius || 0}px
          </span>
          <span className="px-1.5 py-0.5 bg-muted rounded text-[10px] capitalize">
            {config.cardStyle || "flat"}
          </span>
        </div>
      </div>
    </button>
  );
}

export default function WebsiteBuilderPage() {
  const { store } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [activeTheme, setActiveTheme] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [customConfig, setCustomConfig] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mediaUploading, setMediaUploading] = useState({
    logo: false,
    hero: false,
  });

  useEffect(() => {
    if (!store?.id) return;
    loadData(store.id);
  }, [store?.id]);

  async function loadData(storeId) {
    setIsLoading(true);
    try {
      const [tplRes, thRes] = await Promise.all([
        supabase
          .from("templates")
          .select("slug, name, description, default_config, display_order")
          .eq("is_active", true)
          .order("display_order"),
        supabase
          .from("themes")
          .select("template_slug, config_json, is_published")
          .eq("store_id", storeId)
          .maybeSingle(),
      ]);

      if (tplRes.error) throw tplRes.error;
      const tpls = tplRes.data || [];
      setTemplates(tpls);

      const theme = thRes.data;
      setActiveTheme(theme);
      const activeTpl = tpls.find((t) => t.slug === theme?.template_slug);
      setSelected(activeTpl || tpls[0] || null);
      // Inisialisasi customConfig dari theme yang sudah tersimpan, atau dari default template
      setCustomConfig(theme?.config_json || activeTpl?.default_config || {});
    } catch (err) {
      toast.error(err?.message || "Gagal memuat template");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleApply() {
    if (!selected || !store?.id) return;
    setIsApplying(true);
    try {
      const payload = {
        store_id: store.id,
        template_slug: selected.slug,
        config_json: customConfig || selected.default_config || {},
        is_published: true,
      };

      const { error } = await supabase
        .from("themes")
        .upsert(payload, { onConflict: "store_id" });

      if (error) throw error;

      setActiveTheme({ ...payload });
      setCustomConfig(customConfig || selected.default_config || {});
      toast.success(`Template "${selected.name}" diterapkan`);
    } catch (err) {
      toast.error(err?.message || "Gagal menerapkan template");
    } finally {
      setIsApplying(false);
    }
  }

  // Auto-save customConfig ke DB dengan debounce 800ms
  useEffect(() => {
    if (!store?.id || !activeTheme?.template_slug || !customConfig) return;

    const timer = setTimeout(async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase.from("themes").upsert(
          {
            store_id: store.id,
            template_slug: activeTheme.template_slug,
            config_json: customConfig,
            is_published: true,
          },
          { onConflict: "store_id" },
        );
        if (error) throw error;
      } catch (err) {
        toast.error("Gagal menyimpan kustomisasi");
      } finally {
        setIsSaving(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [customConfig, store?.id, activeTheme?.template_slug]);

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    setMediaUploading((p) => ({ ...p, logo: true }));
    try {
      const url = await uploadStoreAsset(file, "logo");
      const currentSettings = store.settings || {};
      await supabase
        .from("stores")
        .update({ settings: { ...currentSettings, logoUrl: url } })
        .eq("id", store.id);
      toast.success("Logo berhasil diunggah");
    } catch (err) {
      toast.error(err?.message || "Gagal upload logo");
    } finally {
      setMediaUploading((p) => ({ ...p, logo: false }));
    }
  }

  async function handleHeroUpload(e) {
    const file = e.target.files?.[0];
    if (!file || !store?.id) return;
    setMediaUploading((p) => ({ ...p, hero: true }));
    try {
      const url = await uploadStoreAsset(file, "hero");
      const currentSettings = store.settings || {};
      await supabase
        .from("stores")
        .update({ settings: { ...currentSettings, heroImageUrl: url } })
        .eq("id", store.id);
      toast.success("Hero image berhasil diunggah");
    } catch (err) {
      toast.error(err?.message || "Gagal upload hero image");
    } finally {
      setMediaUploading((p) => ({ ...p, hero: false }));
    }
  }

  const hasChanged = selected && selected.slug !== activeTheme?.template_slug;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Tema Toko</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih template untuk tampilan storefront. Klik kartu untuk memilih,
            lalu klik "Terapkan Template".
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          {store?.slug && (
            <a
              href={`/s/${store.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm">
                <ExternalLink className="size-3.5 mr-1.5" />
                Lihat Toko
              </Button>
            </a>
          )}
          <Button
            size="sm"
            disabled={!hasChanged || isApplying}
            onClick={handleApply}
          >
            {isApplying && <Loader2 className="size-3.5 mr-1.5 animate-spin" />}
            Terapkan Template
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-60 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.slug}
              template={tpl}
              isSelected={selected?.slug === tpl.slug}
              isActive={activeTheme?.template_slug === tpl.slug}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {selected && customConfig && (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          {/* Panel Kustomisasi Warna & Tipografi */}
          <Card>
            <CardContent className="p-4 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">Kustomisasi Tampilan</h4>
                {isSaving && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="size-3 animate-spin" />
                    Menyimpan...
                  </span>
                )}
              </div>

              {/* Warna */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Warna Utama
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customConfig.primaryColor || "#1a1a1a"}
                      onChange={(e) =>
                        setCustomConfig((p) => ({
                          ...p,
                          primaryColor: e.target.value,
                        }))
                      }
                      className="h-9 w-14 cursor-pointer rounded border p-0.5"
                    />
                    <span className="text-xs font-mono text-muted-foreground">
                      {customConfig.primaryColor || "#1a1a1a"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Warna Aksen
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customConfig.accent || "#3d5af1"}
                      onChange={(e) =>
                        setCustomConfig((p) => ({
                          ...p,
                          accent: e.target.value,
                        }))
                      }
                      className="h-9 w-14 cursor-pointer rounded border p-0.5"
                    />
                    <span className="text-xs font-mono text-muted-foreground">
                      {customConfig.accent || "#3d5af1"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Font */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Font Judul
                  </label>
                  <select
                    value={customConfig.fontHeading || "Inter"}
                    onChange={(e) =>
                      setCustomConfig((p) => ({
                        ...p,
                        fontHeading: e.target.value,
                      }))
                    }
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    {[
                      "Inter",
                      "Sora",
                      "Poppins",
                      "Playfair Display",
                      "Lora",
                    ].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                    Font Teks
                  </label>
                  <select
                    value={customConfig.fontBody || "Inter"}
                    onChange={(e) =>
                      setCustomConfig((p) => ({
                        ...p,
                        fontBody: e.target.value,
                      }))
                    }
                    className="w-full h-9 rounded-md border bg-background px-2 text-sm"
                  >
                    {["Inter", "Lora", "Poppins"].map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Border Radius — {customConfig.borderRadius ?? 8}px
                </label>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={2}
                  value={customConfig.borderRadius ?? 8}
                  onChange={(e) =>
                    setCustomConfig((p) => ({
                      ...p,
                      borderRadius: Number(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>

              {/* Card Style */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Gaya Kartu Produk
                </label>
                <div className="flex gap-2">
                  {["flat", "shadow", "outlined"].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() =>
                        setCustomConfig((p) => ({ ...p, cardStyle: style }))
                      }
                      className={`flex-1 py-1.5 rounded-md border text-xs font-medium capitalize transition-colors ${
                        customConfig.cardStyle === style
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-muted-foreground/50"
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hero Layout */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">
                  Layout Hero
                </label>
                <div className="flex gap-2">
                  {[
                    { value: "centered", label: "Tengah" },
                    { value: "split", label: "Split" },
                    { value: "full-bleed", label: "Full" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setCustomConfig((p) => ({
                          ...p,
                          heroLayout: opt.value,
                        }))
                      }
                      className={`flex-1 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                        customConfig.heroLayout === opt.value
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:border-muted-foreground/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Panel Media */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h4 className="text-sm font-semibold">Media Toko</h4>

              {/* Logo */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Logo Toko
                </label>
                {store?.settings?.logoUrl && (
                  <img
                    src={store.settings.logoUrl}
                    alt="Logo"
                    className="h-12 object-contain rounded border mb-2"
                  />
                )}
                <label className="flex items-center justify-center gap-2 h-9 w-full cursor-pointer rounded-md border border-dashed text-xs text-muted-foreground hover:border-muted-foreground/60 transition-colors">
                  {mediaUploading.logo ? (
                    <>
                      <Loader2 className="size-3 animate-spin" /> Mengupload...
                    </>
                  ) : (
                    "Pilih file logo"
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={mediaUploading.logo}
                    onChange={handleLogoUpload}
                  />
                </label>
              </div>

              {/* Hero Image */}
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">
                  Gambar Hero
                </label>
                {store?.settings?.heroImageUrl && (
                  <img
                    src={store.settings.heroImageUrl}
                    alt="Hero"
                    className="w-full aspect-video object-cover rounded border mb-2"
                  />
                )}
                <label className="flex items-center justify-center gap-2 h-9 w-full cursor-pointer rounded-md border border-dashed text-xs text-muted-foreground hover:border-muted-foreground/60 transition-colors">
                  {mediaUploading.hero ? (
                    <>
                      <Loader2 className="size-3 animate-spin" /> Mengupload...
                    </>
                  ) : (
                    "Pilih gambar hero"
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={mediaUploading.hero}
                    onChange={handleHeroUpload}
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
