// @ts-nocheck
/**
 * currencyService — Multi-currency settings, FX rate snapshots, and conversion quotes
 *
 * Domain: Multi-Currency
 * Feature: 21
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError, isMissingTableError } from "./utils/errorUtils.js";
import { tableExists } from "./utils/dbUtils.js";
import { getStoreContext } from "./storeService.js";

export const SUPPORTED_CURRENCIES = [
  "USD",
  "IDR",
  "SGD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
];

export const CURRENCY_MINOR_UNITS = {
  USD: 2,
  IDR: 0,
  SGD: 2,
  EUR: 2,
  GBP: 2,
  JPY: 0,
  AUD: 2,
  CAD: 2,
};

export function normalizeCurrencyCode(value, fallback = "USD") {
  const normalized = String(value || "")
    .trim()
    .toUpperCase();
  if (!normalized) {
    return fallback;
  }
  return SUPPORTED_CURRENCIES.includes(normalized) ? normalized : fallback;
}

function normalizeCurrencyList(values = [], fallback = ["USD", "IDR"]) {
  const source = Array.isArray(values) ? values : [values];
  const normalized = Array.from(
    new Set(
      source.map((item) => normalizeCurrencyCode(item, "")).filter(Boolean),
    ),
  );
  return normalized.length ? normalized : fallback;
}

export function roundCurrencyAmount(
  amount,
  currencyCode,
  roundingPolicy = "half_up",
) {
  const decimals = CURRENCY_MINOR_UNITS[currencyCode] ?? 2;
  const factor = 10 ** decimals;
  const value = Number(amount || 0) * factor;

  if (roundingPolicy === "down") {
    return Number((Math.floor(value) / factor).toFixed(decimals));
  }

  if (roundingPolicy === "up") {
    return Number((Math.ceil(value) / factor).toFixed(decimals));
  }

  return Number((Math.round(value) / factor).toFixed(decimals));
}

async function resolveLatestFxRate(storeId, baseCurrency, quoteCurrency) {
  if (baseCurrency === quoteCurrency) {
    return {
      rate: 1,
      source: "identity",
      confidence: 1,
      asOf: new Date().toISOString(),
      stale: false,
      fallback: false,
    };
  }

  if (!(await tableExists("currency_rate_snapshots"))) {
    return {
      rate: 1,
      source: "fallback",
      confidence: 0,
      asOf: new Date().toISOString(),
      stale: true,
      fallback: true,
    };
  }

  const nowIso = new Date().toISOString();
  let { data, error } = await supabase
    .from("currency_rate_snapshots")
    .select("rate, source, confidence, as_of, expires_at")
    .eq("store_id", storeId)
    .eq("base_currency", baseCurrency)
    .eq("quote_currency", quoteCurrency)
    .gte("expires_at", nowIso)
    .order("as_of", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && isMissingTableError(error, "currency_rate_snapshots")) {
    return {
      rate: 1,
      source: "fallback",
      confidence: 0,
      asOf: new Date().toISOString(),
      stale: true,
      fallback: true,
    };
  }

  if (error) {
    throw normalizeError(error);
  }

  if (!data) {
    const stale = await supabase
      .from("currency_rate_snapshots")
      .select("rate, source, confidence, as_of, expires_at")
      .eq("store_id", storeId)
      .eq("base_currency", baseCurrency)
      .eq("quote_currency", quoteCurrency)
      .order("as_of", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (
      stale.error &&
      !isMissingTableError(stale.error, "currency_rate_snapshots")
    ) {
      throw normalizeError(stale.error);
    }

    data = stale.data || null;
  }

  if (!data) {
    return {
      rate: 1,
      source: "fallback",
      confidence: 0,
      asOf: new Date().toISOString(),
      stale: true,
      fallback: true,
    };
  }

  return {
    rate: Number(data.rate || 1),
    source: data.source || "manual",
    confidence: Number(data.confidence || 0),
    asOf: data.as_of,
    stale: Boolean(data.expires_at && data.expires_at < nowIso),
    fallback: false,
  };
}

export async function getCurrencySettings() {
  const { store } = await getStoreContext();
  const baseCurrency = normalizeCurrencyCode(
    store.currency || store.currency_code || "USD",
    "USD",
  );

  if (!(await tableExists("currency_settings"))) {
    return {
      baseCurrency,
      fallbackCurrency: baseCurrency,
      enabledCurrencies: normalizeCurrencyList([baseCurrency, "USD", "IDR"]),
      roundingPolicy: "half_up",
      source: "store",
    };
  }

  const { data, error } = await supabase
    .from("currency_settings")
    .select(
      "base_currency, fallback_currency, enabled_currencies, rounding_policy, updated_at",
    )
    .eq("store_id", store.id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "currency_settings")) {
      return {
        baseCurrency,
        fallbackCurrency: baseCurrency,
        enabledCurrencies: normalizeCurrencyList([baseCurrency, "USD", "IDR"]),
        roundingPolicy: "half_up",
        source: "store",
      };
    }
    throw normalizeError(error);
  }

  return {
    baseCurrency: normalizeCurrencyCode(
      data?.base_currency || baseCurrency,
      baseCurrency,
    ),
    fallbackCurrency: normalizeCurrencyCode(
      data?.fallback_currency || baseCurrency,
      baseCurrency,
    ),
    enabledCurrencies: normalizeCurrencyList(
      data?.enabled_currencies || [baseCurrency, "USD", "IDR"],
      [baseCurrency, "USD", "IDR"],
    ),
    roundingPolicy: String(data?.rounding_policy || "half_up"),
    source: data ? "currency_settings" : "store",
    updatedAt: data?.updated_at || null,
  };
}

export async function updateCurrencySettings(payload = {}) {
  const { store } = await getStoreContext();
  const current = await getCurrencySettings();
  const baseCurrency = normalizeCurrencyCode(
    payload.baseCurrency || current.baseCurrency,
    current.baseCurrency,
  );
  const fallbackCurrency = normalizeCurrencyCode(
    payload.fallbackCurrency || current.fallbackCurrency || baseCurrency,
    baseCurrency,
  );
  const enabledCurrencies = normalizeCurrencyList(
    payload.enabledCurrencies || current.enabledCurrencies,
    [baseCurrency],
  );

  if (!enabledCurrencies.includes(baseCurrency)) {
    enabledCurrencies.unshift(baseCurrency);
  }

  const roundingPolicy = ["half_up", "up", "down"].includes(
    String(payload.roundingPolicy || current.roundingPolicy || "half_up"),
  )
    ? String(payload.roundingPolicy || current.roundingPolicy || "half_up")
    : "half_up";

  if (await tableExists("currency_settings")) {
    const { error } = await supabase.from("currency_settings").upsert(
      {
        store_id: store.id,
        base_currency: baseCurrency,
        fallback_currency: fallbackCurrency,
        enabled_currencies: enabledCurrencies,
        rounding_policy: roundingPolicy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    );

    if (error && !isMissingTableError(error, "currency_settings")) {
      throw normalizeError(error);
    }
  }

  const { error: storeError } = await supabase
    .from("stores")
    .update({
      currency: baseCurrency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id);

  if (storeError) {
    throw normalizeError(storeError);
  }

  return getCurrencySettings();
}

export async function getCurrencyRateSnapshots(baseCurrency) {
  const { store } = await getStoreContext();
  const base = normalizeCurrencyCode(
    baseCurrency || store.currency || "USD",
    "USD",
  );
  if (!(await tableExists("currency_rate_snapshots"))) {
    return [];
  }

  const { data, error } = await supabase
    .from("currency_rate_snapshots")
    .select(
      "id, base_currency, quote_currency, rate, source, confidence, as_of, expires_at",
    )
    .eq("store_id", store.id)
    .eq("base_currency", base)
    .order("as_of", { ascending: false });

  if (error) {
    if (isMissingTableError(error, "currency_rate_snapshots")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((row) => ({
    id: row.id,
    baseCurrency: row.base_currency,
    quoteCurrency: row.quote_currency,
    rate: Number(row.rate || 0),
    source: row.source || "manual",
    confidence: Number(row.confidence || 0),
    asOf: row.as_of,
    expiresAt: row.expires_at,
  }));
}

export async function upsertCurrencyRateSnapshot(payload = {}) {
  const { store } = await getStoreContext();
  const baseCurrency = normalizeCurrencyCode(
    payload.baseCurrency || store.currency || "USD",
    "USD",
  );
  const quoteCurrency = normalizeCurrencyCode(
    payload.quoteCurrency || "USD",
    "USD",
  );

  if (baseCurrency === quoteCurrency) {
    throw new Error("Base and quote currency must be different");
  }

  const rate = Number(payload.rate || 0);
  if (rate <= 0) {
    throw new Error("Rate must be greater than 0");
  }

  if (!(await tableExists("currency_rate_snapshots"))) {
    throw new Error(
      "Currency rate schema missing. Run Feature 19 migration before updating rates.",
    );
  }

  const asOf = payload.asOf || new Date().toISOString();
  const expiresAt =
    payload.expiresAt ||
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const source = String(payload.source || "manual").trim() || "manual";
  const confidence = Number(payload.confidence ?? 0.95);

  const { error } = await supabase.from("currency_rate_snapshots").upsert(
    {
      store_id: store.id,
      base_currency: baseCurrency,
      quote_currency: quoteCurrency,
      rate,
      source,
      confidence,
      as_of: asOf,
      expires_at: expiresAt,
      metadata_json: payload.metadata || {},
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,base_currency,quote_currency,as_of" },
  );

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getCurrencyConversionQuote(options = {}) {
  const { store } = await getStoreContext();
  const settings = await getCurrencySettings();
  const baseCurrency = normalizeCurrencyCode(
    options.baseCurrency || settings.baseCurrency || store.currency || "USD",
    "USD",
  );
  const displayCurrency = normalizeCurrencyCode(
    options.displayCurrency || baseCurrency,
    baseCurrency,
  );
  const roundingPolicy = settings.roundingPolicy || "half_up";
  const amounts = {
    subtotal: Number(options.subtotal || 0),
    discountAmount: Number(options.discountAmount || 0),
    shippingAmount: Number(options.shippingAmount || 0),
    taxableAmount: Number(options.taxableAmount || 0),
    taxAmount: Number(options.taxAmount || 0),
    totalAmount: Number(options.totalAmount || 0),
  };

  const rateInfo = await resolveLatestFxRate(
    store.id,
    baseCurrency,
    displayCurrency,
  );

  const converted = Object.entries(amounts).reduce((acc, [key, value]) => {
    acc[key] = roundCurrencyAmount(
      Number(value || 0) * Number(rateInfo.rate || 1),
      displayCurrency,
      roundingPolicy,
    );
    return acc;
  }, {});

  return {
    baseCurrency,
    displayCurrency,
    rate: Number(rateInfo.rate || 1),
    source: rateInfo.source,
    confidence: Number(rateInfo.confidence || 0),
    asOf: rateInfo.asOf,
    stale: Boolean(rateInfo.stale),
    usedFallback: Boolean(rateInfo.fallback),
    roundingPolicy,
    amounts,
    converted,
  };
}
