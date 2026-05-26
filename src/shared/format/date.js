const DEFAULT_LOCALE = "en-US";

export function formatDate(value, options = {}) {
  if (!value) return "-";
  const { locale = DEFAULT_LOCALE, ...intlOptions } = options;
  const dateStyle = intlOptions.dateStyle ?? "medium";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle, ...intlOptions }).format(parsed);
  } catch {
    return parsed.toISOString().slice(0, 10);
  }
}

export function formatDateTime(value, options = {}) {
  return formatDate(value, { dateStyle: "medium", timeStyle: "short", ...options });
}
