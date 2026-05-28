"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { placeOrder } from "@/app/checkout/actions";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/format";

type ShippingOption = { name: string; etaDays: string; price: number };
type BankAccount = { bank: string; name: string; number: string };
type EnabledMethods = { bank: boolean; qris: boolean; cod: boolean };

type Props = {
  shippingOptions: ShippingOption[];
  bankAccounts: BankAccount[];
  enabledMethods: EnabledMethods;
};

type PaymentTab = "bank" | "qris" | "cod";

export function CheckoutForm({
  shippingOptions,
  bankAccounts,
  enabledMethods,
}: Props) {
  const router = useRouter();
  const { items, subtotal, clear, isHydrated } = useCart();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [shippingIdx, setShippingIdx] = useState(0);
  const [bankIdx, setBankIdx] = useState(0);

  const availableTabs: PaymentTab[] = [];
  if (enabledMethods.bank) availableTabs.push("bank");
  if (enabledMethods.qris) availableTabs.push("qris");
  if (enabledMethods.cod) availableTabs.push("cod");
  if (availableTabs.length === 0) availableTabs.push("bank");

  const [paymentTab, setPaymentTab] = useState<PaymentTab>(availableTabs[0]);

  useEffect(() => {
    if (isHydrated && items.length === 0 && !isPending) {
      router.replace("/katalog");
    }
  }, [isHydrated, items.length, isPending, router]);

  const shipping = shippingOptions[shippingIdx] ?? shippingOptions[0];
  const shippingCost = shipping?.price ?? 0;
  const total = subtotal + shippingCost;

  function paymentLabel(): string {
    if (paymentTab === "bank") {
      const acc = bankAccounts[bankIdx] ?? bankAccounts[0];
      return `${acc.bank} - ${acc.number}`;
    }
    if (paymentTab === "qris") return "QRIS";
    if (paymentTab === "cod") return "COD";
    return "Bank Transfer";
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    const buyer = {
      name: String(fd.get("nama") ?? "").trim(),
      phone: String(fd.get("hp") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      address: String(fd.get("alamat") ?? "").trim(),
      city: String(fd.get("kota") ?? "").trim(),
      province: String(fd.get("provinsi") ?? "").trim(),
      postal_code: String(fd.get("kode_pos") ?? "").trim(),
    };

    if (!buyer.name || !buyer.phone || !buyer.email || !buyer.address) {
      setError("Lengkapi nama, HP, email, dan alamat.");
      return;
    }

    startTransition(async () => {
      const result = await placeOrder({
        buyer,
        shipping: shipping ? { name: shipping.name, price: shipping.price } : null,
        payment_method: paymentLabel(),
        items,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      clear();
      router.push(`/order/${result.orderId}`);
    });
  }

  if (!isHydrated || items.length === 0) {
    return <div aria-hidden className="py-12" />;
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid items-start gap-6 lg:grid-cols-[1fr_360px]"
    >
      <div className="flex flex-col gap-4">
        <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-base font-semibold">Alamat Pengiriman</legend>
          <div className="space-y-3 pt-2">
            <Field label="Nama Lengkap" name="nama" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Nomor HP" name="hp" type="tel" required />
              <Field label="Email" name="email" type="email" required />
            </div>
            <Field label="Alamat Lengkap" name="alamat" textarea required />
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Provinsi" name="provinsi" />
              <Field label="Kota" name="kota" />
              <Field label="Kode Pos" name="kode_pos" />
            </div>
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-base font-semibold">Metode Pengiriman</legend>
          <div className="space-y-2 pt-2">
            {shippingOptions.map((opt, idx) => {
              const selected = idx === shippingIdx;
              return (
                <label
                  key={`${opt.name}-${idx}`}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${
                    selected
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                      : "border-zinc-200 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                  }`}
                >
                  <input
                    type="radio"
                    name="shipping"
                    checked={selected}
                    onChange={() => setShippingIdx(idx)}
                  />
                  <span className="flex-1 font-medium">{opt.name}</span>
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] text-zinc-500 dark:bg-zinc-800">
                    {opt.etaDays} hari
                  </span>
                  <span className="font-semibold">{formatPrice(opt.price)}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <legend className="px-1 text-base font-semibold">Metode Pembayaran</legend>
          <div className="mb-3 flex gap-2 pt-2">
            {availableTabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setPaymentTab(t)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                  paymentTab === t
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-white dark:text-zinc-900"
                    : "border-zinc-300 dark:border-zinc-700"
                }`}
              >
                {t === "bank" ? "Transfer Bank" : t === "qris" ? "E-Wallet" : "COD"}
              </button>
            ))}
          </div>
          {paymentTab === "bank" && (
            <div className="space-y-2">
              {bankAccounts.map((acc, idx) => (
                <label
                  key={`${acc.bank}-${idx}`}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 text-sm ${
                    idx === bankIdx
                      ? "border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900"
                      : "border-zinc-200 dark:border-zinc-800"
                  }`}
                >
                  <input
                    type="radio"
                    name="bank"
                    checked={idx === bankIdx}
                    onChange={() => setBankIdx(idx)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{acc.bank}</p>
                    <p className="text-xs text-zinc-500">
                      {acc.number} a/n {acc.name}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}
          {paymentTab === "qris" && (
            <p className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              QRIS akan ditampilkan di halaman konfirmasi pesanan.
            </p>
          )}
          {paymentTab === "cod" && (
            <p className="rounded-md bg-zinc-50 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              Bayar saat barang diterima. Tersedia di area tertentu.
            </p>
          )}
        </fieldset>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="mb-4 text-base font-semibold">Ringkasan</h2>
          <ul className="space-y-2 text-sm">
            {items.map((it) => (
              <li
                key={it.productId}
                className="flex justify-between gap-3 text-zinc-600 dark:text-zinc-400"
              >
                <span className="truncate">
                  {it.name} × {it.quantity}
                </span>
                <span className="shrink-0">
                  {formatPrice(it.price * it.quantity)}
                </span>
              </li>
            ))}
          </ul>
          <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Subtotal</dt>
              <dd>{formatPrice(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">Ongkir</dt>
              <dd>{formatPrice(shippingCost)}</dd>
            </div>
          </dl>
          <div className="my-3 border-t border-zinc-200 dark:border-zinc-800" />
          <div className="mb-4 flex items-baseline justify-between">
            <span className="font-semibold">Total</span>
            <span className="text-lg font-bold">{formatPrice(total)}</span>
          </div>
          {error && (
            <p className="mb-3 rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={isPending}
            className="flex h-11 w-full items-center justify-center rounded-md bg-zinc-900 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
          >
            {isPending ? "Memproses..." : "Buat Pesanan"}
          </button>
          <Link
            href="/keranjang"
            className="mt-3 block text-center text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Kembali ke keranjang
          </Link>
        </div>
      </aside>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  textarea = false,
  required = false,
}: {
  label: string;
  name: string;
  type?: string;
  textarea?: boolean;
  required?: boolean;
}) {
  const cls =
    "mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900";
  return (
    <label className="block text-sm">
      <span className="font-medium">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {textarea ? (
        <textarea name={name} required={required} rows={3} className={cls} />
      ) : (
        <input type={type} name={name} required={required} className={cls} />
      )}
    </label>
  );
}
