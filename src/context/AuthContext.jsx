import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  fetchProfile,
  loginRequest,
  logoutRequest,
  refreshAccessToken,
  registerRequest,
  resetPasswordRequest,
  setAccessToken,
  setAuthFailureHandler,
  updateProfile,
} from "../services/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [stores, setStores] = useState([]); // All stores user has access to
  const [currentRole, setCurrentRole] = useState(null); // Role in current store
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const restoreSession = useCallback(async () => {
    try {
      setAuthError(null);
      const refreshed = await refreshAccessToken();
      setAccessToken(refreshed.accessToken);
      setUser(refreshed.user);
      setStore(refreshed.store || null);
      setStores(refreshed.stores || []);
      setCurrentRole(refreshed.currentRole || null);
    } catch (err) {
      setAuthError(err.message || "Session restore failed");
      setAccessToken(null);
      setUser(null);
      setStore(null);
      setStores([]);
      setCurrentRole(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      setAuthError("Authentication failed");
      setAccessToken(null);
      setUser(null);
      setStore(null);
      setStores([]);
      setCurrentRole(null);
    });

    return () => {
      setAuthFailureHandler(null);
    };
  }, []);

  const login = useCallback(async (payload) => {
    try {
      setAuthError(null);
      const data = await loginRequest(payload);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setStore(data.store || null);
      setStores(data.stores || []);
      setCurrentRole(data.currentRole || null);
      return data;
    } catch (err) {
      setAuthError(err.message || "Login failed");
      throw err;
    }
  }, []);

  const register = useCallback(async (payload) => {
    try {
      setAuthError(null);
      const data = await registerRequest(payload);
      setAccessToken(data.accessToken || null);
      setUser(data.user || null);
      setStore(data.store || null);
      setStores(data.stores || []);
      setCurrentRole(data.currentRole || null);
      return data;
    } catch (err) {
      setAuthError(err.message || "Registration failed");
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthError(null);
      await logoutRequest();
    } catch (err) {
      setAuthError(err.message || "Logout failed");
      // Still clear auth state on error
    } finally {
      setAccessToken(null);
      setUser(null);
      setStore(null);
      setStores([]);
      setCurrentRole(null);
    }
  }, []);

  const syncProfile = useCallback(async () => {
    const profile = await fetchProfile();
    setUser(profile);
    return profile;
  }, []);

  const saveProfile = useCallback(async (payload) => {
    const profile = await updateProfile(payload);
    setUser(profile);
    return profile;
  }, []);

  const requestPasswordReset = useCallback(async (email) => {
    return resetPasswordRequest(email);
  }, []);

  const selectStore = useCallback(
    (storeId) => {
      const selectedStore = stores.find((s) => s.id === storeId);
      if (selectedStore) {
        setStore(selectedStore);
        setCurrentRole(selectedStore.user_role); // Role from store_users junction
        // Store preference in localStorage for next session
        localStorage.setItem("preferred_store_id", storeId);
        return selectedStore;
      }
      return null;
    },
    [stores],
  );

  const hasRole = useCallback(
    (requiredRoles) => {
      if (!currentRole) return false;
      const roleHierarchy = { owner: 4, admin: 3, manager: 2, staff: 1 };
      const rolesArray = Array.isArray(requiredRoles)
        ? requiredRoles
        : [requiredRoles];
      const currentRoleLevel = roleHierarchy[currentRole] || 0;
      return rolesArray.some((role) => roleHierarchy[role] <= currentRoleLevel);
    },
    [currentRole],
  );

  const canAccessResource = useCallback(
    (resource) => {
      // Simple check: user is authenticated and has a store selected
      if (!user || !store) return false;
      // More granular checks can be added per resource type
      return true;
    },
    [user, store],
  );

  const value = useMemo(
    () => ({
      user,
      store,
      stores,
      currentRole,
      isAuthenticated: Boolean(user),
      isLoading,
      authError,
      login,
      register,
      logout,
      syncProfile,
      saveProfile,
      requestPasswordReset,
      selectStore,
      hasRole,
      canAccessResource,
    }),
    [
      user,
      store,
      stores,
      currentRole,
      isLoading,
      authError,
      login,
      register,
      logout,
      syncProfile,
      saveProfile,
      requestPasswordReset,
      selectStore,
      hasRole,
      canAccessResource,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
