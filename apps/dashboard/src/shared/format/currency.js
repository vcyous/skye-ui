const DEFAULT_LOCALE = "en-US";
const DEFAULT_CURRENCY = "USD";

export function formatCurrency(value, options = {}) {
  const { currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE } = options;
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
