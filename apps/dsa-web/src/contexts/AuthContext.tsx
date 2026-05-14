import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createParsedApiError, getParsedApiError, type ParsedApiError } from '../api/error';
import { authApi, type UserInfoResponse } from '../api/auth';
import { useStockPoolStore } from '../stores';

type AuthContextValue = {
  authEnabled: boolean;
  loggedIn: boolean;
  user: UserInfoResponse | null;
  isLoading: boolean;
  loadError: ParsedApiError | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: ParsedApiError }>;
  register: (username: string, password: string, passwordConfirm: string, email?: string) => Promise<{ success: boolean; error?: ParsedApiError }>;
  logout: () => Promise<void>;
  refreshStatus: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function extractLoginError(err: unknown): ParsedApiError {
  const parsed = getParsedApiError(err);
  if (parsed.status === 429) {
    return createParsedApiError({
      title: '操作尝试过于频繁',
      message: '尝试次数过多，请稍后再试。',
      rawMessage: parsed.rawMessage,
      status: parsed.status,
      category: parsed.category,
    });
  }
  return parsed;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authEnabled, setAuthEnabled] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<UserInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<ParsedApiError | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const status = await authApi.getStatus();
      setAuthEnabled(status.authEnabled);
      setLoggedIn(status.loggedIn);
      
      if (status.loggedIn) {
        try {
          const userInfo = await authApi.getMe();
          setUser(userInfo);
        } catch (err) {
          console.error('Failed to fetch user info', err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      
      if (status.authEnabled && !status.loggedIn) {
        useStockPoolStore.getState().resetDashboardState();
      }
    } catch (err) {
      setLoadError(getParsedApiError(err));
      setAuthEnabled(false);
      setLoggedIn(false);
      setUser(null);
      useStockPoolStore.getState().resetDashboardState();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const login = useCallback(
    async (username: string, password: string): Promise<{ success: boolean; error?: ParsedApiError }> => {
      try {
        await authApi.login(username, password);
        await fetchStatus();
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: extractLoginError(err) };
      }
    },
    [fetchStatus]
  );

  const register = useCallback(
    async (username: string, password: string, passwordConfirm: string, email?: string): Promise<{ success: boolean; error?: ParsedApiError }> => {
      try {
        await authApi.register(username, password, passwordConfirm, email);
        return { success: true };
      } catch (err: unknown) {
        return { success: false, error: extractLoginError(err) };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    let logoutError: unknown = null;
    try {
      await authApi.logout();
    } catch (err) {
      logoutError = err;
    } finally {
      await fetchStatus();
    }

    if (logoutError && getParsedApiError(logoutError).status !== 401) {
      throw logoutError;
    }
  }, [fetchStatus]);

  return (
    <AuthContext.Provider
      value={{
        authEnabled,
        loggedIn,
        user,
        isLoading,
        loadError,
        login,
        register,
        logout,
        refreshStatus: fetchStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- useAuth is a hook, co-located for context access
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
