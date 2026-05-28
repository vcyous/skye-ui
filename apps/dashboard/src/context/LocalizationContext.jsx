import { createContext, useContext, useMemo } from "react";
import {
  formatCurrency as formatCurrencyShared,
  formatDate as formatDateShared,
  formatNumber as formatNumberShared,
} from "../shared/format";

const LocalizationContext = createContext(null);

const LOCALE = "id";
const CURRENCY = "IDR";
const TIMEZONE = "Asia/Jakarta";

export function LocalizationProvider({ children }) {
  const value = useMemo(() => {
    function t(_key, fallbackText = "") {
      return fallbackText || _key || "";
    }

    function formatCurrency(value) {
      return formatCurrencyShared(value, { currency: CURRENCY, locale: LOCALE });
    }

    function formatNumber(value) {
      return formatNumberShared(value, { locale: LOCALE });
    }

    function formatDate(value, options = { dateStyle: "medium" }) {
      return formatDateShared(value, { locale: LOCALE, ...options });
    }

    return {
      isReady: true,
      activeLocale: LOCALE,
      activeCurrency: CURRENCY,
      timezone: TIMEZONE,
      t,
      formatCurrency,
      formatNumber,
      formatDate,
    };
  }, []);

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
}

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error("useLocalization must be used inside LocalizationProvider");
  }
  return context;
}
