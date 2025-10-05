import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { apiClient } from '../config/api';

type AuthState =
  | { schema: 'bearer'; token: string }
  | { schema: 'basic'; credentials: string };

interface AuthContextType {
  authHeader: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState | null>(() => {
    const stored = localStorage.getItem('token');
    if (!stored) {
      return null;
    }

    try {
      const parsed = JSON.parse(stored) as { schema?: string; token?: string; credentials?: string };
      if (parsed?.schema === 'basic' && typeof parsed.credentials === 'string') {
        return { schema: 'basic', credentials: parsed.credentials } satisfies AuthState;
      }
      if (parsed?.schema === 'bearer' && typeof parsed.token === 'string') {
        return { schema: 'bearer', token: parsed.token } satisfies AuthState;
      }
    } catch {
      if (stored) {
        return { schema: 'bearer', token: stored } satisfies AuthState;
      }
    }

    return null;
  });
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authState) {
      return;
    }

    let isCancelled = false;

    async function loadProfile(state: AuthState) {
      try {
        const authorizationHeader =
          state.schema === 'bearer'
            ? `Bearer ${state.token}`
            : `Basic ${state.credentials}`;
        const data = await apiClient<AuthProfileResponse>('/auth/me', {
          headers: { Authorization: authorizationHeader },
        });

        if (isCancelled) {
          return;
        }

        const hasAdminRole = Boolean(data.authenticated && data.roles?.includes('ROLE_ADMIN'));
        setIsAdmin(hasAdminRole);
      } catch {
        if (isCancelled) {
          return;
        }

        setIsAdmin(false);
        setAuthState(null);
        localStorage.removeItem('token');
      }
    }

    loadProfile(authState);

    return () => {
      isCancelled = true;
    };
  }, [authState]);

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const tokenPayload = `${username}:${password}`;
      const encodedToken = window.btoa(
        String.fromCharCode(...new TextEncoder().encode(tokenPayload)),
      );

      const baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';
      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encodedToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return false;
      }

      let data: AuthLoginResponse | null = null;
      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        data = await response
          .json()
          .then((payload) => (payload && typeof payload === 'object' ? payload : null))
          .catch(() => null);
      }

      const nextState: AuthState =
        data && typeof data.token === 'string'
          ? { schema: 'bearer', token: data.token }
          : { schema: 'basic', credentials: encodedToken };

      localStorage.setItem('token', JSON.stringify(nextState));
      setAuthState(nextState);

      return true;
    } catch {
      return false;
    }
  }

  function logout() {
    setAuthState(null);
    setIsAdmin(false);
    localStorage.removeItem('token');
  }

  const authHeader = authState
    ? authState.schema === 'bearer'
      ? `Bearer ${authState.token}`
      : `Basic ${authState.credentials}`
    : null;

  return (
    <AuthContext.Provider value={{ authHeader, isAdmin, login, logout }}>{children}</AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

interface AuthProfileResponse {
  readonly authenticated: boolean;
  readonly roles?: string[];
}

interface AuthLoginResponse {
  readonly token?: string;
}
