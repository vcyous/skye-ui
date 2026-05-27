import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "../../context/CartContext";

function formatPrice(value) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function StorefrontCartPage() {
  const navigate = useNavigate();
  const { cart, isLoading, refreshCart, updateItemQuantity, removeItem } =
    useCart();

  useEffect(() => {
    refreshCart().catch(() => null);
  }, [refreshCart]);

  async function handleQuantityChange(item, value) {
    try {
      await updateItemQuantity(item.id, value ?? 0);
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not update quantity.";
      toast.error(msg);
    }
  }

  async function handleRemove(item) {
    try {
      await removeItem(item.id);
      toast.success("Item removed");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not remove item.";
      toast.error(msg);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Your Cart</h2>
        <Button
          variant="link"
          className="px-0"
          onClick={() => navigate("/storefront")}
        >
          ← Continue Shopping
        </Button>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span>Loading cart...</span>
        </div>
      )}

      {!isLoading && cart.items.length === 0 && (
        <div className="text-center py-12">
          <h4 className="text-lg font-semibold text-muted-foreground mb-4">
            Your cart is empty
          </h4>
          <Button onClick={() => navigate("/storefront")}>
            Browse Products
          </Button>
        </div>
      )}

      {!isLoading && cart.items.length > 0 && (
        <>
          <div className="flex flex-col gap-3">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center py-3 border-b"
              >
                <div>
                  <p className="font-semibold">{item.productName}</p>
                  <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                </div>

                <span className="text-sm">{formatPrice(item.unitPrice)}</span>

                <input
                  type="number"
                  min={1}
                  max={item.stock}
                  value={item.quantity}
                  onChange={(e) =>
                    handleQuantityChange(item, Math.max(1, Number(e.target.value)))
                  }
                  className="w-16 border rounded-md px-2 py-1 text-sm"
                />

                <div className="flex flex-col items-end gap-1">
                  <span className="font-semibold text-sm">
                    {formatPrice(item.lineTotal)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive px-0 h-auto"
                    onClick={() => handleRemove(item)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Subtotal</p>
              <p className="text-2xl font-bold">{formatPrice(cart.subtotal)}</p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate("/storefront/checkout")}
            >
              Proceed to Checkout →
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
