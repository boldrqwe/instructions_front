import { NavLink, Link } from 'react-router-dom';
import styles from './Layout.module.css';

type Props = { children: React.ReactNode };

export function Layout({ children }: Props) {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>Instructions</Link>

        <nav className={styles.nav}>
          <NavLink to="/" end className={({ isActive }) => isActive ? styles.active : undefined}>
            Главная
          </NavLink>

          <NavLink to="/search" className={({ isActive }) => isActive ? styles.active : undefined}>
            Поиск
          </NavLink>

          {/* CTA — ссылка на создание статьи */}
          <NavLink
            to="/admin/articles/new"
            className={({ isActive }) =>
              [styles.cta, isActive ? styles.active : ''].join(' ')
            }
          >
            Создать статью
          </NavLink>
        </nav>
      </header>

      <main className={styles.content}>{children}</main>
    </div>
  );
}
