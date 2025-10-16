import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import styles from './SearchBar.module.css';

/**
 * Строка поиска, синхронизирующая значение с query-параметром `q` на странице поиска.
 */
export function SearchBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const [value, setValue] = useState('');

  useEffect(() => {
    if (location.pathname === '/search') {
      setValue(params.get('q') ?? '');
    } else {
      setValue('');
    }
  }, [location.pathname, params]);

  return (
    <form
      className={styles.form}
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const query = value.trim();
        if (query.length === 0) {
          return;
        }
        navigate(`/search?q=${encodeURIComponent(query)}`);
      }}
    >
      <label className={styles.label}>
        <span className="sr-only">Поиск по статьям</span>
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          className={styles.input}
          type="search"
          placeholder="Поиск по инструкциям"
          name="q"
        />
      </label>
      <button className={styles.button} type="submit">
        Найти
      </button>
    </form>
  );
}
