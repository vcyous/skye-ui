import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
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
} from "../services/api";
import { UserProfile, StoreSummary, AuthSessionData } from "../types";

export interface AuthContextType {
  user: UserProfile | null;
  store: StoreSummary | null;
  stores: StoreSummary[];
  currentRole: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (payload: any) => Promise<AuthSessionData>;
  register: (payload: any) => Promise<AuthSessionData>;
  logout: () => Promise<void>;
  syncProfile: () => Promise<UserProfile>;
  saveProfile: (payload: any) => Promise<UserProfile>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean }>;
  selectStore: (storeId: string) => StoreSummary | null;
  hasRole: (requiredRoles: string | string[]) => boolean;
  canAccessResource: (resource: string) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [store, setStore] = useState<StoreSummary | null>(null);
  const [stores, setStores] = useState<StoreSummary[]>([]); // All stores user has access to
  const [currentRole, setCurrentRole] = useState<string | null>(null); // Role in current store
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const restoreSession = useCallback(async () => {
    try {
      setAuthError(null);
      const refreshed = await refreshAccessToken();
      setAccessToken(refreshed.accessToken);
      setUser(refreshed.user);
      setStore(refreshed.store || null);
      setStores(refreshed.stores || []);
      setCurrentRole(refreshed.currentRole || null);
    } catch (err: any) {
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

  const login = useCallback(async (payload: any) => {
    try {
      setAuthError(null);
      const data = await loginRequest(payload);
      setAccessToken(data.accessToken);
      setUser(data.user);
      setStore(data.store || null);
      setStores(data.stores || []);
      setCurrentRole(data.currentRole || null);
      return data;
    } catch (err: any) {
      setAuthError(err.message || "Login failed");
      throw err;
    }
  }, []);

  const register = useCallback(async (payload: any) => {
    try {
      setAuthError(null);
      const data = await registerRequest(payload);
      setAccessToken(data.accessToken || null);
      setUser(data.user || null);
      setStore(data.store || null);
      setStores(data.stores || []);
      setCurrentRole(data.currentRole || null);
      return data;
    } catch (err: any) {
      setAuthError(err.message || "Registration failed");
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setAuthError(null);
      await logoutRequest();
    } catch (err: any) {
      setAuthError(err.message || "Logout failed");
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

  const saveProfile = useCallback(async (payload: any) => {
    const profile = await updateProfile(payload);
    setUser(profile);
    return profile;
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    return resetPasswordRequest(email);
  }, []);

  const selectStore = useCallback(
    (storeId: string) => {
      const selectedStore = stores.find((s) => s.id === storeId);
      if (selectedStore) {
        setStore(selectedStore);
        setCurrentRole(selectedStore.status || null); // Role fallback
        localStorage.setItem("preferred_store_id", storeId);
        return selectedStore;
      }
      return null;
    },
    [stores],
  );

  const hasRole = useCallback(
    (requiredRoles: string | string[]) => {
      if (!currentRole) return false;
      const roleHierarchy: Record<string, number> = { owner: 4, admin: 3, manager: 2, staff: 1 };
      const rolesArray = Array.isArray(requiredRoles)
        ? requiredRoles
        : [requiredRoles];
      const currentRoleLevel = roleHierarchy[currentRole] || 0;
      return rolesArray.some((role) => (roleHierarchy[role] || 0) <= currentRoleLevel);
    },
    [currentRole],
  );

  const canAccessResource = useCallback(
    (_resource: string) => {
      if (!user || !store) return false;
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

export const useAuthContext = useAuth;
