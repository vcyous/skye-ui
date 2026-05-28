import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStoreBySlug } from "@/lib/store";
import { CheckoutForm } from "@/components/checkout-form";

const DEFAULT_SHIPPING = [
  { name: "JNE Reg", etaDays: "2-3", price: 15000 },
  { name: "JNE YES", etaDays: "1-2", price: 25000 },
  { name: "SiCepat", etaDays: "2-3", price: 14000 },
];

const DEFAULT_BANK_ACCOUNTS = [
  { bank: "BCA", name: "Toko", number: "1234567890" },
];

export default async function CheckoutPage() {
  const h = await headers();
  const slug = h.get("x-store-slug");
  if (!slug) notFound();

  const store = await getStoreBySlug(slug);
  if (!store) notFound();

  const settings = (store.settings ?? {}) as Record<string, unknown>;
  const shippingOptions =
    Array.isArray(settings.shippingOptions) && settings.shippingOptions.length > 0
      ? (settings.shippingOptions as typeof DEFAULT_SHIPPING)
      : DEFAULT_SHIPPING;

  const pm = (settings.paymentMethods ?? {}) as Record<string, any>;
  const bankAccounts =
    Array.isArray(pm.bankTransfer?.accounts) && pm.bankTransfer.accounts.length > 0
      ? pm.bankTransfer.accounts
      : DEFAULT_BANK_ACCOUNTS;
  const enabledMethods = {
    bank: pm.bankTransfer?.enabled ?? true,
    qris: pm.qris?.enabled ?? false,
    cod: pm.cod?.enabled ?? false,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Checkout</h1>
      <CheckoutForm
        shippingOptions={shippingOptions}
        bankAccounts={bankAccounts}
        enabledMethods={enabledMethods}
      />
    </div>
  );
}
