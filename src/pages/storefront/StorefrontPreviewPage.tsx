import { App, Spin, Typography } from "antd";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { templateRegistry } from "../../components/website-builder/templateRegistry";
import { addToCart, getProductsForPreview } from "../../services/api";
import { supabase } from "../../services/supabaseClient";
import type { PreviewProduct } from "../../types";

export default function StorefrontPreviewPage() {
  const [searchParams] = useSearchParams();
  const storeSlug = searchParams.get("store");
  const { message } = App.useApp();

  const [config, setConfig] = useState<any>(null);
  const [storeName, setStoreName] = useState("");
  const [templateSlug, setTemplateSlug] = useState("modern-minimal");
  const [products, setProducts] = useState<PreviewProduct[]>([]);
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

        const cfg = (theme.config_json ?? {
          texts: {},
          colors: {},
          images: {},
          catalog: {},
        }) as any;
        setConfig(cfg);
        setTemplateSlug(theme.template_slug ?? "modern-minimal");

        const prods = await getProductsForPreview(
          cfg.catalog?.collectionId ?? null,
          cfg.catalog?.displayCount ?? 6,
        );
        setProducts(prods);
      } catch (err: any) {
        setError(err.message ?? "Failed to load store.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [storeSlug]);

  async function handleAddToCart(product: PreviewProduct) {
    if (!product.variantId) {
      message.warning("This product has no variant to add.");
      return;
    }
    try {
      await addToCart({ variantId: product.variantId, quantity: 1 });
      message.success(`${product.name} added to cart!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add to cart";
      message.error(msg);
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Spin size="large" tip="Loading store preview..." />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <Typography.Text type="secondary">
          {error || "Store unavailable."}
        </Typography.Text>
      </div>
    );
  }

  const entry = templateRegistry.find((t) => t.id === templateSlug);
  const TemplateComponent = entry?.component;

  if (!TemplateComponent) {
    return (
      <Typography.Text type="secondary">Template not found.</Typography.Text>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
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
