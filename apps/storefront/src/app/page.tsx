import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";

export default async function StoreHomePage() {
  const h = await headers();
  const slug = h.get("x-store-slug");

  if (!slug) notFound();

  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
      <p className="text-sm uppercase tracking-widest text-zinc-500">
        skye storefront
      </p>
      <h1 className="text-4xl font-semibold">{store.name}</h1>
      {store.description && (
        <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
          {store.description}
        </p>
      )}
      <p className="mt-2 text-xs text-zinc-400">
        slug: <span className="font-mono">{store.slug}</span>
      </p>
    </main>
  );
}
