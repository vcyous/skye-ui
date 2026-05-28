import { Check, ExternalLink, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../services/api";

function TemplateThumbnail({ config }) {
  const primary = config?.primaryColor || "#1a1a1a";
  const accent = config?.accent || "#3d5af1";
  const radius = Number(config?.borderRadius ?? 8);
  const heading = config?.fontHeading || "Inter";

  return (
    <div
      className="h-32 w-full flex flex-col justify-between p-3 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)" }}
    >
      <div className="flex items-center justify-between">
        <div
          className="h-2 w-12 rounded-sm"
          style={{ background: primary }}
        />
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
        <div
          className="h-6 bg-white border"
          style={{ borderRadius: radius }}
        />
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
        config_json: selected.default_config || {},
        is_published: true,
      };

      const { error } = await supabase
        .from("themes")
        .upsert(payload, { onConflict: "store_id" });

      if (error) throw error;

      setActiveTheme({ ...payload });
      toast.success(`Template "${selected.name}" diterapkan`);
    } catch (err) {
      toast.error(err?.message || "Gagal menerapkan template");
    } finally {
      setIsApplying(false);
    }
  }

  const hasChanged = selected && selected.slug !== activeTheme?.template_slug;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Tema Toko</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Pilih template untuk tampilan storefront. Klik kartu untuk memilih, lalu klik "Terapkan Template".
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

      {selected && (
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-2">Token JSON</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Token ini akan disimpan ke database dan diterapkan sebagai CSS variables di storefront.
            </p>
            <pre className="text-xs bg-muted p-3 rounded font-mono overflow-x-auto">
{JSON.stringify(
  {
    template: selected.slug,
    ...selected.default_config,
  },
  null,
  2,
)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
