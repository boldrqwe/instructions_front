import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthContextType {
  user: { name: string; roles: string[] } | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  login: async () => false,
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ name: string; roles: string[] } | null>(null);

  // 🟢 Автовосстановление авторизации
  useEffect(() => {
    const savedHeader = localStorage.getItem('authHeader');
    if (!savedHeader) return;

    fetch('/api/v1/auth/me', {
      headers: { Authorization: savedHeader },
    })
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data?.authenticated) {
          setUser({ name: data.name, roles: data.roles });
        } else {
          localStorage.removeItem('authHeader');
        }
      })
      .catch(() => localStorage.removeItem('authHeader'));
  }, []);

  async function login(username: string, password: string): Promise<boolean> {
    const authHeader = 'Basic ' + btoa(`${username}:${password}`);
    const res = await fetch('/api/v1/auth/me', {
      headers: { Authorization: authHeader },
    });

    if (!res.ok) return false;
    const data = await res.json();

    if (!data.authenticated) return false;

    localStorage.setItem('authHeader', authHeader);
    setUser({ name: data.name, roles: data.roles });
    return true;
  }

  function logout() {
    localStorage.removeItem('authHeader');
    setUser(null);
  }

  const isAdmin = !!user?.roles?.includes('ROLE_ADMIN');

  return (
    <AuthContext.Provider value={{ user, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
