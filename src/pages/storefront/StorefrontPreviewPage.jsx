import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { templateRegistry } from "../../components/website-builder/templateRegistry";
import { addToCart, getProductsForPreview } from "../../services/api";
import { supabase } from "../../services/supabaseClient";

export default function StorefrontPreviewPage() {
  const [searchParams] = useSearchParams();
  const storeSlug = searchParams.get("store");

  const [config, setConfig] = useState(null);
  const [storeName, setStoreName] = useState("");
  const [templateSlug, setTemplateSlug] = useState("modern-minimal");
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!storeSlug) {
      setError("No store specified.");
      setIsLoading(false);
      return;
    }

    (async () => {
      try {
        const { data: store, error: storeErr } = await supabase
          .from("stores")
          .select("id, name, currency")
          .eq("slug", storeSlug)
          .maybeSingle();

        if (storeErr || !store) throw new Error("Store not found.");
        setStoreName(store.name);

        const { data: theme, error: themeErr } = await supabase
          .from("themes")
          .select("template_slug, config_json")
          .eq("store_id", store.id)
          .eq("is_published", true)
          .maybeSingle();

        if (themeErr || !theme) throw new Error("No active theme found.");

        const cfg = theme.config_json ?? {
          texts: {},
          colors: {},
          images: {},
          catalog: {},
        };
        setConfig(cfg);
        setTemplateSlug(theme.template_slug ?? "modern-minimal");

        const prods = await getProductsForPreview(
          cfg.catalog?.collectionId ?? null,
          cfg.catalog?.displayCount ?? 6,
        );
        setProducts(prods);
      } catch (err) {
        setError(err.message ?? "Failed to load store.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [storeSlug]);

  async function handleAddToCart(product) {
    if (!product.variantId) {
      toast.warning("This product has no variant to add.");
      return;
    }
    try {
      await addToCart({ variantId: product.variantId, quantity: 1 });
      toast.success(`${product.name} added to cart!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add to cart";
      toast.error(msg);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <span className="text-muted-foreground">{error || "Store unavailable."}</span>
      </div>
    );
  }

  const entry = templateRegistry.find((t) => t.id === templateSlug);
  const TemplateComponent = entry?.component;

  if (!TemplateComponent) {
    return (
      <span className="text-muted-foreground">Template not found.</span>
    );
  }

  return (
    <div className="min-h-screen">
      <TemplateComponent
        config={config}
        storeName={storeName}
        products={products}
        storeSlug={storeSlug ?? undefined}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
