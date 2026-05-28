const DEFAULT_LOCALE = "en-US";

export function formatNumber(value, options = {}) {
  const { locale = DEFAULT_LOCALE, ...intlOptions } = options;
  const num = Number(value || 0);
  try {
    return new Intl.NumberFormat(locale, intlOptions).format(num);
  } catch {
    return String(num);
  }
}

export function formatPercent(value, options = {}) {
  return formatNumber(value, {
    style: "percent",
    maximumFractionDigits: 1,
    ...options,
  });
}
