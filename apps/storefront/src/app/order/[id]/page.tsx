import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/store";
import { formatPrice } from "@/lib/format";

const BANK_PREFIXES = [
  "BCA",
  "BNI",
  "BRI",
  "MANDIRI",
  "CIMB",
  "PERMATA",
  "BSI",
  "DANAMON",
  "BTN",
];

function isBankPayment(method: string | null): boolean {
  if (!method) return false;
  const upper = method.toUpperCase();
  return BANK_PREFIXES.some((b) => upper.startsWith(b));
}

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getOrderById(id);
  if (!result) notFound();

  const { order, items } = result;
  const addr = (order.shipping_address ?? {}) as {
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  };
  const isBank = isBankPayment(order.payment_method);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="h-7 w-7"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold sm:text-3xl">Pesanan Berhasil!</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Nomor pesanan:{" "}
          <span className="font-medium text-zinc-900 dark:text-zinc-100">
            {order.order_number}
          </span>
        </p>
      </div>

      <div className="space-y-4">
        <Section title="Item Pesanan">
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex items-center justify-between gap-3 py-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{it.product_name}</p>
                  <p className="text-xs text-zinc-500">
                    {formatPrice(it.price)} × {it.quantity}
                  </p>
                </div>
                <span className="shrink-0 font-medium">
                  {formatPrice(it.price * it.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="Ringkasan">
          <dl className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-zinc-500">Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-zinc-500">
                Ongkir
                {order.shipping_method ? ` (${order.shipping_method})` : null}
              </dt>
              <dd>{formatPrice(order.shipping_cost)}</dd>
            </div>
            <div className="flex justify-between border-t border-zinc-200 pt-2 font-semibold dark:border-zinc-800">
              <dt>Total</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </Section>

        <Section title="Pengiriman">
          <p className="text-sm">{order.buyer_name}</p>
          <p className="text-xs text-zinc-500">
            {order.buyer_phone} · {order.buyer_email}
          </p>
          {addr.address && (
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {addr.address}
              {addr.city ? `, ${addr.city}` : ""}
              {addr.province ? `, ${addr.province}` : ""}
              {addr.postal_code ? ` ${addr.postal_code}` : ""}
            </p>
          )}
        </Section>

        <Section title="Pembayaran">
          <p className="text-sm">
            {order.payment_method ?? "—"}{" "}
            <span className="ml-1 rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
              {order.payment_status}
            </span>
          </p>
          {isBank && (
            <p className="mt-2 text-xs text-zinc-500">
              Transfer ke rekening di atas sesuai total. Pesanan akan diproses
              setelah pembayaran dikonfirmasi.
            </p>
          )}
        </Section>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/katalog"
          className="inline-flex h-10 items-center rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900"
        >
          Lanjut Belanja
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
