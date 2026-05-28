"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useCart } from "@/lib/cart";

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    price: number;
    imageUrl: string | null;
    stock: number | null;
  };
};

export function ProductActions({ product }: Props) {
  const { addItem } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);

  const stock = product.stock;
  const isOutOfStock = stock === 0;
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
        imageUrl: product.imageUrl,
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
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Jumlah:</span>
        <div className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => changeQty(-1)}
            disabled={qty <= 1}
            className="flex h-9 w-9 items-center justify-center hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
            aria-label="Kurangi"
          >
            −
          </button>
          <span className="w-10 text-center text-sm font-medium">{qty}</span>
          <button
            type="button"
            onClick={() => changeQty(1)}
            disabled={qty >= maxQty}
            className="flex h-9 w-9 items-center justify-center hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={addToCart}
          disabled={isOutOfStock}
          className="h-11 flex-1 rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900"
        >
          {isOutOfStock ? "Stok Habis" : "Tambah ke Keranjang"}
        </button>
        <button
          type="button"
          onClick={buyNow}
          disabled={isOutOfStock}
          className="h-11 flex-1 rounded-md border border-zinc-900 text-sm font-medium hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-100 dark:hover:bg-zinc-900"
        >
          Beli Sekarang
        </button>
      </div>
    </div>
  );
}
