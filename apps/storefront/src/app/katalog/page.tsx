import { CatalogGrid } from "@/components/catalog-grid";
import { ChicoraCatalog } from "@/components/chicora/chicora-catalog";
import {
  getProductsByStore,
  getStoreBySlug,
  getThemeByStore,
  getVariantsByProduct,
} from "@/lib/store";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const [{ kategori }, h] = await Promise.all([searchParams, headers()]);
  const slug = h.get("x-store-slug");
  if (!slug) notFound();

  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const [products, theme] = await Promise.all([
    getProductsByStore(store.id, store.slug),
    getThemeByStore(store.id, store.slug),
  ]);

  // ── Chicora layout ───────────────────────────────────────
  if (theme?.template_slug === "chicora") {
    const primary = theme.config_json?.primaryColor ?? "#991b1b";
    const accent = theme.config_json?.accent ?? "#f97316";

    // Fetch variants for all products (needed for size/color filters)
    const variantArrays = await Promise.all(
      products.map((p) => getVariantsByProduct(p.id, store.slug)),
    );
    const variants = variantArrays.flat();

    return (
      <ChicoraCatalog
        products={products}
        variants={variants}
        primary={primary}
        accent={accent}
        initialCategory={kategori}
      />
    );
  }

  // ── Default layout ───────────────────────────────────────
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold sm:text-3xl">Katalog</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Jelajahi semua produk kami.
        </p>
      </header>
      <CatalogGrid products={products} />
    </div>
  );
}
