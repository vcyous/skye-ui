"use client";

import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

// ─────────────────────────────────────────────────────────────
// Gallery — thumbnail strip with selected image state
// ─────────────────────────────────────────────────────────────
export function ChicoraGallery({
  images,
  alt,
  primary,
}: {
  images: string[];
  alt: string;
  primary: string;
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const main = images[selectedIdx] ?? images[0];

  return (
    <div>
      {/* Main image */}
      <div className="relative aspect-square w-full overflow-hidden bg-zinc-100">
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
      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {images.slice(0, 8).map((url, i) => (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className="relative size-16 shrink-0 overflow-hidden bg-zinc-100 transition-opacity"
              style={{
                outline:
                  i === selectedIdx
                    ? `2px solid ${primary}`
                    : "2px solid transparent",
                outlineOffset: "2px",
              }}
            >
              <Image
                src={url}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Variant picker (color + size)
// ─────────────────────────────────────────────────────────────
export function ChicoraVariantPicker({
  variants,
  primary,
}: {
  variants: ProductVariant[];
  primary: string;
}) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);

  const sizes = [
    ...new Set(variants.map((v) => v.size).filter(Boolean)),
  ] as string[];
  const colors = [
    ...new Set(variants.map((v) => v.color).filter(Boolean)),
  ] as string[];

  if (sizes.length === 0 && colors.length === 0) return null;

  return (
    <div className="flex flex-col gap-4">
      {/* Color */}
      {colors.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Warna{selectedColor ? `: ${selectedColor}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() =>
                  setSelectedColor((prev) => (prev === c ? null : c))
                }
                className="rounded border px-3 py-1.5 text-sm transition-colors"
                style={
                  selectedColor === c
                    ? {
                        backgroundColor: primary,
                        borderColor: primary,
                        color: "#fff",
                      }
                    : { borderColor: "#d4d4d8", color: "#52525b" }
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Size */}
      {sizes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Ukuran{selectedSize ? `: ${selectedSize}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {sizes.map((s) => (
              <button
                key={s}
                onClick={() =>
                  setSelectedSize((prev) => (prev === s ? null : s))
                }
                className="rounded border px-3 py-1.5 text-sm transition-colors"
                style={
                  selectedSize === s
                    ? {
                        backgroundColor: primary,
                        borderColor: primary,
                        color: "#fff",
                      }
                    : { borderColor: "#d4d4d8", color: "#52525b" }
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CTA buttons (add to cart + buy now)
// ─────────────────────────────────────────────────────────────
export function ChicoraProductActions({
  product,
  primary,
  accent,
}: {
  product: Pick<
    Product,
    "id" | "name" | "slug" | "price" | "stock" | "media_urls"
  >;
  primary: string;
  accent: string;
}) {
  const { addItem } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);

  const stock = product.stock;
  const outOfStock = stock === 0;
  const maxQty = stock && stock > 0 ? stock : 99;

  function changeQty(delta: number) {
    setQty((q) => Math.max(1, Math.min(maxQty, q + delta)));
  }

  function addToCart() {
    addItem(
      {
        productId: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        imageUrl: product.media_urls?.[0] ?? null,
        stock: product.stock,
      },
      qty,
    );
  }

  function buyNow() {
    addToCart();
    router.push("/keranjang");
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Quantity */}
      <div className="flex items-center gap-3">
        <p className="text-sm text-zinc-500">Jumlah:</p>
        <div className="flex items-center rounded border border-zinc-300">
          <button
            onClick={() => changeQty(-1)}
            disabled={qty <= 1}
            className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
          >
            −
          </button>
          <span className="min-w-[2rem] text-center text-sm font-medium">
            {qty}
          </span>
          <button
            onClick={() => changeQty(1)}
            disabled={qty >= maxQty}
            className="px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {/* CTA row */}
      <div className="flex gap-2">
        <button
          onClick={addToCart}
          disabled={outOfStock}
          className="flex-1 rounded py-3 text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ border: `2px solid ${primary}`, color: primary }}
        >
          {outOfStock ? "Stok Habis" : "Tambah ke Keranjang"}
        </button>
        <button
          onClick={buyNow}
          disabled={outOfStock}
          className="flex-1 rounded py-3 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: accent }}
        >
          Beli Sekarang
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Product detail tabs
// ─────────────────────────────────────────────────────────────
export function ChicoraProductTabs({
  description,
  primary,
}: {
  description: string | null;
  primary: string;
}) {
  const tabs = ["Deskripsi", "Detail Bahan", "Pengiriman", "Ulasan"] as const;
  const [active, setActive] = useState<string>("Deskripsi");

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="flex border-b border-zinc-200">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className="px-4 py-2.5 text-sm transition-colors"
            style={
              active === tab
                ? {
                    borderBottom: `2px solid ${primary}`,
                    color: primary,
                    fontWeight: 600,
                    marginBottom: -1,
                  }
                : { color: "#71717a" }
            }
          >
            {tab}
          </button>
        ))}
      </div>
      {/* Content */}
      <div className="py-4 text-sm leading-relaxed text-zinc-600">
        {active === "Deskripsi" && (
          <p className="whitespace-pre-line">
            {description ?? "Belum ada deskripsi untuk produk ini."}
          </p>
        )}
        {active === "Detail Bahan" && (
          <p className="text-zinc-500 italic">
            Informasi bahan belum tersedia.
          </p>
        )}
        {active === "Pengiriman" && (
          <div className="space-y-2">
            <p>✔ Pengiriman ke seluruh Indonesia via JNE, SiCepat, JNT</p>
            <p>✔ Estimasi 2–5 hari kerja</p>
            <p>✔ Gratis ongkir untuk pembelian min. Rp200.000</p>
          </div>
        )}
        {active === "Ulasan" && (
          <p className="text-zinc-500 italic">Belum ada ulasan.</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Related products strip
// ─────────────────────────────────────────────────────────────
export function ChicoraRelatedProducts({
  products,
  primary,
}: {
  products: Product[];
  primary: string;
}) {
  if (products.length === 0) return null;

  return (
    <section className="mt-12 border-t border-zinc-200 pt-10">
      <h2
        className="mb-5 text-xl font-bold"
        style={{ fontFamily: "Georgia, serif", color: primary }}
      >
        Produk Terkait
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.slice(0, 4).map((p) => {
          const image = p.media_urls?.[0] ?? null;
          const onSale =
            p.compare_at_price !== null && p.compare_at_price > p.price;
          return (
            <Link key={p.id} href={`/p/${p.slug}`} className="group">
              <div className="relative aspect-[3/4] overflow-hidden bg-zinc-100">
                {image ? (
                  <Image
                    src={image}
                    alt={p.name}
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
              <div className="mt-2">
                <p className="line-clamp-2 text-sm text-zinc-800">{p.name}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span
                    className="text-sm font-bold"
                    style={{ color: primary }}
                  >
                    {formatPrice(p.price)}
                  </span>
                  {onSale && (
                    <span className="text-xs text-zinc-400 line-through">
                      {formatPrice(p.compare_at_price)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
