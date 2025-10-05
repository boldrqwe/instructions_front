import { NavLink } from 'react-router-dom';
import { useAuth } from '../../model/auth'; // путь подкорректируй

export function Layout({ children }: { children: React.ReactNode }) {
  const { isAdmin, logout } = useAuth();
  return (
    <>
      <header>
        <nav>
          <NavLink to="/" end>Главная</NavLink>
          <NavLink to="/search">Поиск</NavLink>
          {isAdmin ? (
            <>
              <NavLink to="/admin/articles/new">Создать статью</NavLink>
              <button onClick={logout}>Выйти</button>
            </>
          ) : (
            <NavLink to="/admin/login">Войти</NavLink>
          )}
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
