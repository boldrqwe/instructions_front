import { createContext, useContext, useMemo, useState } from 'react';

type AuthState = { token: string | null; isAdmin: boolean };
type Ctx = AuthState & {
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem('isAdmin') === '1');

  async function login(username: string, password: string) {
    const base = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';
    try {
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({} as any));
        const tok = data.token || data.accessToken || 'token';
        setToken(tok);  localStorage.setItem('token', tok);
        setIsAdmin(true); localStorage.setItem('isAdmin', '1');
        return true;
      }
    } catch {}
    // dev-режим без бэка (включается при VITE_ENABLE_FAKE_LOGIN=true)
    if (import.meta.env.VITE_ENABLE_FAKE_LOGIN === 'true') {
      setToken('dev'); localStorage.setItem('token', 'dev');
      setIsAdmin(true); localStorage.setItem('isAdmin', '1');
      return true;
    }
    return false;
  }

  function logout() {
    setToken(null); setIsAdmin(false);
    localStorage.removeItem('token'); localStorage.removeItem('isAdmin');
  }

  const value = useMemo(() => ({ token, isAdmin, login, logout }), [token, isAdmin]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
