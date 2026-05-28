const APP_HOST = "dashboard.skyeseller.online";
const LANDING_HOSTS = ["skyeseller.online", "www.skyeseller.online"];

function getHost() {
  if (typeof window === "undefined") return "";
  return window.location.hostname;
}

export function isLandingHost() {
  return LANDING_HOSTS.includes(getHost());
}

export function isAppHost() {
  return getHost() === APP_HOST;
}

export const APP_ORIGIN = `https://${APP_HOST}`;
export const LANDING_ORIGIN = "https://skyeseller.online";

export function goToLogin() {
  window.location.href = isLandingHost() ? `${APP_ORIGIN}/login` : "/login";
}

export function goToRegister() {
  window.location.href = isLandingHost()
    ? `${APP_ORIGIN}/register`
    : "/register";
}
