import { CheckoutForm } from "@/components/checkout-form";

type ShippingOption = { name: string; etaDays: string; price: number };
type BankAccount = { bank: string; name: string; number: string };
type EnabledMethods = { bank: boolean; qris: boolean; cod: boolean };

export function ChicoraCheckout({
  shippingOptions,
  bankAccounts,
  enabledMethods,
  primary,
}: {
  shippingOptions: ShippingOption[];
  bankAccounts: BankAccount[];
  enabledMethods: EnabledMethods;
  primary: string;
}) {
  const steps = [
    { label: "Keranjang", icon: "🛒" },
    { label: "Pengiriman", icon: "📦" },
    { label: "Pembayaran", icon: "💳" },
    { label: "Konfirmasi", icon: "✅" },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Step progress indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-center gap-0">
          {steps.map((step, i) => (
            <div key={step.label} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white transition-colors"
                  style={{
                    backgroundColor:
                      i === 1 ? primary : i < 1 ? primary : "#d4d4d8",
                    opacity: i === 1 ? 1 : i < 1 ? 0.6 : 0.5,
                  }}
                >
                  {i < 1 ? "✓" : i + 1}
                </div>
                <span
                  className="hidden text-[10px] font-medium sm:block"
                  style={{ color: i === 1 ? primary : "#a1a1aa" }}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className="mx-1 h-0.5 w-8 sm:w-16"
                  style={{
                    backgroundColor: i < 1 ? primary : "#e4e4e7",
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Checkout</h1>

      <CheckoutForm
        shippingOptions={shippingOptions}
        bankAccounts={bankAccounts}
        enabledMethods={enabledMethods}
      />
    </div>
  );
}
