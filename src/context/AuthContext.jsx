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
  const [isLoading, setIsLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    try {
      const refreshed = await refreshAccessToken();
      setAccessToken(refreshed.accessToken);
      setUser(refreshed.user);
      setStore(refreshed.store || null);
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      setStore(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    setAuthFailureHandler(() => {
      setAccessToken(null);
      setUser(null);
      setStore(null);
    });

    return () => {
      setAuthFailureHandler(null);
    };
  }, []);

  const login = useCallback(async (payload) => {
    const data = await loginRequest(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
    setStore(data.store || null);
    return data;
  }, []);

  const register = useCallback(async (payload) => {
    const data = await registerRequest(payload);
    setAccessToken(data.accessToken || null);
    setUser(data.user || null);
    setStore(data.store || null);
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setAccessToken(null);
      setUser(null);
      setStore(null);
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

  const value = useMemo(
    () => ({
      user,
      store,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      syncProfile,
      saveProfile,
      requestPasswordReset,
    }),
    [
      user,
      store,
      isLoading,
      login,
      register,
      logout,
      syncProfile,
      saveProfile,
      requestPasswordReset,
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
