/**
 * authService — Authentication session requests and profile management
 *
 * Domain: Auth
 * Feature: 01
 * Depends on: supabaseClient, utils/errorUtils, storeService, authTokenUtils
 */

import { getAuthFailureHandler } from "./authTokenUtils.js";
import {
  ensureAppUser,
  ensurePrimaryStore,
  getCurrentAuthUser,
  mapPublicUser,
  mapStoreSummary,
} from "./storeService.js";
import { assertSupabaseConfigured, supabase } from "./supabaseClient.js";
import { normalizeError } from "./utils/errorUtils.js";

export async function registerRequest(payload) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
    options: {
      data: {
        name: payload.name,
        full_name: payload.name,
        phone: payload.phone || null,
      },
    },
  });

  if (error) {
    throw normalizeError(error);
  }

  if (!data.user) {
    throw new Error("Registration did not return an authenticated user.");
  }

  const hasSession = Boolean(data.session?.access_token);

  // When email confirmation is required, there is no active session yet.
  // Defer profile/store bootstrap until first successful login.
  if (!hasSession) {
    return {
      user: null,
      store: null,
      accessToken: null,
      refreshToken: null,
      requiresEmailVerification: true,
    };
  }

  const profile = await ensureAppUser(data.user, payload);
  const store = await ensurePrimaryStore(data.user, profile);

  return {
    user: mapPublicUser(data.user, profile),
    store: mapStoreSummary(store),
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
    requiresEmailVerification: false,
  };
}

export async function loginRequest(payload) {
  assertSupabaseConfigured();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  });

  if (error) {
    throw normalizeError(error);
  }

  if (!data.user) {
    throw new Error("Login failed.");
  }

  const profile = await ensureAppUser(data.user);
  const store = await ensurePrimaryStore(data.user, profile);

  return {
    user: mapPublicUser(data.user, profile),
    store: mapStoreSummary(store),
    accessToken: data.session?.access_token || null,
    refreshToken: data.session?.refresh_token || null,
  };
}

export async function refreshAccessToken() {
  assertSupabaseConfigured();

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();
  if (sessionError) {
    throw normalizeError(sessionError);
  }

  if (!sessionData.session) {
    throw new Error("No active session.");
  }

  const authUser = await getCurrentAuthUser();
  const profile = await ensureAppUser(authUser);
  const store = await ensurePrimaryStore(authUser, profile);

  return {
    user: mapPublicUser(authUser, profile),
    store: mapStoreSummary(store),
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

export async function logoutRequest() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw normalizeError(error);
  }

  const authFailureHandler = getAuthFailureHandler();
  if (authFailureHandler) {
    authFailureHandler();
  }
}

export async function fetchProfile() {
  const authUser = await getCurrentAuthUser();
  const profile = await ensureAppUser(authUser);
  return mapPublicUser(authUser, profile);
}

export async function updateProfile(payload) {
  const authUser = await getCurrentAuthUser();

  const updates = {
    full_name: payload.name,
    phone_number: payload.phone || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("users")
    .update(updates)
    .eq("id", authUser.id);

  if (error) {
    throw normalizeError(error);
  }

  return fetchProfile();
}

export async function resetPasswordRequest(email) {
  assertSupabaseConfigured();

  const redirectTo =
    typeof window !== "undefined"
      ? `${window.location.origin}/login`
      : undefined;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    throw normalizeError(error);
  }

  return { ok: true };
}

export const signup = registerRequest;
export const signin = loginRequest;
export const signout = logoutRequest;
export const refreshSession = refreshAccessToken;
export const requestPasswordReset = resetPasswordRequest;
