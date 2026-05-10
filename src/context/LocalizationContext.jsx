import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  getCurrencySettings,
  getLocalizationSettings,
  getLocalizationTranslations,
  recordLocalizationFallbackEvent,
  updateLocalizationSettings,
} from "../services/api.js";

const LOCAL_STORAGE_KEY = "skye-active-locale";
const LOCAL_STORAGE_CURRENCY_KEY = "skye-active-currency";

const BASE_TRANSLATIONS = {
  en: {
    "app.workspace": "Workspace",
    "app.commerceControl": "Commerce control center",
    "app.liveOps": "Live Ops",
    "app.realtimeSync": "Realtime sync",
    "app.logout": "Logout",
    "app.language": "Language",
    "app.loading": "Loading...",
    "localization.title": "Localization",
    "localization.subtitle":
      "Manage languages, fallback strategy, and translation coverage.",
  },
  id: {
    "app.workspace": "Ruang kerja",
    "app.commerceControl": "Pusat kendali commerce",
    "app.liveOps": "Operasi langsung",
    "app.realtimeSync": "Sinkronisasi realtime",
    "app.logout": "Keluar",
    "app.language": "Bahasa",
    "app.loading": "Memuat...",
    "localization.title": "Lokalisasi",
    "localization.subtitle":
      "Kelola bahasa, strategi fallback, dan cakupan terjemahan.",
  },
};

const LocalizationContext = createContext(null);

export function LocalizationProvider({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [settings, setSettings] = useState({
    defaultLocale: "id",
    fallbackLocale: "en",
    enabledLocales: ["id", "en"],
    currencyCode: "IDR",
    timezone: "Asia/Jakarta",
  });
  const [currencySettings, setCurrencySettings] = useState({
    baseCurrency: "IDR",
    fallbackCurrency: "IDR",
    enabledCurrencies: ["IDR", "USD"],
    roundingPolicy: "half_up",
  });
  const [activeLocale, setActiveLocale] = useState("id");
  const [activeCurrency, setActiveCurrency] = useState("IDR");
  const [translations, setTranslations] = useState({});
  const missingLogRef = useRef(new Set());

  const fallbackLocale = settings.fallbackLocale || "en";

  async function loadTranslations(locale, fallback) {
    const [activeRows, fallbackRows] = await Promise.all([
      getLocalizationTranslations({ locale, namespace: "admin" }),
      fallback && fallback !== locale
        ? getLocalizationTranslations({ locale: fallback, namespace: "admin" })
        : Promise.resolve([]),
    ]);

    const activeMap = activeRows.reduce((acc, row) => {
      acc[row.translationKey] = row.translationValue;
      return acc;
    }, {});

    const fallbackMap = fallbackRows.reduce((acc, row) => {
      acc[row.translationKey] = row.translationValue;
      return acc;
    }, {});

    setTranslations({
      active: activeMap,
      fallback: fallbackMap,
    });
  }

  async function refreshLocalization() {
    setIsReady(false);
    const [nextSettings, nextCurrencySettings] = await Promise.all([
      getLocalizationSettings(),
      getCurrencySettings(),
    ]);
    const storedLocale = localStorage.getItem(LOCAL_STORAGE_KEY);
    const storedCurrency = localStorage.getItem(LOCAL_STORAGE_CURRENCY_KEY);
    const resolvedLocale = nextSettings.enabledLocales.includes(storedLocale)
      ? storedLocale
      : nextSettings.defaultLocale;
    const resolvedCurrency = (
      nextCurrencySettings.enabledCurrencies || []
    ).includes(storedCurrency)
      ? storedCurrency
      : nextCurrencySettings.baseCurrency;

    setSettings(nextSettings);
    setCurrencySettings(nextCurrencySettings);
    setActiveLocale(resolvedLocale);
    setActiveCurrency(resolvedCurrency);
    await loadTranslations(resolvedLocale, nextSettings.fallbackLocale);
    setIsReady(true);
  }

  async function setLocale(nextLocale, persist = false) {
    const normalized = String(nextLocale || "").trim();
    if (!normalized) {
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_KEY, normalized);
    setActiveLocale(normalized);
    await loadTranslations(normalized, settings.fallbackLocale);

    if (persist) {
      const updated = await updateLocalizationSettings({
        defaultLocale: normalized,
        fallbackLocale: settings.fallbackLocale,
        enabledLocales: settings.enabledLocales,
      });
      setSettings(updated);
    }
  }

  async function setCurrency(nextCurrency) {
    const normalized = String(nextCurrency || "")
      .trim()
      .toUpperCase();
    if (!normalized) {
      return;
    }

    localStorage.setItem(LOCAL_STORAGE_CURRENCY_KEY, normalized);
    setActiveCurrency(normalized);
  }

  useEffect(() => {
    refreshLocalization().catch(() => setIsReady(true));
  }, []);

  const value = useMemo(() => {
    function t(key, fallbackText = "") {
      const normalizedKey = String(key || "").trim();
      if (!normalizedKey) {
        return fallbackText;
      }

      if (translations.active?.[normalizedKey]) {
        return translations.active[normalizedKey];
      }

      if (translations.fallback?.[normalizedKey]) {
        const eventKey = `${activeLocale}|${normalizedKey}|fallback`;
        if (!missingLogRef.current.has(eventKey)) {
          missingLogRef.current.add(eventKey);
          recordLocalizationFallbackEvent({
            locale: activeLocale,
            fallbackLocale,
            namespace: "admin",
            translationKey: normalizedKey,
            contextPath:
              typeof window !== "undefined" ? window.location.pathname : null,
          }).catch(() => {});
        }
        return translations.fallback[normalizedKey];
      }

      const base = BASE_TRANSLATIONS[activeLocale]?.[normalizedKey];
      if (base) {
        return base;
      }

      const fallbackBase = BASE_TRANSLATIONS[fallbackLocale]?.[normalizedKey];
      if (fallbackBase) {
        const eventKey = `${activeLocale}|${normalizedKey}|base-fallback`;
        if (!missingLogRef.current.has(eventKey)) {
          missingLogRef.current.add(eventKey);
          recordLocalizationFallbackEvent({
            locale: activeLocale,
            fallbackLocale,
            namespace: "admin",
            translationKey: normalizedKey,
            contextPath:
              typeof window !== "undefined" ? window.location.pathname : null,
          }).catch(() => {});
        }
        return fallbackBase;
      }

      return fallbackText || normalizedKey;
    }

    function formatCurrency(value, currencyCode = settings.currencyCode) {
      return new Intl.NumberFormat(activeLocale, {
        style: "currency",
        currency: currencyCode || "IDR",
      }).format(Number(value || 0));
    }

    function formatNumber(value) {
      return new Intl.NumberFormat(activeLocale).format(Number(value || 0));
    }

    function formatDate(value, options = { dateStyle: "medium" }) {
      if (!value) {
        return "-";
      }
      const parsed = value instanceof Date ? value : new Date(value);
      return new Intl.DateTimeFormat(activeLocale, options).format(parsed);
    }

    return {
      isReady,
      settings,
      currencySettings,
      activeLocale,
      activeCurrency,
      t,
      setLocale,
      setCurrency,
      refreshLocalization,
      formatCurrency,
      formatNumber,
      formatDate,
    };
  }, [
    activeCurrency,
    activeLocale,
    currencySettings,
    fallbackLocale,
    isReady,
    settings,
    translations,
  ]);

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
