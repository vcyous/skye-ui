import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useStorefront } from "./StorefrontLayout";
import { supabase } from "../../services/api";

function formatRp(v) {
  return `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
}

const BANK_PREFIXES = ["BCA", "BNI", "BRI", "MANDIRI", "CIMB", "PERMATA", "BSI", "DANAMON", "BTN"];

function paymentMethodIsBank(method) {
  if (!method) return false;
  const upper = String(method).toUpperCase();
  return BANK_PREFIXES.some((b) => upper.startsWith(b));
}

export default function StorefrontOrderConfirmationPage() {
  const { orderId } = useParams();
  const { slug } = useStorefront();
  const [order, setOrder] = useState(null);
  const [orderItems, setOrderItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    (async () => {
      setIsLoading(true);
      try {
        const { data: o } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .maybeSingle();
        const { data: items } = await supabase
          .from("order_items")
          .select("*")
          .eq("order_id", orderId);
        setOrder(o);
        setOrderItems(items || []);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">Pesanan tidak ditemukan</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Pesanan yang kamu cari tidak tersedia.
        </p>
        <Link to={`/s/${slug}`}>
          <Button variant="outline">Kembali ke Beranda</Button>
        </Link>
      </div>
    );
  }

  const addr = order.shipping_address || {};
  const isBank = paymentMethodIsBank(order.payment_method);
  const paymentStatus = order.payment_status || "pending";

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="flex flex-col items-center text-center mb-8">
        <CheckCircle2 className="size-12 text-emerald-600 mb-3" />
        <h1
          className="text-2xl md:text-3xl font-bold"
          style={{
            fontFamily: "var(--st-font-heading)",
            color: "var(--st-primary)",
          }}
        >
          Pesanan Berhasil!
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Nomor pesanan:{" "}
          <span className="font-medium text-foreground">
            {order.order_number}
          </span>
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ringkasan Pesanan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {orderItems.map((it) => (
                <div key={it.id} className="flex justify-between gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="truncate">
                      <span className="text-muted-foreground">
                        {it.quantity} ×{" "}
                      </span>
                      <span className="font-medium">{it.product_name}</span>
                      {it.variant_name && (
                        <span className="text-muted-foreground">
                          {" "}
                          ({it.variant_name})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="shrink-0 font-medium">
                    {formatRp(it.price * it.quantity)}
                  </div>
                </div>
              ))}
            </div>
            <Separator />
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatRp(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ongkir</span>
                <span>{formatRp(order.shipping_cost)}</span>
              </div>
              {Number(order.discount_amount || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diskon</span>
                  <span>-{formatRp(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">
                  {formatRp(order.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Info Pengiriman</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="grid grid-cols-[100px_1fr] gap-y-1">
              <span className="text-muted-foreground">Nama</span>
              <span>{order.buyer_name}</span>
              <span className="text-muted-foreground">HP</span>
              <span>{order.buyer_phone}</span>
              <span className="text-muted-foreground">Alamat</span>
              <span className="whitespace-pre-line">
                {[addr.address, addr.city, addr.province, addr.postal_code]
                  .filter(Boolean)
                  .join("\n")}
              </span>
              <span className="text-muted-foreground">Pengiriman</span>
              <span>{order.shipping_method || "-"}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Metode</span>
              <span className="font-medium">{order.payment_method || "-"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <Badge
                className={
                  paymentStatus === "paid"
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                    : "bg-amber-100 text-amber-700 hover:bg-amber-100"
                }
              >
                {paymentStatus}
              </Badge>
            </div>
            {isBank && (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                Transfer ke {order.payment_method} dan kirim bukti ke WhatsApp
                toko.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link to={`/s/${slug}/katalog`} className="flex-1">
            <Button variant="outline" className="w-full">
              Belanja Lagi
            </Button>
          </Link>
          <Link to={`/s/${slug}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Beranda
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
