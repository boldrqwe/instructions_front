import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useSearchQuery } from '../../entities/article/api/queries';
import { clampSnippet } from '../../shared/lib/clampSnippet';
import { debounce } from '../../shared/lib/debounce';
import styles from './SearchPage.module.css';

/**
 * Количество результатов на странице поиска.
 */
const PAGE_SIZE = 10;

/**
 * Вспомогательный тип debounced-функции с методом cancel.
 */
type DebouncedFn = ((...args: readonly unknown[]) => void) & { cancel: () => void };

/**
 * Страница поиска по статьям и разделам с debounce и пагинацией.
 */
export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') ?? '';
  const pageParam = Number(searchParams.get('page') ?? '0');

  const [inputValue, setInputValue] = useState(queryParam);
  const [debouncedQuery, setDebouncedQuery] = useState(queryParam);

  useEffect(() => {
    setInputValue(queryParam);
    setDebouncedQuery(queryParam);
  }, [queryParam]);

  // ✅ обёртка под тип (...args: readonly unknown[]) => void
  const debouncedUpdate = useMemo<DebouncedFn>(() => {
    const fn = (...args: readonly unknown[]) => {
      const value = String(args[0] ?? '');
      setDebouncedQuery(value);
    };
    return debounce(fn, 300) as DebouncedFn;
  }, []);

  useEffect(() => {
    debouncedUpdate(inputValue);
    return () => debouncedUpdate.cancel();
  }, [inputValue, debouncedUpdate]);

  const searchParamsObject = useMemo(
    () => ({ query: debouncedQuery, page: pageParam, size: PAGE_SIZE }),
    [debouncedQuery, pageParam],
  );

  const { data, isFetching, isError, error } = useSearchQuery(
    searchParamsObject,
    debouncedQuery.trim().length > 0,
  );

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <section className={styles.root} aria-labelledby="search-title">
      <h1 id="search-title" className={styles.title}>
        Поиск по инструкциям
      </h1>

      <form className={styles.form} role="search" onSubmit={(event) => event.preventDefault()}>
        <label className={styles.label}>
          <span className="sr-only">Строка поиска</span>
          <input
            className={styles.input}
            type="search"
            value={inputValue}
            placeholder="Введите запрос"
            onChange={(event) => {
              const value = event.target.value;
              setInputValue(value);
              setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                if (value) params.set('q', value);
                else params.delete('q');
                params.set('page', '0');
                return params;
              });
            }}
          />
        </label>
      </form>

      {debouncedQuery.trim().length === 0 ? (
        <p className={styles.state}>Введите запрос, чтобы увидеть результаты.</p>
      ) : (
        <div className={styles.results}>
          {isFetching && <p className={styles.state}>Ищем…</p>}

          {isError && !isFetching && (
            <p className={styles.state} role="alert">
              Ошибка: {error instanceof Error ? error.message : 'не удалось выполнить поиск'}
            </p>
          )}

          {data && data.items.length === 0 && !isFetching && !isError && (
            <p className={styles.state}>Ничего не найдено. Попробуйте другой запрос.</p>
          )}

          <ul className={styles.list}>
            {data?.items.map((item) => {
              const link =
                item.type === 'section' && item.sectionAnchor
                  ? `/articles/${item.slug}#${item.sectionAnchor}`
                  : `/articles/${item.slug}`;

              return (
                <li key={`${item.type}-${item.id}`} className={styles.card}>
                  <Link to={link} className={styles.link}>
                    <span className={styles.badge} data-type={item.type}>
                      {item.type === 'section' ? 'Секция' : 'Статья'}
                    </span>
                    <h2 className={styles.cardTitle}>{item.title}</h2>
                    <p className={styles.snippet}>{clampSnippet(item.snippet, 200)}</p>
                  </Link>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav className={styles.pagination} aria-label="Навигация по страницам">
              <button
                type="button"
                className={styles.pageButton}
                onClick={() =>
                  setSearchParams((prev) => {
                    const params = new URLSearchParams(prev);
                    const nextPage = Math.max(pageParam - 1, 0);
                    params.set('page', String(nextPage));
                    return params;
                  })
                }
                disabled={pageParam <= 0}
              >
                Назад
              </button>

              <span className={styles.pageInfo}>
                Страница {pageParam + 1} из {totalPages}
              </span>

              <button
                type="button"
                className={styles.pageButton}
                onClick={() =>
                  setSearchParams((prev) => {
                    const params = new URLSearchParams(prev);
                    const nextPage = Math.min(pageParam + 1, totalPages - 1);
                    params.set('page', String(nextPage));
                    return params;
                  })
                }
                disabled={pageParam + 1 >= totalPages}
              >
                Вперёд
              </button>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}

export default SearchPage;
