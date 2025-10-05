import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  isAdmin: boolean;
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setIsAdmin(data.authenticated && data.roles?.includes('ROLE_ADMIN')))
      .catch(() => {
        setIsAdmin(false);
        setToken(null);
        localStorage.removeItem('token');
      });
  }, [token]);

  async function login(username: string, password: string): Promise<boolean> {
    try {
      const resp = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      if (!data.token) return false;
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setIsAdmin(true);
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

  return (
    <AuthContext.Provider value={{ token, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
