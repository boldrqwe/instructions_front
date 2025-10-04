import { useEffect, useRef, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { SearchBar } from '../../../widgets/SearchBar/SearchBar';
import styles from './Layout.module.css';

interface LayoutProps {
  readonly children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mainRef.current?.focus();
    window.scrollTo({ top: 0 });
  }, [location]);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <Link className={styles.logo} to="/">
          Длинные инструкции
        </Link>
        <SearchBar />
      </header>
      <main
        ref={mainRef}
        id="main-content"
        className={styles.main}
        tabIndex={-1}
        aria-live="polite"
      >
        {children}
      </main>
    </div>
  );
}
