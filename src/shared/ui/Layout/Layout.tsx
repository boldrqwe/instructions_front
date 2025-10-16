import { NavLink } from 'react-router-dom';
import { useAuth } from '../../model/auth';
import styles from './Layout.module.css';

/**
 * Базовый макет приложения с шапкой навигации и административными ссылками.
 * @param props.children Контент страницы, который будет отрисован в `<main>`.
 */
export function Layout({ children }: { children: React.ReactNode }) {
  const { isAdmin, logout } = useAuth();
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <nav className={styles.nav}>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.linkActive}` : styles.link
            }
          >
            Главная
          </NavLink>
          <NavLink
            to="/search"
            className={({ isActive }) =>
              isActive ? `${styles.link} ${styles.linkActive}` : styles.link
            }
          >
            Поиск
          </NavLink>
          {isAdmin ? (
            <div className={styles.actions}>
              <NavLink
                to="/admin/articles/drafts"
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.linkActive}` : styles.link
                }
              >
                Черновики
              </NavLink>
              <NavLink
                to="/admin/articles/new"
                className={({ isActive }) =>
                  isActive ? `${styles.link} ${styles.linkActive}` : styles.link
                }
              >
                Создать статью
              </NavLink>
              <button type="button" className={styles.button} onClick={logout}>
                Выйти
              </button>
            </div>
          ) : (
            <NavLink
              to="/admin/login"
              className={({ isActive }) =>
                isActive ? `${styles.link} ${styles.linkActive}` : styles.link
              }
            >
              Войти
            </NavLink>
          )}
        </nav>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
