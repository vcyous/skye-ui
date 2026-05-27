import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useCart } from "../../context/CartContext";
import { createOrderFromCart, getCheckoutSnapshot } from "../../services/api";

function formatPrice(value) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function StorefrontCheckoutPage() {
  const navigate = useNavigate();
  const { cart, refreshCart } = useCart();
  const [snapshot, setSnapshot] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({ defaultValues: { country: "Indonesia" } });

  useEffect(() => {
    if (!cart.items.length) {
      navigate("/storefront/cart");
      return;
    }
    getCheckoutSnapshot()
      .then((data) => setSnapshot(data))
      .catch(() => null)
      .finally(() => setIsLoading(false));
  }, [cart.items.length, navigate]);

  async function onSubmit(values) {
    setIsSubmitting(true);
    try {
      const order = await createOrderFromCart({
        ...values,
        checkoutState: "review",
        formData: values,
      });
      await refreshCart();
      navigate(`/storefront/order-confirmed/${order.id}`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Checkout failed. Please try again.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const paymentMethods = snapshot.paymentMethods ?? [];
  const shippingMethods = snapshot.shippingMethods ?? [];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <Button
        variant="link"
        className="px-0 mb-5"
        onClick={() => navigate("/storefront/cart")}
      >
        ← Back to Cart
      </Button>
      <h2 className="text-2xl font-bold mb-6">Checkout</h2>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <h4 className="text-base font-semibold">Customer Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label htmlFor="customerName">Full Name</Label>
              <Input
                id="customerName"
                placeholder="John Doe"
                {...register("customerName", { required: "Name is required." })}
              />
              {errors.customerName && (
                <span className="text-destructive text-xs">{errors.customerName.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="customerEmail">Email Address</Label>
              <Input
                id="customerEmail"
                type="email"
                placeholder="john@example.com"
                {...register("customerEmail", {
                  required: "Enter a valid email.",
                  pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email." },
                })}
              />
              {errors.customerEmail && (
                <span className="text-destructive text-xs">{errors.customerEmail.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="customerPhone">Phone Number</Label>
              <Input
                id="customerPhone"
                placeholder="+62 812 3456 7890"
                {...register("customerPhone")}
              />
            </div>
          </div>

          <h4 className="text-base font-semibold">Shipping Address</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 flex flex-col gap-1">
              <Label htmlFor="addressLine1">Street Address</Label>
              <Input
                id="addressLine1"
                placeholder="Jl. Sudirman No. 1"
                {...register("addressLine1", { required: "Address is required." })}
              />
              {errors.addressLine1 && (
                <span className="text-destructive text-xs">{errors.addressLine1.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="Jakarta"
                {...register("city", { required: "City is required." })}
              />
              {errors.city && (
                <span className="text-destructive text-xs">{errors.city.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input
                id="postalCode"
                placeholder="12190"
                {...register("postalCode", { required: "Postal code is required." })}
              />
              {errors.postalCode && (
                <span className="text-destructive text-xs">{errors.postalCode.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                {...register("country", { required: true })}
              />
            </div>
          </div>

          <h4 className="text-base font-semibold">Delivery & Payment</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <Label>Shipping Method</Label>
              <Controller
                name="shippingMethodId"
                control={control}
                rules={{ required: "Select a shipping method." }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select shipping" />
                    </SelectTrigger>
                    <SelectContent>
                      {shippingMethods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name} — {formatPrice(m.baseRate)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.shippingMethodId && (
                <span className="text-destructive text-xs">{errors.shippingMethodId.message}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label>Payment Method</Label>
              <Controller
                name="paymentMethodId"
                control={control}
                rules={{ required: "Select a payment method." }}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.displayName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.paymentMethodId && (
                <span className="text-destructive text-xs">{errors.paymentMethodId.message}</span>
              )}
            </div>
            <div className="md:col-span-2 flex flex-col gap-1">
              <Label htmlFor="note">Order Note (optional)</Label>
              <Textarea
                id="note"
                rows={2}
                placeholder="Special instructions..."
                {...register("note")}
              />
            </div>
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
            {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
            Place Order
          </Button>
        </form>

        <div className="lg:w-80 bg-muted/40 rounded-xl p-6 h-fit">
          <h4 className="text-base font-semibold mb-4">Order Summary</h4>
          <div className="flex flex-col gap-2">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>
                  {item.productName} × {item.quantity}
                </span>
                <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">{formatPrice(cart.subtotal)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
