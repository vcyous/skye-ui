"use client";

import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Product, ProductVariant } from "@/lib/types";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type Filters = {
  categories: string[];
  minPrice: string;
  maxPrice: string;
  sizes: string[];
  colors: string[];
};

const EMPTY_FILTERS: Filters = {
  categories: [],
  minPrice: "",
  maxPrice: "",
  sizes: [],
  colors: [],
};

type SortKey = "newest" | "price-asc" | "price-desc" | "name-asc";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "price-asc", label: "Harga terendah" },
  { value: "price-desc", label: "Harga tertinggi" },
  { value: "name-asc", label: "Nama A–Z" },
];

// ─────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────
export function ChicoraCatalog({
  products,
  variants,
  primary,
  accent,
  initialCategory,
}: {
  products: Product[];
  variants: ProductVariant[];
  primary: string;
  accent: string;
  initialCategory?: string;
}) {
  const [filters, setFilters] = useState<Filters>({
    ...EMPTY_FILTERS,
    categories: initialCategory ? [initialCategory] : [],
  });
  const [sort, setSort] = useState<SortKey>("newest");

  // Derive filter options from data
  const categories = useMemo(() => {
    const s = new Set<string>();
    products.forEach((p) => p.category && s.add(p.category));
    return Array.from(s);
  }, [products]);

  const sizes = useMemo(() => {
    const s = new Set<string>();
    variants.forEach((v) => v.size && s.add(v.size));
    return Array.from(s).sort();
  }, [variants]);

  const colors = useMemo(() => {
    const s = new Set<string>();
    variants.forEach((v) => v.color && s.add(v.color));
    return Array.from(s);
  }, [variants]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = products.slice();

    if (filters.categories.length > 0) {
      list = list.filter(
        (p) => p.category && filters.categories.includes(p.category),
      );
    }

    const min = Number(filters.minPrice);
    const max = Number(filters.maxPrice);
    if (filters.minPrice && !Number.isNaN(min)) {
      list = list.filter((p) => p.price >= min);
    }
    if (filters.maxPrice && !Number.isNaN(max)) {
      list = list.filter((p) => p.price <= max);
    }

    if (filters.sizes.length > 0) {
      const productIdsWithSize = new Set(
        variants
          .filter((v) => v.size && filters.sizes.includes(v.size))
          .map((v) => v.product_id),
      );
      list = list.filter((p) => productIdsWithSize.has(p.id));
    }

    if (filters.colors.length > 0) {
      const productIdsWithColor = new Set(
        variants
          .filter((v) => v.color && filters.colors.includes(v.color))
          .map((v) => v.product_id),
      );
      list = list.filter((p) => productIdsWithColor.has(p.id));
    }

    // Sort
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    if (sort === "name-asc") list.sort((a, b) => a.name.localeCompare(b.name));

    return list;
  }, [products, variants, filters, sort]);

  // Active chips for display
  const chips = [
    ...filters.categories.map((c) => ({
      key: `cat-${c}`,
      label: c,
      remove: () =>
        setFilters((f) => ({
          ...f,
          categories: f.categories.filter((x) => x !== c),
        })),
    })),
    ...filters.sizes.map((s) => ({
      key: `size-${s}`,
      label: `Ukuran: ${s}`,
      remove: () =>
        setFilters((f) => ({ ...f, sizes: f.sizes.filter((x) => x !== s) })),
    })),
    ...filters.colors.map((c) => ({
      key: `color-${c}`,
      label: `Warna: ${c}`,
      remove: () =>
        setFilters((f) => ({
          ...f,
          colors: f.colors.filter((x) => x !== c),
        })),
    })),
    ...(filters.minPrice
      ? [
          {
            key: "min-price",
            label: `Min: ${formatPrice(Number(filters.minPrice))}`,
            remove: () => setFilters((f) => ({ ...f, minPrice: "" })),
          },
        ]
      : []),
    ...(filters.maxPrice
      ? [
          {
            key: "max-price",
            label: `Max: ${formatPrice(Number(filters.maxPrice))}`,
            remove: () => setFilters((f) => ({ ...f, maxPrice: "" })),
          },
        ]
      : []),
  ];

  function resetAll() {
    setFilters(EMPTY_FILTERS);
  }

  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <nav className="mb-4 text-xs text-zinc-500">
        <Link href="/" className="hover:underline">
          Beranda
        </Link>{" "}
        / <span className="text-zinc-800">Katalog</span>
      </nav>

      {/* Active chips */}
      {chips.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {chips.map((chip) => (
            <button
              key={chip.key}
              onClick={chip.remove}
              className="flex items-center gap-1 rounded-full border border-zinc-300 bg-white px-3 py-1 text-xs text-zinc-700 hover:border-zinc-400"
            >
              {chip.label} ✕
            </button>
          ))}
          <button
            onClick={resetAll}
            className="text-xs font-medium underline"
            style={{ color: primary }}
          >
            Reset semua
          </button>
        </div>
      )}

      {/* Sort + count bar */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-zinc-500">
          {filtered.length} produk ditemukan
        </p>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Layout: sidebar + grid */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          {/* Categories */}
          {categories.length > 0 && (
            <div className="mb-6">
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-widest"
                style={{ color: primary }}
              >
                Kategori
              </p>
              <ul className="space-y-1.5">
                {categories.map((cat) => (
                  <li key={cat}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                      <input
                        type="checkbox"
                        checked={filters.categories.includes(cat)}
                        onChange={() =>
                          setFilters((f) => ({
                            ...f,
                            categories: toggleArr(f.categories, cat),
                          }))
                        }
                        className="rounded border-zinc-300"
                      />
                      {cat}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Price range */}
          <div className="mb-6">
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-widest"
              style={{ color: primary }}
            >
              Harga
            </p>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={filters.minPrice}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, minPrice: e.target.value }))
                }
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none"
              />
              <span className="text-zinc-400">–</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.maxPrice}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, maxPrice: e.target.value }))
                }
                className="w-full rounded border border-zinc-300 px-2 py-1.5 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Sizes */}
          {sizes.length > 0 && (
            <div className="mb-6">
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-widest"
                style={{ color: primary }}
              >
                Ukuran
              </p>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <button
                    key={s}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        sizes: toggleArr(f.sizes, s),
                      }))
                    }
                    className="rounded border px-2.5 py-1 text-xs transition-colors"
                    style={
                      filters.sizes.includes(s)
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

          {/* Colors */}
          {colors.length > 0 && (
            <div className="mb-6">
              <p
                className="mb-3 text-xs font-semibold uppercase tracking-widest"
                style={{ color: primary }}
              >
                Warna
              </p>
              <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        colors: toggleArr(f.colors, c),
                      }))
                    }
                    className="rounded border px-2.5 py-1 text-xs transition-colors"
                    style={
                      filters.colors.includes(c)
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
        </aside>

        {/* Product grid */}
        <div className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 py-20 text-center">
              <p className="text-sm text-zinc-500">
                Tidak ada produk yang sesuai filter.
              </p>
              <button
                onClick={resetAll}
                className="mt-3 text-sm font-medium underline"
                style={{ color: primary }}
              >
                Reset filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => (
                <ChicoraCatalogCard key={p.id} product={p} primary={primary} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Product card for catalog
// ─────────────────────────────────────────────────────────────
function ChicoraCatalogCard({
  product,
  primary,
}: {
  product: Product;
  primary: string;
}) {
  const { addItem } = useCart();
  const image = product.media_urls?.[0] ?? null;
  const outOfStock = product.stock === 0 && product.stock !== null;
  const isLimited = (product.stock ?? 0) > 0 && (product.stock ?? 0) <= 3;
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
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="rounded bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-zinc-700">
              Habis
            </span>
          </div>
        )}
        {!outOfStock && (
          <button
            onClick={quickAdd}
            className="absolute bottom-0 left-0 right-0 translate-y-full py-2 text-center text-xs font-semibold text-white transition-transform group-hover:translate-y-0"
            style={{ backgroundColor: primary }}
          >
            + Keranjang
          </button>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="line-clamp-2 text-sm text-zinc-800">{product.name}</p>
        {isLimited && !outOfStock && (
          <p className="text-[10px] text-amber-600">Sisa {product.stock}</p>
        )}
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
