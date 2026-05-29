import { formatPrice } from "@/lib/format";
import type { Collection, Product, Store, Theme } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";

export function ChicoraHome({
  store,
  theme,
  products,
  collections,
}: {
  store: Store;
  theme: Theme | null;
  products: Product[];
  collections: Collection[];
}) {
  const primary = theme?.config_json?.primaryColor ?? "#991b1b";
  const accent = theme?.config_json?.accent ?? "#f97316";
  const heroImage = (store.settings as Record<string, unknown> | null)
    ?.heroImageUrl as string | undefined;

  return (
    <div>
      {/* ── Hero ── */}
      <section className="relative h-72 overflow-hidden sm:h-96">
        {heroImage ? (
          <Image
            src={heroImage}
            alt={store.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: primary }}
          />
        )}
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />
        {/* Hero text */}
        <div className="relative flex h-full flex-col items-center justify-center px-4 text-center text-white">
          <p
            className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] opacity-80"
            style={{ color: accent }}
          >
            Selamat Datang di
          </p>
          <h1
            className="text-3xl font-bold leading-tight sm:text-5xl"
            style={{ fontFamily: "Georgia, serif" }}
          >
            {store.name}
          </h1>
          {store.description && (
            <p className="mx-auto mt-3 max-w-xl text-sm opacity-85 sm:text-base">
              {store.description}
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <Link
              href="/katalog"
              className="inline-flex h-10 items-center rounded-full px-6 text-sm font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              Belanja Sekarang
            </Link>
            <Link
              href="/katalog"
              className="inline-flex h-10 items-center rounded-full border border-white/70 px-6 text-sm font-medium text-white hover:bg-white/10"
            >
              Lihat Katalog
            </Link>
          </div>
        </div>
      </section>

      {/* ── Kategori Grid ── */}
      {collections.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10">
          <h2
            className="mb-6 text-xl font-bold sm:text-2xl"
            style={{ fontFamily: "Georgia, serif", color: primary }}
          >
            Belanja Berdasarkan Kategori
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {collections.slice(0, 8).map((col) => (
              <Link
                key={col.id}
                href={`/katalog?kategori=${col.slug}`}
                className="group relative overflow-hidden rounded-lg"
              >
                <div className="relative aspect-video bg-zinc-100">
                  {col.hero_image_url ? (
                    <Image
                      src={col.hero_image_url}
                      alt={col.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 50vw, 25vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 opacity-80"
                      style={{ backgroundColor: primary }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                  <div className="absolute inset-0 flex items-end p-3">
                    <p className="text-sm font-semibold text-white">
                      {col.name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Featured Products ── */}
      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-5 flex items-baseline justify-between">
          <h2
            className="text-xl font-bold sm:text-2xl"
            style={{ fontFamily: "Georgia, serif", color: primary }}
          >
            Produk Pilihan
          </h2>
          {products.length > 0 && (
            <Link
              href="/katalog"
              className="text-sm font-medium hover:underline"
              style={{ color: primary }}
            >
              Lihat semua →
            </Link>
          )}
        </div>

        {products.length === 0 ? (
          <p className="rounded-lg border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500">
            Belum ada produk. Cek kembali nanti.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ChicoraProductCard key={p.id} product={p} primary={primary} />
            ))}
          </div>
        )}
      </section>

      {/* ── Trust Badges ── */}
      <section className="border-t border-zinc-200 bg-zinc-50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:grid-cols-4">
          {[
            {
              icon: "🚚",
              title: "Gratis Ongkir",
              desc: "Pembelian min. Rp200.000",
            },
            {
              icon: "🛡️",
              title: "Garansi Produk",
              desc: "7 hari pengembalian",
            },
            { icon: "💬", title: "Dukungan 24/7", desc: "Chat dengan kami" },
            {
              icon: "💳",
              title: "Bayar Fleksibel",
              desc: "Transfer, QRIS, COD",
            },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-3">
              <span className="text-2xl">{b.icon}</span>
              <div>
                <p className="text-sm font-semibold text-zinc-800">{b.title}</p>
                <p className="text-xs text-zinc-500">{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ChicoraProductCard({
  product,
  primary,
}: {
  product: Pick<
    Product,
    "id" | "name" | "slug" | "price" | "compare_at_price" | "media_urls"
  >;
  primary: string;
}) {
  const image = product.media_urls?.[0] ?? null;
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
    <Link href={`/p/${product.slug}`} className="group">
      <div className="relative overflow-hidden bg-zinc-100">
        <div className="relative aspect-[3/4]">
          {image ? (
            <Image
              src={image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-400">
              no image
            </div>
          )}
        </div>
        {onSale && (
          <span className="absolute left-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            -{discount}%
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="line-clamp-2 text-sm text-zinc-800">{product.name}</p>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-sm font-bold" style={{ color: primary }}>
            {formatPrice(product.price)}
          </span>
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
