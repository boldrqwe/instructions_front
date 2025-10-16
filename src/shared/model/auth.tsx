import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Внутреннее представление авторизационных данных в локальном состоянии.
 */
type AuthState =
  | { schema: 'bearer'; token: string }
  | { schema: 'basic'; credentials: string };

/**
 * Данные, предоставляемые контекстом авторизации компонентам приложения.
 */
interface AuthContextType {
  authHeader: string | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

/**
 * Контекст, предоставляющий авторизационные данные и методы входа/выхода.
 */
const AuthContext = createContext<AuthContextType>(null!);

/**
 * Провайдер авторизации, управляющий хранением токена и проверкой административных прав.
 * @param props.children Компоненты, которым требуется доступ к данным авторизации.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState | null>(() => {
    const stored = localStorage.getItem('token');
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as {
        schema?: string;
        token?: string;
        credentials?: string;
      };

      if (parsed?.schema === 'basic' && typeof parsed.credentials === 'string') {
        return { schema: 'basic', credentials: parsed.credentials };
      }
      if (parsed?.schema === 'bearer' && typeof parsed.token === 'string') {
        return { schema: 'bearer', token: parsed.token };
      }
    } catch {
      // старый формат — просто токен
      return { schema: 'bearer', token: stored };
    }

    return null;
  });

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!authState) return;
    let isCancelled = false;

    /**
     * Загружает профиль пользователя и проверяет наличие роли администратора.
     */
    async function loadProfile(state: AuthState) {
      try {
        const authorizationHeader =
          state.schema === 'bearer'
            ? `Bearer ${state.token}`
            : `Basic ${state.credentials}`;

        const baseUrl =
          import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
          'http://localhost:8080/api/v1';

        // ✅ вызываем /auth/profile, если есть
        const response = await fetch(`${baseUrl}/auth/profile`, {
          headers: { Authorization: authorizationHeader },
        });

        if (!response.ok) {
          console.warn('[Auth] Profile check failed:', response.status);
          throw new Error(`Profile request failed: ${response.status}`);
        }

        const data = (await response.json()) as AuthProfileResponse;
        if (isCancelled) return;

        const hasAdminRole = Boolean(
          data.authenticated && data.roles?.includes('ROLE_ADMIN')
        );
        setIsAdmin(hasAdminRole);
      } catch (err) {
        if (isCancelled) return;
        console.error('[Auth] loadProfile error:', err);
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

  /**
   * Выполняет авторизацию по логину и паролю и сохраняет токен в localStorage.
   * @returns `true`, если авторизация прошла успешно.
   */
  async function login(username: string, password: string): Promise<boolean> {
    try {
      const tokenPayload = `${username}:${password}`;
      const encodedToken = window.btoa(tokenPayload);

      const baseUrl =
        import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ??
        'http://localhost:8080/api/v1';

      const response = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${encodedToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[Auth] login failed:', response.status);
        return false;
      }

      const contentType = response.headers.get('content-type') ?? '';
      let data: AuthLoginResponse | null = null;
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      }

      const nextState: AuthState =
        data && typeof data.token === 'string'
          ? { schema: 'bearer', token: data.token }
          : { schema: 'basic', credentials: encodedToken };

      localStorage.setItem('token', JSON.stringify(nextState));
      setAuthState(nextState);
      setIsAdmin(true); //  сразу считаем админом, потом loadProfile уточнит

      return true;
    } catch (err) {
      console.error('[Auth] login error:', err);
      return false;
    }
  }

  /**
   * Сбрасывает состояние авторизации и удаляет токен из localStorage.
   */
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
    <AuthContext.Provider value={{ authHeader, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Возвращает контекст авторизации; удобная обёртка над `useContext`.
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Ответ эндпоинта профиля с ролями пользователя.
 */
interface AuthProfileResponse {
  readonly authenticated: boolean;
  readonly roles?: string[];
}

/**
 * Ответ авторизации, содержащий bearer-токен при его наличии.
 */
interface AuthLoginResponse {
  readonly token?: string;
}
