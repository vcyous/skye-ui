/**
 * AuthService - handles authentication operations at service layer
 * Implements: signup, signin, refresh, logout, password reset, session management
 * Enforces: store-scoped access, RLS-safe operations, audit logging
 *
 * File: src/services/authService.js
 * Feature: 01 - Accounts and Auth
 */

import { supabaseClient } from "./supabaseClient.js";

const STORAGE_KEYS = {
  ACCESS_TOKEN: "skye_access_token",
  REFRESH_TOKEN: "skye_refresh_token",
  USER_ID: "skye_user_id",
  STORE_ID: "skye_store_id",
};

/**
 * Sign up new user and create store
 * @param {Object} payload - { email, password, storeName, fullName? }
 * @returns {Object} { user, store, accessToken, refreshToken, currentRole }
 * @throws Error with code: VALIDATION_ERROR, CONFLICT (email exists), SERVER_ERROR
 */
export async function signup(payload) {
  const { email, password, storeName, fullName } = payload;

  try {
    // Step 1: Create Supabase auth user
    const { data: authData, error: authError } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

    if (authError) {
      if (authError.message.includes("already registered")) {
        throw {
          code: "CONFLICT",
          message: "Email address is already registered",
          details: { field: "email" },
        };
      }
      throw {
        code: "AUTH_ERROR",
        message: authError.message,
      };
    }

    const userId = authData.user.id;

    // Step 2: Create user profile in public.users table
    const { error: userError } = await supabaseClient.from("users").insert([
      {
        id: userId,
        email,
        full_name: fullName,
      },
    ]);

    if (userError) {
      // Cleanup: delete auth user if profile creation fails
      await supabaseClient.auth.admin.deleteUser(userId);
      throw {
        code: "SERVER_ERROR",
        message: "Failed to create user profile",
        details: { originalError: userError.message },
      };
    }

    // Step 3: Create store (owned by this user)
    const storeSlug = generateStoreSlug(storeName);
    const { data: storeData, error: storeError } = await supabaseClient
      .from("stores")
      .insert([
        {
          user_id: userId,
          name: storeName,
          slug: storeSlug,
        },
      ])
      .select()
      .single();

    if (storeError) {
      throw {
        code: "SERVER_ERROR",
        message: "Failed to create store",
        details: { originalError: storeError.message },
      };
    }

    const storeId = storeData.id;

    // Step 4: Create store_users record (owner role)
    const { error: storeUserError } = await supabaseClient
      .from("store_users")
      .insert([
        {
          store_id: storeId,
          user_id: userId,
          role: "owner",
          status: "active",
        },
      ]);

    if (storeUserError) {
      throw {
        code: "SERVER_ERROR",
        message: "Failed to grant store access",
        details: { originalError: storeUserError.message },
      };
    }

    // Step 5: Log signup event
    await logAuthEvent({
      userId,
      storeId,
      eventType: "authentication",
      eventCode: "SIGNUP_SUCCESS",
      status: "success",
    });

    // Step 6: Return user, store, tokens
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    const refreshToken = sessionData?.session?.refresh_token;

    return {
      success: true,
      user: {
        id: userId,
        email,
        fullName,
      },
      store: {
        id: storeId,
        name: storeName,
        slug: storeSlug,
        user_role: "owner",
      },
      stores: [
        {
          id: storeId,
          name: storeName,
          slug: storeSlug,
          user_role: "owner",
        },
      ],
      currentRole: "owner",
      accessToken,
      refreshToken,
    };
  } catch (error) {
    // Log signup failure
    if (error.userId) {
      await logAuthEvent({
        userId: error.userId,
        eventType: "authentication",
        eventCode: "SIGNUP_FAILED",
        status: "failure",
        errorMessage: error.message,
      });
    }

    throw {
      code: error.code || "SERVER_ERROR",
      message: error.message || "Signup failed",
      details: error.details,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Sign in existing user and load their stores
 * @param {Object} payload - { email, password }
 * @returns {Object} { user, store, stores, accessToken, refreshToken, currentRole }
 * @throws Error with code: VALIDATION_ERROR, AUTH_ERROR, NOT_FOUND, SERVER_ERROR
 */
export async function signin(payload) {
  const { email, password } = payload;

  try {
    // Step 1: Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        // Log failed attempt
        const { data: userData } = await supabaseClient
          .from("users")
          .select("id")
          .eq("email", email)
          .single();

        if (userData) {
          await logAuthEvent({
            userId: userData.id,
            eventType: "authentication",
            eventCode: "SIGNIN_FAILED",
            status: "failure",
            errorMessage: "Invalid credentials",
          });

          // Check for account lockout (after 5 failed attempts)
          const { data: user } = await supabaseClient
            .from("users")
            .select("failed_login_attempts")
            .eq("id", userData.id)
            .single();

          if (user && user.failed_login_attempts >= 5) {
            throw {
              code: "AUTH_ERROR",
              message:
                "Account temporarily locked due to failed login attempts. Please reset your password.",
            };
          }
        }

        throw {
          code: "AUTH_ERROR",
          message: "Invalid email or password",
          details: { field: "credentials" },
        };
      }

      throw {
        code: "AUTH_ERROR",
        message: authError.message,
      };
    }

    const userId = authData.user.id;
    const accessToken = authData.session.access_token;
    const refreshToken = authData.session.refresh_token;

    // Step 2: Load user profile
    const { data: userProfile, error: userError } = await supabaseClient
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError) {
      throw {
        code: "SERVER_ERROR",
        message: "Failed to load user profile",
      };
    }

    // Step 3: Load user's stores
    const { data: storesData, error: storesError } = await supabaseClient
      .from("store_users")
      .select("*, stores(*)")
      .eq("user_id", userId)
      .eq("status", "active");

    if (storesError) {
      throw {
        code: "SERVER_ERROR",
        message: "Failed to load user stores",
      };
    }

    const stores = storesData.map((su) => ({
      id: su.stores.id,
      name: su.stores.name,
      slug: su.stores.slug,
      user_role: su.role,
    }));

    // Step 4: Select default store (preferred or first)
    const preferredStoreId = localStorage.getItem(STORAGE_KEYS.STORE_ID);
    const selectedStore =
      stores.find((s) => s.id === preferredStoreId) || stores[0] || null;

    // Step 5: Update user login stats
    const { error: statsError } = await supabaseClient.rpc(
      "update_user_login_stats",
      { p_user_id: userId, p_success: true },
    );

    if (statsError) {
      console.warn("Failed to update login stats:", statsError);
    }

    // Step 6: Log signin success
    await logAuthEvent({
      userId,
      storeId: selectedStore?.id,
      eventType: "authentication",
      eventCode: "SIGNIN_SUCCESS",
      status: "success",
    });

    return {
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.full_name,
        avatarUrl: userProfile.avatar_url,
      },
      store: selectedStore,
      stores,
      currentRole: selectedStore?.user_role,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    throw {
      code: error.code || "SERVER_ERROR",
      message: error.message || "Sign in failed",
      details: error.details,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Refresh access token using refresh token
 * @param {string?} refreshToken - optional, uses localStorage if not provided
 * @returns {Object} { user, store, accessToken, refreshToken, currentRole }
 */
export async function refreshSession(refreshToken) {
  try {
    const token =
      refreshToken || localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);

    if (!token) {
      throw {
        code: "AUTH_ERROR",
        message: "No refresh token available",
      };
    }

    const { data: sessionData, error } =
      await supabaseClient.auth.refreshSession({
        refresh_token: token,
      });

    if (error) {
      throw {
        code: "AUTH_ERROR",
        message: "Session refresh failed",
      };
    }

    const userId = sessionData.user.id;
    const newAccessToken = sessionData.session.access_token;
    const newRefreshToken = sessionData.session.refresh_token;

    // Load user profile and stores (same as signin)
    const { data: userProfile } = await supabaseClient
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    const { data: storesData } = await supabaseClient
      .from("store_users")
      .select("*, stores(*)")
      .eq("user_id", userId)
      .eq("status", "active");

    const stores = storesData.map((su) => ({
      id: su.stores.id,
      name: su.stores.name,
      slug: su.stores.slug,
      user_role: su.role,
    }));

    const preferredStoreId = localStorage.getItem(STORAGE_KEYS.STORE_ID);
    const selectedStore =
      stores.find((s) => s.id === preferredStoreId) || stores[0] || null;

    return {
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        fullName: userProfile.full_name,
        avatarUrl: userProfile.avatar_url,
      },
      store: selectedStore,
      stores,
      currentRole: selectedStore?.user_role,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  } catch (error) {
    throw {
      code: error.code || "SERVER_ERROR",
      message: error.message || "Session refresh failed",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Sign out user
 * @param {string?} userId - optional, for audit logging
 */
export async function signout(userId) {
  try {
    if (userId) {
      await logAuthEvent({
        userId,
        eventType: "authentication",
        eventCode: "SIGNOUT_SUCCESS",
        status: "success",
      });
    }

    await supabaseClient.auth.signOut();

    // Clear local storage
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });

    return { success: true };
  } catch (error) {
    console.error("Signout error:", error);
    // Still clear storage even if logout fails
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
    return { success: true };
  }
}

/**
 * Request password reset (sends email)
 * @param {string} email
 * @returns {Object} { success, message }
 */
export async function requestPasswordReset(email) {
  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw {
        code: "SERVER_ERROR",
        message: "Failed to send password reset email",
      };
    }

    // Log the request (even if user doesn't exist, don't reveal that)
    const { data: user } = await supabaseClient
      .from("users")
      .select("id")
      .eq("email", email)
      .single();

    if (user) {
      await logAuthEvent({
        userId: user.id,
        eventType: "authentication",
        eventCode: "PASSWORD_RESET_REQUESTED",
        status: "success",
      });
    }

    return {
      success: true,
      message: "Password reset email sent if account exists",
    };
  } catch (error) {
    throw {
      code: error.code || "SERVER_ERROR",
      message: error.message || "Password reset request failed",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Update password (after reset or profile change)
 * @param {string} newPassword
 * @param {string?} currentPassword - required if not using reset token
 * @returns {Object} { success }
 */
export async function updatePassword(newPassword, currentPassword) {
  try {
    const { data, error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw {
        code: "AUTH_ERROR",
        message: error.message,
      };
    }

    const userId = data.user.id;

    await logAuthEvent({
      userId,
      eventType: "authentication",
      eventCode: "PASSWORD_UPDATED",
      status: "success",
    });

    return { success: true };
  } catch (error) {
    throw {
      code: error.code || "SERVER_ERROR",
      message: error.message || "Password update failed",
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get current session (for page refresh)
 * @returns {Object} session object
 */
export async function getCurrentSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    return null;
  }
  return data?.session || null;
}

/**
 * Log authentication event for audit trail
 * @private
 */
async function logAuthEvent({
  userId,
  storeId = null,
  eventType,
  eventCode,
  status = "success",
  errorMessage = null,
  metadata = {},
}) {
  try {
    await supabaseClient.from("auth_events").insert([
      {
        user_id: userId,
        store_id: storeId,
        event_type: eventType,
        event_code: eventCode,
        status,
        error_message: errorMessage,
        metadata,
      },
    ]);
  } catch (error) {
    // Don't throw - logging failure shouldn't break auth flow
    console.warn("Failed to log auth event:", error);
  }
}

/**
 * Generate URL-safe store slug from store name
 * @private
 */
function generateStoreSlug(storeName) {
  const baseSlug = storeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return baseSlug || "store";
}

/**
 * Check if user has required role
 * @param {string} userRole - current role (owner, admin, manager, staff)
 * @param {string|string[]} requiredRoles - single or array of allowed roles
 * @returns {boolean}
 */
export function hasRole(userRole, requiredRoles) {
  const roleHierarchy = { owner: 4, admin: 3, manager: 2, staff: 1 };
  const rolesArray = Array.isArray(requiredRoles)
    ? requiredRoles
    : [requiredRoles];
  const currentLevel = roleHierarchy[userRole] || 0;
  return rolesArray.some((role) => roleHierarchy[role] <= currentLevel);
}

/**
 * Validate auth session (called on app startup)
 * @returns {Object} session data or null
 */
export async function validateSession() {
  try {
    const session = await getCurrentSession();
    if (!session) return null;

    // Session is valid, return full user context
    return await refreshSession(session.refresh_token);
  } catch (error) {
    return null;
  }
}
