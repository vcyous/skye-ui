export const SUPPORTED_LOCALES = ["en", "id"];

export function normalizeLocaleCode(value, fallback = "en") {
  const input = String(value || "").trim().replace("_", "-");
  if (!input) return fallback;
  const lower = input.toLowerCase();
  return SUPPORTED_LOCALES.includes(lower) ? lower : fallback;
}

export async function getLocalizationSettings() {
  return {
    defaultLocale: "en",
    fallbackLocale: "en",
    enabledLocales: ["en", "id"],
    currencyCode: "USD",
    timezone: "UTC",
  };
}

export async function updateLocalizationSettings() {
  return getLocalizationSettings();
}

export async function getLocalizationTranslations() {
  return [];
}

export async function upsertLocalizationTranslation() {
  return null;
}

export async function deleteLocalizationTranslation() {
  return null;
}

export async function getLocalizationMissingTranslations() {
  return [];
}

export async function recordLocalizationFallbackEvent() {
  return null;
}
