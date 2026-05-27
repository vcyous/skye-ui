import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCart } from "../../context/CartContext";
import { useLocalization } from "../../context/LocalizationContext";
import {
  createOrderFromCart,
  getCheckoutSnapshot,
  revalidateCheckout,
} from "../../services/api";

const checkoutSteps = [
  { key: "cart_review", title: "Cart" },
  { key: "customer_info", title: "Customer" },
  { key: "shipping", title: "Shipping" },
  { key: "payment", title: "Payment" },
  { key: "review", title: "Review" },
];

function resolveStepIndex(step) {
  const index = checkoutSteps.findIndex((item) => item.key === step);
  return index >= 0 ? index : 0;
}

function CheckoutStepper({ activeIndex }) {
  return (
    <div className="flex items-center gap-0">
      {checkoutSteps.map((step, i) => (
        <div key={step.key} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={[
                "size-7 rounded-full flex items-center justify-center text-xs font-semibold",
                i < activeIndex
                  ? "bg-primary text-primary-foreground"
                  : i === activeIndex
                  ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {i < activeIndex ? <CheckCircle2 className="size-4" /> : i + 1}
            </div>
            <span className="text-xs mt-1 text-muted-foreground">{step.title}</span>
          </div>
          {i < checkoutSteps.length - 1 && (
            <div
              className={[
                "h-px w-10 mx-1 mb-4",
                i < activeIndex ? "bg-primary" : "bg-border",
              ].join(" ")}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { formatCurrency, activeCurrency } = useLocalization();
  const {
    refreshCart,
    checkoutRecovery,
    checkoutRecoveryError,
    saveCheckoutRecovery,
    clearCheckoutRecovery,
    refreshCheckoutRecovery,
  } = useCart();

  const [snapshot, setSnapshot] = useState({
    cart: { items: [], subtotal: 0 },
    discounts: [],
    paymentMethods: [],
    shippingMethods: [],
    taxRules: [],
    recovery: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [currentStep, setCurrentStep] = useState("cart_review");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRevalidating, setIsRevalidating] = useState(false);
  const [revalidation, setRevalidation] = useState(null);
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const saveTimerRef = useRef(null);

  const {
    register,
    handleSubmit,
    control,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm();

  const activeStepIndex = useMemo(
    () => resolveStepIndex(currentStep),
    [currentStep],
  );

  async function loadCheckout() {
    setLoadError("");
    setIsLoading(true);

    try {
      const data = await getCheckoutSnapshot();
      setSnapshot(data);

      const recoveryFormData =
        data?.recovery?.formData || checkoutRecovery?.formData || {};
      const nextCurrency =
        recoveryFormData.displayCurrency ||
        activeCurrency ||
        data?.currencySettings?.baseCurrency ||
        data?.store?.currencyCode ||
        "USD";

      reset({ ...recoveryFormData, displayCurrency: nextCurrency });
      setDisplayCurrency(nextCurrency);

      const restoredStep =
        data?.recovery?.state || checkoutRecovery?.state || "cart_review";
      setCurrentStep(restoredStep);

      if (data?.recovery?.revalidation) {
        setRevalidation(data.recovery.revalidation);
      }
    } catch (err) {
      setLoadError(err.message || "Failed to load checkout.");
      toast.error("Failed to load checkout", {
        description: err.message || "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCheckout();
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (checkoutRecoveryError) {
      toast.warning(checkoutRecoveryError);
    }
  }, [checkoutRecoveryError]);

  function persistDraft(nextState = currentStep) {
    const values = getValues();
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveCheckoutRecovery({
        state: nextState,
        status: "in_progress",
        formData: values,
        revalidation,
        note: "Autosave checkout progress",
      }).catch(() => null);
    }, 300);
  }

  async function moveStep(direction) {
    const nextIndex = Math.max(
      0,
      Math.min(checkoutSteps.length - 1, activeStepIndex + direction),
    );
    const nextStep = checkoutSteps[nextIndex].key;
    setCurrentStep(nextStep);
    try {
      await saveCheckoutRecovery({
        state: nextStep,
        status: "in_progress",
        formData: getValues(),
        revalidation,
        note: `Moved to ${nextStep}`,
      });
    } catch (err) {
      toast.warning(err.message || "Failed to persist step transition.");
    }
  }

  async function handleRevalidate() {
    setIsRevalidating(true);
    const values = getValues();
    try {
      const result = await revalidateCheckout(values);
      setRevalidation(result);
      await saveCheckoutRecovery({
        state: currentStep,
        status: result.ok ? "in_progress" : "failed",
        formData: values,
        revalidation: result,
        lastError: result.ok
          ? null
          : result.issues.map((item) => item.message).join("; "),
        note: "Manual checkout revalidation",
      });
      if (result.ok) {
        toast.success("Checkout revalidation passed.");
      } else {
        toast.warning("Revalidation found issues. Resolve them before submitting.");
      }
    } catch (err) {
      toast.error(err.message || "Checkout revalidation failed.");
    } finally {
      setIsRevalidating(false);
    }
  }

  async function onSubmit(values) {
    setIsSubmitting(true);
    try {
      const order = await createOrderFromCart({
        ...values,
        checkoutState: "review",
        formData: values,
        displayCurrency: values.displayCurrency,
      });
      await clearCheckoutRecovery();
      await refreshCheckoutRecovery();
      await refreshCart();
      navigate(`/orders/${order.id}`, { replace: true });
    } catch (err) {
      await saveCheckoutRecovery({
        state: "failed",
        status: "failed",
        formData: values,
        revalidation,
        lastError: err.message || "Checkout failed",
        note: "Checkout submit failed",
      }).catch(() => null);
      toast.error(err.message || "Checkout failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <span className="text-muted-foreground">Loading checkout...</span>
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <span className="text-destructive">{loadError}</span>
          <Button variant="outline" onClick={loadCheckout}>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  if (!snapshot.cart.items.length) {
    return (
      <Card>
        <CardContent className="grid place-items-center p-8 text-muted-foreground gap-4">
          <p>Cart is empty. Add products before checkout.</p>
          <Button onClick={() => navigate("/dashboard/cart")}>Go to Cart</Button>
        </CardContent>
      </Card>
    );
  }

  const enabledCurrencies = snapshot.currencySettings?.enabledCurrencies || [
    snapshot.store?.currencyCode || "USD",
  ];
  const displayCurrencyCode =
    revalidation?.currencyQuote?.displayCurrency ||
    snapshot.store?.currencyCode ||
    "USD";

  function fmtConverted(convertedVal, fallbackVal) {
    return formatCurrency(convertedVal ?? fallbackVal, displayCurrencyCode);
  }

  return (
    <section className="grid gap-4">
      <header>
        <h3 className="text-xl font-semibold">Checkout</h3>
        <p className="text-muted-foreground">
          Complete customer, shipping, and payment flow with recovery-safe state transitions.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Checkout Progress</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <CheckoutStepper activeIndex={activeStepIndex} />
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveStep(-1)}
              disabled={activeStepIndex <= 0 || isSubmitting}
            >
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => moveStep(1)}
              disabled={activeStepIndex >= checkoutSteps.length - 1 || isSubmitting}
            >
              Next
            </Button>
            <Badge variant="secondary">
              Recovery:{" "}
              {snapshot.recovery?.status || checkoutRecovery?.status || "in_progress"}
            </Badge>
            <Badge variant="outline">Display currency: {displayCurrency}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,_340px)] gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Customer and Shipping</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              id="checkout-form"
              onSubmit={handleSubmit(onSubmit)}
              onChange={() => persistDraft(currentStep)}
              className="flex flex-col gap-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label>Customer Name <span className="text-destructive">*</span></Label>
                  <Input {...register("customerName", { required: "Customer name is required." })} />
                  {errors.customerName && (
                    <span className="text-xs text-destructive">{errors.customerName.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Customer Email</Label>
                  <Input
                    {...register("customerEmail", {
                      pattern: { value: /\S+@\S+\.\S+/, message: "Enter a valid email." },
                    })}
                  />
                  {errors.customerEmail && (
                    <span className="text-xs text-destructive">{errors.customerEmail.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Customer Phone</Label>
                  <Input {...register("customerPhone")} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Country <span className="text-destructive">*</span></Label>
                  <Input
                    defaultValue="Indonesia"
                    {...register("country", { required: "Country is required." })}
                  />
                  {errors.country && (
                    <span className="text-xs text-destructive">{errors.country.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label>Address <span className="text-destructive">*</span></Label>
                  <Input {...register("addressLine1", { required: "Address is required." })} />
                  {errors.addressLine1 && (
                    <span className="text-xs text-destructive">{errors.addressLine1.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>City <span className="text-destructive">*</span></Label>
                  <Input {...register("city", { required: "City is required." })} />
                  {errors.city && (
                    <span className="text-xs text-destructive">{errors.city.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Postal Code <span className="text-destructive">*</span></Label>
                  <Input {...register("postalCode", { required: "Postal code is required." })} />
                  {errors.postalCode && (
                    <span className="text-xs text-destructive">{errors.postalCode.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Display Currency <span className="text-destructive">*</span></Label>
                  <Controller
                    name="displayCurrency"
                    control={control}
                    defaultValue={displayCurrency}
                    rules={{ required: "Choose a display currency." }}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => {
                          field.onChange(v);
                          setDisplayCurrency(v);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select display currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {enabledCurrencies.map((code) => (
                            <SelectItem key={code} value={code}>{code}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.displayCurrency && (
                    <span className="text-xs text-destructive">{errors.displayCurrency.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Payment Method <span className="text-destructive">*</span></Label>
                  <Controller
                    name="paymentMethodId"
                    control={control}
                    rules={{ required: "Choose a payment method." }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshot.paymentMethods.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.displayName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.paymentMethodId && (
                    <span className="text-xs text-destructive">{errors.paymentMethodId.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Shipping Method <span className="text-destructive">*</span></Label>
                  <Controller
                    name="shippingMethodId"
                    control={control}
                    rules={{ required: "Choose a shipping method." }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select shipping method" />
                        </SelectTrigger>
                        <SelectContent>
                          {snapshot.shippingMethods.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({formatCurrency(item.baseRate, snapshot.store?.currencyCode || "USD")})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.shippingMethodId && (
                    <span className="text-xs text-destructive">{errors.shippingMethodId.message}</span>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Discount Code(s)</Label>
                  <Input
                    placeholder="Enter one or more codes (comma-separated)"
                    {...register("discountCode")}
                  />
                </div>

                <div className="flex flex-col gap-1.5 md:col-span-2">
                  <Label>Order Note</Label>
                  <Textarea rows={3} {...register("note")} />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {snapshot.taxRules.length ? (
                  snapshot.taxRules.map((item) => (
                    <Badge key={item.id} variant="secondary">
                      {item.name}: {item.taxRate}% for {item.regionCode}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No active tax rules configured. Manual tax defaults to 0.
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRevalidate}
                  disabled={isRevalidating}
                >
                  {isRevalidating ? "Revalidating..." : "Revalidate Checkout"}
                </Button>
                <Button type="submit" form="checkout-form" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Order"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {revalidation?.currencyQuote?.usedFallback && (
              <Alert>
                <AlertCircle className="size-4" />
                <AlertDescription>
                  Using fallback FX rate (1:1). Add rate snapshots for better currency accuracy.
                </AlertDescription>
              </Alert>
            )}

            {snapshot.cart.items.map((item) => (
              <div key={item.id} className="flex justify-between gap-3">
                <span className="text-sm">
                  {item.productName} x {item.quantity}
                </span>
                <span className="text-sm font-semibold">
                  {formatCurrency(
                    revalidation?.currencyQuote
                      ? Number(item.lineTotal || 0) * Number(revalidation.currencyQuote.rate || 1)
                      : item.lineTotal,
                    displayCurrencyCode,
                  )}
                </span>
              </div>
            ))}

            <Separator />

            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Subtotal</span>
              <span className="text-sm font-semibold">
                {fmtConverted(
                  revalidation?.currencyQuote?.converted?.subtotal,
                  snapshot.cart.subtotal,
                )}
              </span>
            </div>

            {revalidation?.pricing && (
              <>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Discount</span>
                  <span className="text-sm font-semibold">
                    {fmtConverted(
                      revalidation.currencyQuote?.converted?.discountAmount,
                      revalidation.pricing.discountAmount,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Shipping</span>
                  <span className="text-sm font-semibold">
                    {fmtConverted(
                      revalidation.currencyQuote?.converted?.shippingAmount,
                      revalidation.pricing.shippingAmount,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Taxable</span>
                  <span className="text-sm font-semibold">
                    {fmtConverted(
                      revalidation.currencyQuote?.converted?.taxableAmount,
                      revalidation.pricing.taxableAmount,
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Tax</span>
                  <span className="text-sm font-semibold">
                    {fmtConverted(
                      revalidation.currencyQuote?.converted?.taxAmount,
                      revalidation.pricing.taxAmount,
                    )}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  Tax mode: {revalidation.pricing.taxBehavior || "exclusive"}{" "}
                  ({Number(revalidation.pricing.taxRate || 0).toFixed(2)}%)
                </span>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-sm">Estimated Total</span>
                  <span className="text-sm font-semibold">
                    {fmtConverted(
                      revalidation.currencyQuote?.converted?.totalAmount,
                      revalidation.pricing.totalAmount,
                    )}
                  </span>
                </div>
              </>
            )}

            {revalidation?.issues?.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>
                  <strong>Revalidation issues:</strong>{" "}
                  {revalidation.issues.map((item) => item.message).join("; ")}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
