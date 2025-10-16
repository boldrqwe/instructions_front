import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/model/auth';
import styles from './LoginPage.module.css';

/**
 * Страница входа администратора в систему публикации статей.
 */
export function LoginPage() {
  const { login } = useAuth();
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const loc = useLocation();
  const redirectTo = (loc.state as any)?.from ?? '/';

  /**
   * Отправляет форму входа и перенаправляет пользователя при успехе.
   */
  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const ok = await login(u, p);
    if (!ok) return setErr('Не удалось войти');
    nav(redirectTo, { replace: true });
  }

  return (
    <section className={styles.root}>
      <div className={styles.card}>
        <h1 className={styles.title}>Войти</h1>
        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.field} htmlFor="login-username">
            <span className={styles.label}>Логин</span>
            <input
              id="login-username"
              className={styles.input}
              placeholder="admin"
              value={u}
              onChange={(e) => setU(e.target.value)}
              required
              autoComplete="username"
            />
          </label>
          <label className={styles.field} htmlFor="login-password">
            <span className={styles.label}>Пароль</span>
            <input
              id="login-password"
              className={styles.input}
              placeholder="••••••••"
              type="password"
              value={p}
              onChange={(e) => setP(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          {err && (
            <div className={styles.error} role="alert">
              {err}
            </div>
          )}
          <button type="submit" className={styles.submit}>
            Войти
          </button>
        </form>
      </div>
    </section>
  );
}
