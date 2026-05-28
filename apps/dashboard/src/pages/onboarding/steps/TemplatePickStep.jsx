import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "../../../services/api";

export default function TemplatePickStep({ onNext, onBack }) {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState("modern-minimal");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("templates")
        .select("slug, name, description, default_config")
        .eq("is_active", true)
        .order("display_order");
      const list = data || [];
      setTemplates(list);
      if (list.length > 0) setSelected(list[0].slug);
      setIsLoading(false);
    })();
  }, []);

  return (
    <>
      <h3 className="text-xl font-semibold">Pilih Template</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Pilih template awal untuk toko kamu. Bisa diubah kapan saja.
      </p>

      {isLoading ? (
        <div className="my-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Memuat template…
        </div>
      ) : (
        <div className="my-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {templates.map((tmpl) => {
            const cfg = tmpl.default_config || {};
            const primary = cfg.primaryColor || "#1a1a1a";
            const accent = cfg.accent || "#3d5af1";
            return (
              <Card
                key={tmpl.slug}
                onClick={() => setSelected(tmpl.slug)}
                className={`cursor-pointer overflow-hidden p-0 transition-all ${
                  selected === tmpl.slug
                    ? "border-2 border-primary"
                    : "border-2 border-transparent hover:border-border"
                }`}
              >
                <div
                  className="h-28"
                  style={{
                    background: `linear-gradient(135deg, ${primary}, ${accent})`,
                  }}
                />
                <div className="p-3">
                  <p className="font-semibold text-sm">{tmpl.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {tmpl.description}
                  </p>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button size="lg" variant="outline" onClick={onBack}>
          Kembali
        </Button>
        <Button
          size="lg"
          disabled={!selected || isLoading}
          onClick={() => onNext(selected)}
        >
          Gunakan Template Ini
        </Button>
      </div>
    </>
  );
}
