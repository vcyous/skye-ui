import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useStorefront } from "./StorefrontLayout";
import { useCart } from "../../context/CartContext";
import { supabase } from "../../services/api";

function formatRp(v) {
  return `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
}

const DEFAULT_SHIPPING = [
  { name: "JNE Reg", etaDays: "2-3", price: 15000 },
  { name: "JNE YES", etaDays: "1-2", price: 25000 },
  { name: "SiCepat", etaDays: "2-3", price: 14000 },
];

const DEFAULT_BANK_ACCOUNTS = [
  { bank: "BCA", name: "Toko", number: "1234567890" },
];

export default function StorefrontCheckoutPage() {
  const navigate = useNavigate();
  const { store, slug } = useStorefront();
  const { items, subtotal, clearCart } = useCart();

  const settings = store?.settings || {};
  const shippingOptions = useMemo(() => {
    const opts = settings.shippingOptions;
    return Array.isArray(opts) && opts.length > 0 ? opts : DEFAULT_SHIPPING;
  }, [settings]);

  const paymentMethods = settings.paymentMethods || {};
  const bankTransferEnabled = paymentMethods.bankTransfer?.enabled ?? true;
  const qrisEnabled = paymentMethods.qris?.enabled ?? false;
  const codEnabled = paymentMethods.cod?.enabled ?? false;

  const bankAccounts = useMemo(() => {
    const accs = paymentMethods.bankTransfer?.accounts;
    return Array.isArray(accs) && accs.length > 0 ? accs : DEFAULT_BANK_ACCOUNTS;
  }, [paymentMethods]);

  const availableTabs = useMemo(() => {
    const tabs = [];
    if (bankTransferEnabled) tabs.push("bank");
    if (qrisEnabled) tabs.push("qris");
    if (codEnabled) tabs.push("cod");
    if (tabs.length === 0) tabs.push("bank");
    return tabs;
  }, [bankTransferEnabled, qrisEnabled, codEnabled]);

  const [shippingIdx, setShippingIdx] = useState(0);
  const [paymentTab, setPaymentTab] = useState(availableTabs[0]);
  const [bankIdx, setBankIdx] = useState(0);
  const [voucher, setVoucher] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedShipping = shippingOptions[shippingIdx] || shippingOptions[0];
  const shippingCost = Number(selectedShipping?.price || 0);
  const total = subtotal + shippingCost;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nama: "",
      hp: "",
      email: "",
      alamat: "",
      provinsi: "",
      kota: "",
      kode_pos: "",
    },
  });

  useEffect(() => {
    if (items.length === 0) {
      navigate(`/s/${slug}/katalog`, { replace: true });
    }
  }, [items.length, navigate, slug]);

  function buildPaymentMethodLabel() {
    if (paymentTab === "bank") {
      const acc = bankAccounts[bankIdx] || bankAccounts[0];
      return `${acc.bank} - ${acc.number}`;
    }
    if (paymentTab === "qris") return "QRIS";
    if (paymentTab === "cod") return "COD";
    return "Bank Transfer";
  }

  async function onSubmit(formData) {
    if (!store?.id) {
      toast.error("Data toko tidak tersedia");
      return;
    }
    if (items.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }
    setIsSubmitting(true);
    try {
      const orderInsert = {
        store_id: store.id,
        buyer_name: formData.nama,
        buyer_phone: formData.hp,
        buyer_email: formData.email,
        status: "baru",
        subtotal,
        shipping_cost: shippingCost,
        discount_amount: 0,
        total,
        shipping_method: selectedShipping?.name || null,
        shipping_address: {
          name: formData.nama,
          phone: formData.hp,
          address: formData.alamat,
          city: formData.kota,
          province: formData.provinsi,
          postal_code: formData.kode_pos,
        },
        payment_method: buildPaymentMethodLabel(),
        payment_status: "pending",
        notes: null,
      };

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert(orderInsert)
        .select("id, order_number")
        .single();

      if (orderErr) throw orderErr;

      const itemsInsert = items.map((it) => ({
        order_id: order.id,
        product_id: it.productId,
        variant_id: it.variantId,
        product_name: it.name,
        variant_name: null,
        price: it.price,
        quantity: it.quantity,
      }));

      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(itemsInsert);

      if (itemsErr) throw itemsErr;

      clearCart();
      toast.success(`Pesanan ${order.order_number} dibuat`);
      navigate(`/s/${slug}/order/${order.id}`);
    } catch (err) {
      toast.error(err?.message || "Gagal membuat pesanan");
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyVoucher() {
    toast.info("Voucher tidak tersedia");
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1
        className="text-2xl md:text-3xl font-bold mb-6"
        style={{
          fontFamily: "var(--st-font-heading)",
          color: "var(--st-primary)",
        }}
      >
        Checkout
      </h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid gap-6 lg:grid-cols-[1fr_360px] items-start"
      >
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Alamat Pengiriman</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nama">Nama Lengkap</Label>
                <Input
                  id="nama"
                  {...register("nama", { required: "Nama wajib diisi" })}
                  className="mt-1.5"
                />
                {errors.nama && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.nama.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="hp">Nomor HP</Label>
                  <Input
                    id="hp"
                    type="tel"
                    {...register("hp", { required: "Nomor HP wajib diisi" })}
                    className="mt-1.5"
                  />
                  {errors.hp && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.hp.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", {
                      required: "Email wajib diisi",
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: "Format email tidak valid",
                      },
                    })}
                    className="mt-1.5"
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1">
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="alamat">Alamat Lengkap</Label>
                <Textarea
                  id="alamat"
                  rows={3}
                  {...register("alamat", { required: "Alamat wajib diisi" })}
                  className="mt-1.5"
                />
                {errors.alamat && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.alamat.message}
                  </p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="provinsi">Provinsi</Label>
                  <Input
                    id="provinsi"
                    {...register("provinsi")}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="kota">Kota</Label>
                  <Input id="kota" {...register("kota")} className="mt-1.5" />
                </div>
                <div>
                  <Label htmlFor="kode_pos">Kode Pos</Label>
                  <Input
                    id="kode_pos"
                    {...register("kode_pos")}
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metode Pengiriman</CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={String(shippingIdx)}
                onValueChange={(v) => setShippingIdx(Number(v))}
                className="flex flex-col gap-2"
              >
                {shippingOptions.map((opt, idx) => {
                  const selected = idx === shippingIdx;
                  return (
                    <Label
                      key={`${opt.name}-${idx}`}
                      htmlFor={`ship-${idx}`}
                      className={`flex items-center gap-3 border rounded-md px-3 py-3 cursor-pointer transition-colors ${
                        selected
                          ? "border-foreground bg-accent/30"
                          : "hover:bg-accent/20"
                      }`}
                    >
                      <RadioGroupItem
                        value={String(idx)}
                        id={`ship-${idx}`}
                      />
                      <div className="flex-1 flex items-center gap-2">
                        <span className="font-medium">{opt.name}</span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {opt.etaDays} hari
                        </span>
                      </div>
                      <span className="text-sm font-semibold">
                        {formatRp(opt.price)}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metode Pembayaran</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={paymentTab} onValueChange={setPaymentTab}>
                <TabsList className="w-full justify-start flex-wrap h-auto">
                  {availableTabs.includes("bank") && (
                    <TabsTrigger value="bank">Transfer Bank</TabsTrigger>
                  )}
                  {availableTabs.includes("qris") && (
                    <TabsTrigger value="qris">E-Wallet</TabsTrigger>
                  )}
                  {availableTabs.includes("cod") && (
                    <TabsTrigger value="cod">COD</TabsTrigger>
                  )}
                </TabsList>

                {availableTabs.includes("bank") && (
                  <TabsContent value="bank" className="pt-4">
                    <RadioGroup
                      value={String(bankIdx)}
                      onValueChange={(v) => setBankIdx(Number(v))}
                      className="flex flex-col gap-2"
                    >
                      {bankAccounts.map((acc, idx) => {
                        const selected = idx === bankIdx;
                        return (
                          <Label
                            key={`${acc.bank}-${idx}`}
                            htmlFor={`bank-${idx}`}
                            className={`flex items-center gap-3 border rounded-md px-3 py-3 cursor-pointer transition-colors ${
                              selected
                                ? "border-foreground bg-accent/30"
                                : "hover:bg-accent/20"
                            }`}
                          >
                            <RadioGroupItem
                              value={String(idx)}
                              id={`bank-${idx}`}
                            />
                            <span className="text-sm">
                              {acc.bank} - {acc.number} a.n. {acc.name}
                            </span>
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  </TabsContent>
                )}

                {availableTabs.includes("qris") && (
                  <TabsContent value="qris" className="pt-4">
                    {paymentMethods.qris?.imageUrl ? (
                      <img
                        src={paymentMethods.qris.imageUrl}
                        alt="QRIS"
                        className="max-w-xs mx-auto rounded-md border"
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        QRIS akan ditampilkan setelah order dibuat
                      </p>
                    )}
                  </TabsContent>
                )}

                {availableTabs.includes("cod") && (
                  <TabsContent value="cod" className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      Bayar di tempat saat barang diterima
                    </p>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ringkasan Pesanan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="shrink-0 size-12 rounded bg-muted overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0 text-sm">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.quantity} × {formatRp(item.price)}
                      </p>
                    </div>
                    <div className="text-sm font-medium shrink-0">
                      {formatRp(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex gap-2">
                <Input
                  placeholder="Kode voucher"
                  value={voucher}
                  onChange={(e) => setVoucher(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={applyVoucher}>
                  Pakai
                </Button>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatRp(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span>{formatRp(shippingCost)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-2 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">{formatRp(total)}</span>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
                style={{ background: "var(--st-primary)", color: "#fff" }}
              >
                {isSubmitting
                  ? "Memproses..."
                  : `Bayar Sekarang — ${formatRp(total)}`}
              </Button>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
