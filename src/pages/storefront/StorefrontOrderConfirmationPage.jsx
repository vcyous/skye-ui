import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrderDetail } from "../../services/api";

function formatPrice(value) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function StorefrontOrderConfirmationPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    getOrderDetail(orderId)
      .then((data) => setOrder(data))
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex flex-col items-center gap-4 text-center mb-8">
        <CheckCircle2 className="size-16 text-green-500" />
        <h2 className="text-2xl font-bold">Order Confirmed!</h2>
        <p className="text-muted-foreground">
          {order
            ? `Order #${order.orderNumber} — we'll reach out to confirm delivery details.`
            : "Your order has been placed."}
        </p>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <Button onClick={() => navigate("/storefront")}>
            Continue Shopping
          </Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/orders")}>
            View Orders (Admin)
          </Button>
        </div>
      </div>

      {order?.items?.length ? (
        <div className="bg-muted/40 rounded-xl p-6">
          <h5 className="font-semibold mb-4">Items Ordered</h5>
          <div className="flex flex-col gap-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between text-sm">
              <span className="font-semibold">Total</span>
              <span className="font-semibold">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
