/**
 * Unit tests for authService
 * File: __tests__/services/authService.test.js
 * Feature: 01 - Accounts and Auth
 *
 * Note: These tests require Supabase test environment setup
 * Run with: npm test -- authService.test.js
 */

import {
  hasRole,
  refreshSession,
  requestPasswordReset,
  signin,
  signout,
  signup,
  updatePassword,
} from "../../src/services/authService";

// Mock Supabase client
jest.mock("../../src/services/supabaseClient", () => ({
  supabaseClient: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getSession: jest.fn(),
      admin: {
        deleteUser: jest.fn(),
      },
    },
    from: jest.fn(),
    rpc: jest.fn(),
  },
}));

describe("authService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("signup()", () => {
    const validPayload = {
      email: "newuser@example.com",
      password: "SecurePassword123!",
      storeName: "Test Store",
      fullName: "Test User",
    };

    it("should successfully create user, store, and store_users record", async () => {
      const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

      // Mock successful signup
      supabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      });

      // Mock user insert
      supabaseClient.from("users").insert = jest.fn().mockReturnValue({
        data: null,
        error: null,
      });

      // Mock store insert
      supabaseClient.from("stores").insert = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: {
              id: "660e8400-e29b-41d4-a716-446655440000",
              name: "Test Store",
              slug: "test-store",
            },
            error: null,
          }),
        }),
      });

      // Mock store_users insert
      supabaseClient.from("store_users").insert = jest.fn().mockReturnValue({
        data: null,
        error: null,
      });

      // Mock session
      supabaseClient.auth.getSession.mockResolvedValueOnce({
        data: {
          session: {
            access_token: "mock_access_token",
            refresh_token: "mock_refresh_token",
          },
        },
      });

      // Execute
      const result = await signup(validPayload);

      // Verify
      expect(result.success).toBe(true);
      expect(result.user.email).toBe("newuser@example.com");
      expect(result.store.user_role).toBe("owner");
      expect(result.currentRole).toBe("owner");
      expect(result.accessToken).toBe("mock_access_token");
    });

    it("should reject duplicate email with CONFLICT error", async () => {
      const error = new Error("User already registered");
      error.message = "User already registered";

      supabaseClient.auth.signUp.mockResolvedValueOnce({
        data: null,
        error: error,
      });

      // Execute & verify
      await expect(signup(validPayload)).rejects.toMatchObject({
        code: "CONFLICT",
        message: expect.stringContaining("already registered"),
      });
    });

    it("should clean up auth user if profile creation fails", async () => {
      const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

      supabaseClient.auth.signUp.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null,
      });

      supabaseClient.from("users").insert = jest.fn().mockReturnValue({
        data: null,
        error: new Error("Profile insert failed"),
      });

      supabaseClient.auth.admin.deleteUser.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Execute & verify
      await expect(signup(validPayload)).rejects.toMatchObject({
        code: "SERVER_ERROR",
      });

      // Verify cleanup was called
      expect(supabaseClient.auth.admin.deleteUser).toHaveBeenCalledWith(
        mockUserId,
      );
    });
  });

  describe("signin()", () => {
    const validPayload = {
      email: "user@example.com",
      password: "SecurePassword123!",
    };

    it("should authenticate user and load stores", async () => {
      const mockUserId = "550e8400-e29b-41d4-a716-446655440000";
      const mockStoreId = "660e8400-e29b-41d4-a716-446655440000";

      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: {
          user: { id: mockUserId },
          session: {
            access_token: "mock_access_token",
            refresh_token: "mock_refresh_token",
          },
        },
        error: null,
      });

      // Mock user profile
      supabaseClient.from("users").select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: {
              id: mockUserId,
              email: "user@example.com",
              full_name: "Test User",
              avatar_url: null,
            },
            error: null,
          }),
        }),
      });

      // Mock stores
      supabaseClient.from("store_users").select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({
            data: [
              {
                id: "770e8400-e29b-41d4-a716-446655440000",
                role: "owner",
                stores: {
                  id: mockStoreId,
                  name: "My Store",
                  slug: "my-store",
                },
              },
            ],
            error: null,
          }),
        }),
      });

      // Mock RPC call for login stats
      supabaseClient.rpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await signin(validPayload);

      expect(result.success).toBe(true);
      expect(result.user.email).toBe("user@example.com");
      expect(result.stores.length).toBeGreaterThan(0);
      expect(result.currentRole).toBe("owner");
    });

    it("should reject invalid credentials", async () => {
      const error = new Error("Invalid login credentials");

      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: error,
      });

      await expect(signin(validPayload)).rejects.toMatchObject({
        code: "AUTH_ERROR",
        message: expect.stringContaining("Invalid email or password"),
      });
    });

    it("should enforce account lockout after failed attempts", async () => {
      supabaseClient.auth.signInWithPassword.mockResolvedValueOnce({
        data: null,
        error: new Error("Invalid login credentials"),
      });

      // Mock user lookup
      supabaseClient.from("users").select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: { id: "user-id", failed_login_attempts: 5 },
            error: null,
          }),
        }),
      });

      await expect(signin(validPayload)).rejects.toMatchObject({
        code: "AUTH_ERROR",
        message: expect.stringContaining("temporarily locked"),
      });
    });
  });

  describe("refreshSession()", () => {
    it("should return new tokens and user context", async () => {
      const mockUserId = "550e8400-e29b-41d4-a716-446655440000";

      supabaseClient.auth.refreshSession.mockResolvedValueOnce({
        data: {
          user: { id: mockUserId },
          session: {
            access_token: "new_access_token",
            refresh_token: "new_refresh_token",
          },
        },
        error: null,
      });

      // Mock user and stores queries (similar to signin)
      supabaseClient.from("users").select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: { id: mockUserId, email: "user@example.com" },
            error: null,
          }),
        }),
      });

      supabaseClient.from("store_users").select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValueOnce({
          eq: jest.fn().mockResolvedValueOnce({
            data: [],
            error: null,
          }),
        }),
      });

      const result = await refreshSession("mock_refresh_token");

      expect(result.accessToken).toBe("new_access_token");
      expect(result.user).toBeDefined();
    });

    it("should reject invalid refresh token", async () => {
      supabaseClient.auth.refreshSession.mockResolvedValueOnce({
        data: null,
        error: new Error("Invalid refresh token"),
      });

      await expect(refreshSession("invalid_token")).rejects.toMatchObject({
        code: "AUTH_ERROR",
      });
    });
  });

  describe("hasRole()", () => {
    it("should correctly evaluate role hierarchy", () => {
      // Higher role can access lower role permissions
      expect(hasRole("owner", "staff")).toBe(true);
      expect(hasRole("owner", "manager")).toBe(true);
      expect(hasRole("admin", "manager")).toBe(true);
      expect(hasRole("manager", "staff")).toBe(true);

      // Lower role cannot access higher role permissions
      expect(hasRole("staff", "owner")).toBe(false);
      expect(hasRole("staff", "admin")).toBe(false);
      expect(hasRole("manager", "admin")).toBe(false);

      // Same role matches
      expect(hasRole("admin", "admin")).toBe(true);

      // Array of acceptable roles
      expect(hasRole("manager", ["staff", "manager"])).toBe(true);
      expect(hasRole("admin", ["staff", "manager"])).toBe(true);
      expect(hasRole("staff", ["admin", "manager"])).toBe(false);
    });
  });

  describe("requestPasswordReset()", () => {
    it("should send reset email without revealing if user exists", async () => {
      supabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      supabaseClient.from("users").select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: { id: "user-id" },
            error: null,
          }),
        }),
      });

      const result = await requestPasswordReset("user@example.com");

      expect(result.success).toBe(true);
      expect(result.message).toContain("if account exists");
    });

    it("should still succeed for nonexistent email (security)", async () => {
      supabaseClient.auth.resetPasswordForEmail.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      supabaseClient.from("users").select = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValueOnce({
            data: null,
            error: new Error("Not found"),
          }),
        }),
      });

      const result = await requestPasswordReset("nonexistent@example.com");

      expect(result.success).toBe(true);
      // Should not reveal user doesn't exist
    });
  });

  describe("updatePassword()", () => {
    it("should update password successfully", async () => {
      supabaseClient.auth.updateUser.mockResolvedValueOnce({
        data: { user: { id: "user-id" } },
        error: null,
      });

      const result = await updatePassword("NewPassword123!");

      expect(result.success).toBe(true);
    });

    it("should reject weak password", async () => {
      const error = new Error("Password should be at least 8 characters");

      supabaseClient.auth.updateUser.mockResolvedValueOnce({
        data: null,
        error: error,
      });

      await expect(updatePassword("weak")).rejects.toMatchObject({
        code: "AUTH_ERROR",
      });
    });
  });

  describe("signout()", () => {
    it("should sign out user and clear storage", async () => {
      supabaseClient.auth.signOut.mockResolvedValueOnce({
        error: null,
      });

      localStorage.setItem("skye_access_token", "token");

      const result = await signout("user-id");

      expect(result.success).toBe(true);
      expect(localStorage.getItem("skye_access_token")).toBeNull();
    });

    it("should clear storage even if logout fails", async () => {
      supabaseClient.auth.signOut.mockRejectedValueOnce(
        new Error("Logout failed"),
      );

      localStorage.setItem("skye_access_token", "token");

      const result = await signout("user-id");

      // Still succeeds and clears storage
      expect(result.success).toBe(true);
      expect(localStorage.getItem("skye_access_token")).toBeNull();
    });
  });
});
