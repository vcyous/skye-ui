import { formatPrice } from "@/lib/format";
import type { Order, OrderItem } from "@/lib/types";
import Link from "next/link";

type ExtendedOrder = Order & {
  tracking_number?: string | null;
  tracking_carrier?: string | null;
  shipped_at?: string | null;
};

type OrderStatus = "baru" | "diproses" | "selesai" | "dibatalkan";

function getTimelineSteps(order: ExtendedOrder) {
  const status = order.status as OrderStatus;

  return [
    {
      key: "placed",
      label: "Pesanan Diterima",
      desc: `Pesanan #${order.order_number} berhasil dibuat`,
      done: true,
      time: new Date(order.created_at).toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
    {
      key: "payment",
      label: "Pembayaran",
      desc:
        order.payment_status === "lunas"
          ? "Pembayaran dikonfirmasi"
          : "Menunggu konfirmasi pembayaran",
      done: order.payment_status === "lunas",
    },
    {
      key: "processing",
      label: "Diproses",
      desc: "Pesanan sedang dikemas",
      done: status === "diproses" || status === "selesai",
    },
    {
      key: "shipped",
      label: "Dikirim",
      desc: order.tracking_number
        ? `${order.tracking_carrier ?? "Kurir"} · ${order.tracking_number}`
        : "Dalam perjalanan",
      done: Boolean(order.tracking_number) || status === "selesai",
    },
    {
      key: "done",
      label: "Selesai",
      desc: "Pesanan telah diterima",
      done: status === "selesai",
    },
  ];
}

export function ChicoraConfirmation({
  order,
  items,
  primary,
  accent,
  searchParams,
}: {
  order: ExtendedOrder;
  items: OrderItem[];
  primary: string;
  accent: string;
  searchParams?: { payment?: string };
}) {
  const addr = (order.shipping_address ?? {}) as {
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
  };
  const timeline = getTimelineSteps(order);
  const payment = searchParams?.payment;
  const isBank =
    payment === "bank" ||
    (order.payment_method ?? "").toUpperCase().includes("BCA") ||
    (order.payment_method ?? "").toUpperCase().includes("BNI") ||
    (order.payment_method ?? "").toUpperCase().includes("BRI") ||
    (order.payment_method ?? "").toUpperCase().includes("MANDIRI");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: primary }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="h-7 w-7"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold sm:text-3xl"
          style={{ fontFamily: "Georgia, serif", color: primary }}
        >
          Pesanan Berhasil!
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Nomor pesanan:{" "}
          <span className="font-semibold text-zinc-900">
            {order.order_number}
          </span>
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Konfirmasi dikirim ke{" "}
          <span className="font-medium">{order.buyer_email ?? "—"}</span>
        </p>
      </div>

      {/* Payment notice for bank transfer */}
      {isBank && order.payment_status !== "lunas" && (
        <div
          className="mb-6 rounded-lg p-4"
          style={{
            backgroundColor: `${primary}10`,
            border: `1px solid ${primary}30`,
          }}
        >
          <p className="text-sm font-semibold" style={{ color: primary }}>
            Instruksi Pembayaran
          </p>
          <p className="mt-1 text-sm text-zinc-700">
            Silakan transfer sebesar <strong>{formatPrice(order.total)}</strong>{" "}
            ke rekening toko. Pesanan akan diproses setelah pembayaran
            dikonfirmasi (maks. 1×24 jam).
          </p>
          {order.payment_method && (
            <p className="mt-1 text-xs text-zinc-500">
              Metode: {order.payment_method}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Timeline — left */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-500">
            Status Pesanan
          </h2>
          <div className="relative pl-6">
            {timeline.map((step, i) => (
              <div key={step.key} className="relative mb-6 last:mb-0">
                {/* Connector line */}
                {i < timeline.length - 1 && (
                  <div
                    className="absolute left-[-18px] top-5 h-full w-0.5"
                    style={{
                      backgroundColor: step.done ? primary : "#e4e4e7",
                    }}
                  />
                )}
                {/* Dot */}
                <div
                  className="absolute left-[-24px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 text-[10px] font-bold"
                  style={{
                    backgroundColor: step.done ? primary : "#fff",
                    borderColor: step.done ? primary : "#d4d4d8",
                    color: step.done ? "#fff" : "#a1a1aa",
                  }}
                >
                  {step.done ? "✓" : i + 1}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: step.done ? primary : "#a1a1aa" }}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-zinc-500">{step.desc}</p>
                  {step.time && (
                    <p className="text-xs text-zinc-400">{step.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order summary — right */}
        <div className="space-y-4 lg:col-span-3">
          {/* Items */}
          <div className="rounded-lg border border-zinc-200 p-4">
            <h3 className="mb-3 text-sm font-semibold">Item Pesanan</h3>
            <ul className="divide-y divide-zinc-100">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex items-center justify-between gap-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{it.product_name}</p>
                    {it.variant_name && (
                      <p className="text-xs text-zinc-500">{it.variant_name}</p>
                    )}
                    <p className="text-xs text-zinc-500">
                      {formatPrice(it.price)} × {it.quantity}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">
                    {formatPrice(it.price * it.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-zinc-200 pt-3 text-sm">
              <div className="flex justify-between text-zinc-500">
                <dt>Subtotal</dt>
                <dd>{formatPrice(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-zinc-500">
                <dt>
                  Ongkir
                  {order.shipping_method ? ` (${order.shipping_method})` : ""}
                </dt>
                <dd>{formatPrice(order.shipping_cost)}</dd>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <dt>Diskon</dt>
                  <dd>-{formatPrice(order.discount_amount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-zinc-200 pt-2 font-bold">
                <dt>Total</dt>
                <dd style={{ color: primary }}>{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </div>

          {/* Shipping address */}
          <div className="rounded-lg border border-zinc-200 p-4">
            <h3 className="mb-2 text-sm font-semibold">Dikirim ke</h3>
            <p className="text-sm font-medium">{order.buyer_name}</p>
            <p className="text-xs text-zinc-500">
              {order.buyer_phone}
              {order.buyer_email ? ` · ${order.buyer_email}` : ""}
            </p>
            {addr.address && (
              <p className="mt-1 text-sm text-zinc-600">
                {addr.address}
                {addr.city ? `, ${addr.city}` : ""}
                {addr.province ? `, ${addr.province}` : ""}
                {addr.postal_code ? ` ${addr.postal_code}` : ""}
              </p>
            )}
          </div>

          {/* What's next */}
          <div
            className="rounded-lg p-4"
            style={{
              backgroundColor: `${accent}15`,
              border: `1px solid ${accent}30`,
            }}
          >
            <h3
              className="mb-2 text-sm font-semibold"
              style={{ color: accent }}
            >
              Langkah Selanjutnya
            </h3>
            <ul className="space-y-1 text-xs text-zinc-600">
              {order.payment_status !== "lunas" ? (
                <>
                  <li>1. Lakukan pembayaran sesuai total di atas</li>
                  <li>2. Kirim bukti transfer ke toko jika diperlukan</li>
                  <li>3. Tunggu konfirmasi dan pesanan akan segera dikemas</li>
                </>
              ) : (
                <>
                  <li>1. Pesanan sedang dikemas oleh toko</li>
                  <li>2. Nomor resi akan dikirim via email/WhatsApp</li>
                  <li>3. Lacak pesanan menggunakan nomor resi</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-3">
        <Link
          href="/katalog"
          className="inline-flex h-10 items-center rounded-full px-6 text-sm font-semibold text-white"
          style={{ backgroundColor: primary }}
        >
          Lanjut Belanja
        </Link>
      </div>
    </div>
  );
}
