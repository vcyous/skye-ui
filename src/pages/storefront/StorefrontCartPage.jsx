import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useStorefront } from "./StorefrontLayout";
import { useCart } from "../../context/CartContext";

function formatRp(v) {
  return `Rp ${Number(v || 0).toLocaleString("id-ID")}`;
}

export default function StorefrontCartPage() {
  const navigate = useNavigate();
  const { slug } = useStorefront();
  const { items, subtotal, updateItemQuantity, removeItem } = useCart();

  function decrement(item) {
    updateItemQuantity(item.id, Math.max(1, item.quantity - 1));
  }

  function increment(item) {
    updateItemQuantity(item.id, item.quantity + 1);
  }

  function handleManualQty(item, value) {
    const next = Math.max(1, Number(value || 1));
    updateItemQuantity(item.id, next);
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1
          className="text-2xl md:text-3xl font-bold mb-8"
          style={{ fontFamily: "var(--st-font-heading)", color: "var(--st-primary)" }}
        >
          Keranjang Belanja
        </h1>
        <div className="flex flex-col items-center gap-4 py-12">
          <div
            className="size-16 rounded-full flex items-center justify-center bg-muted"
          >
            <ShoppingBag className="size-7 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">Keranjang kosong</p>
          <Link to={`/s/${slug}/katalog`}>
            <Button
              className="mt-2"
              style={{ background: "var(--st-primary)", color: "#fff" }}
            >
              Mulai Belanja
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1
        className="text-2xl md:text-3xl font-bold mb-6"
        style={{ fontFamily: "var(--st-font-heading)", color: "var(--st-primary)" }}
      >
        Keranjang Belanja
      </h1>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-3 md:p-4">
                <div className="flex gap-3 md:gap-4 items-start">
                  <div className="shrink-0 size-[60px] md:size-20 rounded-md overflow-hidden bg-muted">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        {item.variantId && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Varian: {item.variantId}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {formatRp(item.price)}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-muted-foreground hover:text-destructive shrink-0"
                        aria-label="Hapus"
                      >
                        <X className="size-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center border rounded-md">
                        <button
                          onClick={() => decrement(item)}
                          className="p-1.5 hover:bg-accent disabled:opacity-50"
                          disabled={item.quantity <= 1}
                          aria-label="Kurangi"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={(e) => handleManualQty(item, e.target.value)}
                          className="w-10 text-center text-sm bg-transparent outline-none"
                        />
                        <button
                          onClick={() => increment(item)}
                          className="p-1.5 hover:bg-accent"
                          aria-label="Tambah"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <p className="font-semibold text-sm md:text-base">
                        {formatRp(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardContent className="p-4 md:p-5">
              <h2 className="font-semibold text-base mb-4">Ringkasan</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatRp(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diskon</span>
                  <span>-Rp 0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span className="text-xs text-muted-foreground">
                    dihitung di checkout
                  </span>
                </div>
              </div>
              <Separator className="my-4" />
              <div className="flex justify-between items-baseline mb-4">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-lg">{formatRp(subtotal)}</span>
              </div>
              <Button
                className="w-full"
                size="lg"
                disabled={items.length === 0}
                onClick={() => navigate(`/s/${slug}/checkout`)}
                style={{ background: "var(--st-primary)", color: "#fff" }}
              >
                Lanjut ke Checkout
              </Button>
              <Link
                to={`/s/${slug}/katalog`}
                className="block text-center text-sm text-muted-foreground hover:text-foreground mt-3"
              >
                ← Lanjut belanja
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
