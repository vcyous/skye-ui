export const SUPPORTED_CURRENCIES = ["USD", "IDR"];

export const CURRENCY_MINOR_UNITS = {
  USD: 2,
  IDR: 0,
};

export function normalizeCurrencyCode(value, fallback = "USD") {
  const normalized = String(value || "").trim().toUpperCase();
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : fallback;
}

export function roundCurrencyAmount(amount, currencyCode = "USD") {
  const decimals = CURRENCY_MINOR_UNITS[currencyCode] ?? 2;
  const factor = 10 ** decimals;
  return Math.round(Number(amount || 0) * factor) / factor;
}

export async function getCurrencySettings() {
  return {
    baseCurrency: "USD",
    fallbackCurrency: "USD",
    enabledCurrencies: ["USD"],
    roundingPolicy: "half_up",
  };
}

export async function updateCurrencySettings() {
  return getCurrencySettings();
}

export async function getCurrencyRateSnapshots() {
  return [];
}

export async function upsertCurrencyRateSnapshot() {
  return null;
}

export async function getCurrencyConversionQuote(options = {}) {
  const amount = Number(options.amount || 0);
  const currency = normalizeCurrencyCode(options.fromCurrency || options.currency, "USD");
  return {
    fromCurrency: currency,
    toCurrency: currency,
    rate: 1,
    amount,
    convertedAmount: amount,
    quotedAt: new Date().toISOString(),
  };
}
