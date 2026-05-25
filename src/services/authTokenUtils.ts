/**
 * authTokenUtils — module-scoped auth token and callback accessors
 *
 * Domain: Auth / Cross-cutting
 * Feature: 01
 * Depends on: nothing
 */

let accessToken: string | null = null;
let authFailureHandler: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token || null;
}

export function setAuthFailureHandler(handler: (() => void) | null): void {
  authFailureHandler = typeof handler === "function" ? handler : null;
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getAuthFailureHandler(): (() => void) | null {
  return authFailureHandler;
}
