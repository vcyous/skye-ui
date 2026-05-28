import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { getProductsByStore, getStoreBySlug } from "@/lib/store";

export default async function StoreHomePage() {
  const h = await headers();
  const slug = h.get("x-store-slug");
  if (!slug) notFound();

  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const products = await getProductsByStore(store.id, store.slug, {
    sort: "newest",
    limit: 8,
  });

  return (
    <>
      <section className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-5xl px-4 py-16 text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">{store.name}</h1>
          {store.description && (
            <p className="mx-auto mt-3 max-w-xl text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
              {store.description}
            </p>
          )}
          <div className="mt-6">
            <Link
              href="/katalog"
              className="inline-flex h-10 items-center rounded-full bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Lihat katalog
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-xl font-semibold">Terbaru</h2>
          {products.length > 0 && (
            <Link
              href="/katalog"
              className="text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Semua produk →
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Belum ada produk. Cek kembali nanti.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ProductCard({
  product,
}: {
  product: {
    name: string;
    slug: string;
    price: number;
    compare_at_price: number | null;
    media_urls: string[] | null;
  };
}) {
  const image = product.media_urls?.[0] ?? null;
  const onSale =
    product.compare_at_price !== null && product.compare_at_price > product.price;

  return (
    <Link
      href={`/p/${product.slug}`}
      className="group flex flex-col gap-2"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {image ? (
          <Image
            src={image}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">
            no image
          </div>
        )}
      </div>
      <div className="px-1">
        <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="text-sm font-semibold">{formatPrice(product.price)}</span>
          {onSale && (
            <span className="text-xs text-zinc-400 line-through">
              {formatPrice(product.compare_at_price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
