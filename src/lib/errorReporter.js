const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
const environment = import.meta.env.VITE_APP_ENVIRONMENT || "development";
const release = import.meta.env.VITE_APP_VERSION || "0.0.0";

let sentryPromise = null;

function loadSentry() {
  if (!sentryDsn) return null;
  if (sentryPromise) return sentryPromise;
  const sentryModule = "@sentry/browser";
  sentryPromise = import(/* @vite-ignore */ sentryModule)
    .then((Sentry) => {
      Sentry.init({
        dsn: sentryDsn,
        environment,
        release,
        tracesSampleRate: 0.1,
      });
      return Sentry;
    })
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.warn("[errorReporter] Sentry not installed, falling back to console.", err);
      sentryPromise = null;
      return null;
    });
  return sentryPromise;
}

export function initErrorReporting() {
  if (!sentryDsn) return;
  loadSentry();

  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      reportError(event.error || event.message, { source: "window.onerror" });
    });
    window.addEventListener("unhandledrejection", (event) => {
      reportError(event.reason, { source: "unhandledrejection" });
    });
  }
}

export function reportError(error, context = {}) {
  if (!error) return;

  if (!sentryDsn) {
    // eslint-disable-next-line no-console
    console.error("[error]", error, context);
    return;
  }

  loadSentry()?.then((Sentry) => {
    if (!Sentry) return;
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
      Sentry.captureException(error);
    });
  });
}
