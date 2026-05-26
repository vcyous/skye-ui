/**
 * localizationService — Locale settings, translation management, and fallback event recording
 *
 * Domain: Localization / i18n
 * Feature: 21
 * Depends on: supabaseClient, utils/errorUtils, storeService
 */

import { supabase } from "./supabaseClient.js";
import { normalizeError, isMissingTableError } from "./utils/errorUtils.js";
import { tableExists } from "./utils/dbUtils.js";
import { getStoreContext } from "./storeService.js";

export const SUPPORTED_LOCALES = ["en", "id", "ms", "fr", "de", "es", "pt-BR"];

export function normalizeLocaleCode(value, fallback = "en") {
  const input = String(value || "")
    .trim()
    .replace("_", "-");
  if (!input) {
    return fallback;
  }

  const [language, region] = input.split("-");
  const normalizedLanguage = String(language || "").toLowerCase();
  const normalizedRegion = region ? String(region).toUpperCase() : null;
  const combined = normalizedRegion
    ? `${normalizedLanguage}-${normalizedRegion}`
    : normalizedLanguage;

  if (SUPPORTED_LOCALES.includes(combined)) {
    return combined;
  }

  if (SUPPORTED_LOCALES.includes(normalizedLanguage)) {
    return normalizedLanguage;
  }

  return fallback;
}

function normalizeLocaleList(input = []) {
  const values = Array.isArray(input) ? input : [input];
  const unique = Array.from(
    new Set(
      values.map((item) => normalizeLocaleCode(item, "")).filter(Boolean),
    ),
  );
  return unique.length ? unique : ["en", "id"];
}

function normalizeTranslationNamespace(value) {
  const namespace = String(value || "admin")
    .trim()
    .toLowerCase();
  return namespace || "admin";
}

export async function getLocalizationSettings() {
  const { store } = await getStoreContext();
  const defaultLocale = normalizeLocaleCode(store.locale || "id", "id");

  if (!(await tableExists("localization_settings"))) {
    return {
      storeId: store.id,
      defaultLocale,
      fallbackLocale: "en",
      enabledLocales: normalizeLocaleList([defaultLocale, "en"]),
      currencyCode: store.currency || "IDR",
      timezone: store.timezone || "Asia/Jakarta",
      source: "store",
    };
  }

  const { data, error } = await supabase
    .from("localization_settings")
    .select(
      "default_locale, fallback_locale, enabled_locales, formatting_json, updated_at",
    )
    .eq("store_id", store.id)
    .maybeSingle();

  if (error) {
    if (isMissingTableError(error, "localization_settings")) {
      return {
        storeId: store.id,
        defaultLocale,
        fallbackLocale: "en",
        enabledLocales: normalizeLocaleList([defaultLocale, "en"]),
        currencyCode: store.currency || "IDR",
        timezone: store.timezone || "Asia/Jakarta",
        source: "store",
      };
    }
    throw normalizeError(error);
  }

  return {
    storeId: store.id,
    defaultLocale: normalizeLocaleCode(
      data?.default_locale || defaultLocale,
      "id",
    ),
    fallbackLocale: normalizeLocaleCode(data?.fallback_locale || "en", "en"),
    enabledLocales: normalizeLocaleList(
      data?.enabled_locales || [defaultLocale, "en"],
    ),
    formatting: data?.formatting_json || {},
    currencyCode: store.currency || "IDR",
    timezone: store.timezone || "Asia/Jakarta",
    source: "localization_settings",
    updatedAt: data?.updated_at || null,
  };
}

export async function updateLocalizationSettings(payload = {}) {
  const { store } = await getStoreContext();

  const defaultLocale = normalizeLocaleCode(
    payload.defaultLocale || store.locale || "id",
    "id",
  );
  const fallbackLocale = normalizeLocaleCode(
    payload.fallbackLocale || "en",
    "en",
  );
  const enabledLocales = normalizeLocaleList(
    payload.enabledLocales || [defaultLocale, "en"],
  );
  if (!enabledLocales.includes(defaultLocale)) {
    enabledLocales.unshift(defaultLocale);
  }

  if (await tableExists("localization_settings")) {
    const { error } = await supabase.from("localization_settings").upsert(
      {
        store_id: store.id,
        default_locale: defaultLocale,
        fallback_locale: fallbackLocale,
        enabled_locales: enabledLocales,
        formatting_json: payload.formatting || {},
        updated_at: new Date().toISOString(),
      },
      { onConflict: "store_id" },
    );

    if (error && !isMissingTableError(error, "localization_settings")) {
      throw normalizeError(error);
    }
  }

  const { error: storeError } = await supabase
    .from("stores")
    .update({
      locale: defaultLocale,
      updated_at: new Date().toISOString(),
    })
    .eq("id", store.id);

  if (storeError) {
    throw normalizeError(storeError);
  }

  return getLocalizationSettings();
}

export async function getLocalizationTranslations(options = {}) {
  const { store } = await getStoreContext();
  const locale = normalizeLocaleCode(
    options.locale || store.locale || "id",
    "id",
  );
  const namespace = normalizeTranslationNamespace(options.namespace);

  if (!(await tableExists("translation_entries"))) {
    return [];
  }

  const { data, error } = await supabase
    .from("translation_entries")
    .select(
      "id, locale, namespace, translation_key, translation_value, is_machine_translated, updated_at",
    )
    .eq("store_id", store.id)
    .eq("locale", locale)
    .eq("namespace", namespace)
    .order("translation_key", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "translation_entries")) {
      return [];
    }
    throw normalizeError(error);
  }

  return (data || []).map((row) => ({
    id: row.id,
    locale: row.locale,
    namespace: row.namespace,
    translationKey: row.translation_key,
    translationValue: row.translation_value || "",
    isMachineTranslated: Boolean(row.is_machine_translated),
    updatedAt: row.updated_at,
  }));
}

export async function upsertLocalizationTranslation(payload = {}) {
  const { store } = await getStoreContext();
  const locale = normalizeLocaleCode(
    payload.locale || store.locale || "id",
    "id",
  );
  const namespace = normalizeTranslationNamespace(payload.namespace);
  const translationKey = String(payload.translationKey || "").trim();

  if (!translationKey) {
    throw new Error("Translation key is required");
  }

  const translationValue = String(payload.translationValue || "");

  if (!(await tableExists("translation_entries"))) {
    throw new Error(
      "Translation schema missing. Run Feature 18 migration before managing translations.",
    );
  }

  const { error } = await supabase.from("translation_entries").upsert(
    {
      store_id: store.id,
      locale,
      namespace,
      translation_key: translationKey,
      translation_value: translationValue,
      is_machine_translated: Boolean(payload.isMachineTranslated),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "store_id,locale,namespace,translation_key" },
  );

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function deleteLocalizationTranslation(translationId) {
  if (!translationId) {
    throw new Error("Translation id is required");
  }

  const { store } = await getStoreContext();
  const { error } = await supabase
    .from("translation_entries")
    .delete()
    .eq("id", translationId)
    .eq("store_id", store.id);

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export async function getLocalizationMissingTranslations(options = {}) {
  const { store } = await getStoreContext();
  const locale = normalizeLocaleCode(
    options.locale || store.locale || "id",
    "id",
  );
  const namespace = normalizeTranslationNamespace(options.namespace);
  const baseLocale = normalizeLocaleCode(options.baseLocale || "en", "en");

  if (!(await tableExists("translation_entries"))) {
    return [];
  }

  const [baseRows, targetRows] = await Promise.all([
    supabase
      .from("translation_entries")
      .select("translation_key")
      .eq("store_id", store.id)
      .eq("locale", baseLocale)
      .eq("namespace", namespace),
    supabase
      .from("translation_entries")
      .select("translation_key")
      .eq("store_id", store.id)
      .eq("locale", locale)
      .eq("namespace", namespace),
  ]);

  if (baseRows.error) {
    throw normalizeError(baseRows.error);
  }

  if (targetRows.error) {
    throw normalizeError(targetRows.error);
  }

  const baseSet = new Set(
    (baseRows.data || []).map((item) => item.translation_key),
  );
  const targetSet = new Set(
    (targetRows.data || []).map((item) => item.translation_key),
  );

  return Array.from(baseSet).filter((key) => !targetSet.has(key));
}

export async function recordLocalizationFallbackEvent(payload = {}) {
  const { store } = await getStoreContext();
  if (!(await tableExists("localization_fallback_events"))) {
    return { ok: true };
  }

  const locale = normalizeLocaleCode(
    payload.locale || store.locale || "id",
    "id",
  );
  const fallbackLocale = normalizeLocaleCode(
    payload.fallbackLocale || "en",
    "en",
  );
  const namespace = normalizeTranslationNamespace(payload.namespace);
  const translationKey = String(payload.translationKey || "").trim();

  if (!translationKey) {
    return { ok: true };
  }

  const { error } = await supabase.from("localization_fallback_events").insert({
    store_id: store.id,
    locale,
    fallback_locale: fallbackLocale,
    namespace,
    translation_key: translationKey,
    context_path: payload.contextPath || null,
    metadata_json: payload.metadata || {},
  });

  if (error && !isMissingTableError(error, "localization_fallback_events")) {
    throw normalizeError(error);
  }

  return { ok: true };
}
