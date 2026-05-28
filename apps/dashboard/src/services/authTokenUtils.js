/**
 * authTokenUtils — module-scoped auth token and callback accessors
 *
 * Domain: Auth / Cross-cutting
 * Feature: 01
 * Depends on: nothing
 */

let accessToken = null;
let authFailureHandler = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function setAuthFailureHandler(handler) {
  authFailureHandler = typeof handler === "function" ? handler : null;
}

export function getAccessToken() {
  return accessToken;
}

export function getAuthFailureHandler() {
  return authFailureHandler;
}
