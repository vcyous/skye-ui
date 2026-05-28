"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

export function CartPageClient() {
  const { items, subtotal, updateQuantity, removeItem, isHydrated } = useCart();

  if (!isHydrated) {
    return <div className="mx-auto max-w-5xl px-4 py-12" aria-hidden />;
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">
          Keranjang Belanja
        </h1>
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              className="h-7 w-7 text-zinc-400"
            >
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
              <path d="M3 6h18" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
          </div>
          <p className="text-base font-medium text-zinc-500">
            Keranjang kosong
          </p>
          <Link
            href="/katalog"
            className="mt-2 inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
          >
            Mulai Belanja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">
        Keranjang Belanja
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.productId}
              className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800 sm:p-4"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800 sm:size-20">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-zinc-400">
                      no image
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link
                        href={`/p/${item.slug}`}
                        className="block truncate text-sm font-medium hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-xs text-zinc-500">
                        {formatPrice(item.price)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="shrink-0 p-1 text-zinc-400 hover:text-red-600"
                      aria-label="Hapus"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="h-4 w-4"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="inline-flex items-center rounded-md border border-zinc-300 dark:border-zinc-700">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity - 1)
                        }
                        className="flex h-8 w-8 items-center justify-center hover:bg-zinc-100 disabled:opacity-40 dark:hover:bg-zinc-800"
                        disabled={item.quantity <= 1}
                        aria-label="Kurangi"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        className="flex h-8 w-8 items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        aria-label="Tambah"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-sm font-semibold sm:text-base">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800 sm:p-5">
            <h2 className="mb-4 text-base font-semibold">Ringkasan</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-zinc-500">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-zinc-500">Ongkir</dt>
                <dd className="text-xs text-zinc-500">dihitung di checkout</dd>
              </div>
            </dl>
            <div className="my-4 border-t border-zinc-200 dark:border-zinc-800" />
            <div className="mb-4 flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-lg font-bold">{formatPrice(subtotal)}</span>
            </div>
            <Link
              href="/checkout"
              className="flex h-11 w-full items-center justify-center rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
            >
              Lanjut ke Checkout
            </Link>
            <Link
              href="/katalog"
              className="mt-3 block text-center text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              ← Lanjut belanja
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
