import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { apiClient } from '../config/api';

interface AuthContextType {
  token: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!token) return;

    let isCancelled = false;

    async function loadProfile(authToken: string) {
      try {
        const data = await apiClient<AuthProfileResponse>('/auth/me', {
          headers: { Authorization: `Bearer ${authToken}` },
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
        setToken(null);
        localStorage.removeItem('token');
      }
    }

    loadProfile(token);

    return () => {
      isCancelled = true;
    };
  }, [token]);

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const data = await apiClient<AuthLoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });

      if (!data?.token) {
        return false;
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);

      return true;
    } catch {
      return false;
    }
  }

  function logout() {
    setToken(null);
    setIsAdmin(false);
    localStorage.removeItem('token');
  }

  return <AuthContext.Provider value={{ token, isAdmin, login, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

interface AuthProfileResponse {
  readonly authenticated: boolean;
  readonly roles?: string[];
}

interface AuthLoginResponse {
  readonly token: string;
}
