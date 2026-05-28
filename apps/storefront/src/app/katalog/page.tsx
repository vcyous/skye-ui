import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getProductsByStore, getStoreBySlug } from "@/lib/store";
import { CatalogGrid } from "@/components/catalog-grid";

export default async function CatalogPage() {
  const h = await headers();
  const slug = h.get("x-store-slug");
  if (!slug) notFound();

  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const products = await getProductsByStore(store.id, store.slug);

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
