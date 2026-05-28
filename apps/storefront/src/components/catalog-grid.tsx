"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";

type Sort = "newest" | "price-asc" | "price-desc" | "name-asc";

const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "price-asc", label: "Harga terendah" },
  { value: "price-desc", label: "Harga tertinggi" },
  { value: "name-asc", label: "Nama A–Z" },
];

export function CatalogGrid({ products }: { products: Product[] }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [category, setCategory] = useState<string>("");

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.slice();
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description ?? "").toLowerCase().includes(q),
      );
    }
    if (category) list = list.filter((p) => p.category === category);
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [products, search, category, sort]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk..."
          className="h-10 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
        {categories.length > 0 && (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as Sort)}
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-3 text-xs text-zinc-500">
        Menampilkan {filtered.length} produk
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 p-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          Tidak ada produk ditemukan.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const image = product.media_urls?.[0] ?? null;
  const onSale =
    product.compare_at_price !== null &&
    product.compare_at_price > product.price;
  const stock = product.stock ?? 0;
  const outOfStock = stock === 0 && product.stock !== null;

  function quickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (outOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: image,
      stock: product.stock,
    });
  }

  return (
    <Link href={`/p/${product.slug}`} className="group flex flex-col gap-2">
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
        {outOfStock && (
          <span className="absolute left-2 top-2 rounded bg-zinc-900 px-2 py-0.5 text-[10px] font-semibold text-white">
            Habis
          </span>
        )}
      </div>
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          {product.category && (
            <p className="text-[10px] uppercase tracking-wider text-zinc-400">
              {product.category}
            </p>
          )}
          <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-sm font-semibold">
              {formatPrice(product.price)}
            </span>
            {onSale && (
              <span className="text-xs text-zinc-400 line-through">
                {formatPrice(product.compare_at_price)}
              </span>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={quickAdd}
          disabled={outOfStock}
          aria-label="Tambah ke keranjang"
          className="shrink-0 rounded-full bg-zinc-900 p-1.5 text-white hover:bg-zinc-700 disabled:opacity-30 dark:bg-white dark:text-zinc-900"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-3.5 w-3.5"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </Link>
  );
}
