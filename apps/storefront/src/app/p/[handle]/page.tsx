import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { getProductByHandle, getStoreBySlug } from "@/lib/store";
import { ProductActions } from "@/components/product-actions";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const [{ handle }, h] = await Promise.all([params, headers()]);
  const slug = h.get("x-store-slug");
  if (!slug) notFound();

  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const product = await getProductByHandle(store.id, store.slug, handle);
  if (!product) notFound();

  const media = product.media_urls ?? [];
  const stock = product.stock ?? 0;
  const isOutOfStock = stock === 0 && product.stock !== null;
  const isLimited = stock > 0 && stock <= 3;
  const onSale =
    product.compare_at_price !== null &&
    product.compare_at_price > product.price;
  const discount = onSale
    ? Math.round(
        ((product.compare_at_price! - product.price) /
          product.compare_at_price!) *
          100,
      )
    : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
      <nav className="mb-4 text-xs text-zinc-500">
        <Link href="/katalog" className="hover:underline">
          ← Kembali ke katalog
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery images={media} alt={product.name} />

        <div className="flex flex-col gap-4">
          {product.category && (
            <Link
              href={`/katalog`}
              className="self-start text-[11px] uppercase tracking-[0.18em] text-zinc-500 hover:underline"
            >
              {product.category}
            </Link>
          )}

          <h1 className="text-2xl font-semibold leading-tight sm:text-3xl">
            {product.name}
          </h1>

          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold sm:text-3xl">
              {formatPrice(product.price)}
            </span>
            {onSale && (
              <>
                <span className="text-sm text-zinc-400 line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
                <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                  HEMAT {discount}%
                </span>
              </>
            )}
          </div>

          <div className="text-sm">
            {isOutOfStock ? (
              <span className="inline-flex items-center gap-2 text-red-600">
                <span className="size-2 rounded-full bg-red-600" /> Habis
              </span>
            ) : isLimited ? (
              <span className="inline-flex items-center gap-2 text-amber-600">
                <span className="size-2 rounded-full bg-amber-500" /> Stok
                terbatas ({stock} tersisa)
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-green-600">
                <span className="size-2 rounded-full bg-green-500" /> Tersedia
              </span>
            )}
          </div>

          <ProductActions
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              imageUrl: media[0] ?? null,
              stock: product.stock,
            }}
          />

          <div className="mt-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
            <h2 className="mb-2 text-sm font-semibold">Deskripsi</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {product.description ?? "Belum ada deskripsi untuk produk ini."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductGallery({ images, alt }: { images: string[]; alt: string }) {
  const main = images[0];
  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
        {main ? (
          <Image
            src={main}
            alt={alt}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-zinc-400">
            Tanpa gambar
          </div>
        )}
      </div>
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.slice(0, 5).map((url, i) => (
            <div
              key={i}
              className="relative size-16 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800"
            >
              <Image src={url} alt="" fill sizes="64px" className="object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
