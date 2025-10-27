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

  const hasQuery = debouncedQuery.trim().length > 0;

  return (
    <section className={styles.root} aria-labelledby="search-title">
      <header className={styles.hero}>
        <div className={styles.heading}>
          <p className={styles.label}>Справочный центр</p>
          <h1 id="search-title" className={styles.title}>
            Поиск статьи
          </h1>
          <p className={styles.subtitle}>
            Найдите нужные материалы и разделы: мы собрали все инструкции и статьи в одном
            месте, чтобы вы могли быстро перейти к нужному разделу документации.
          </p>
        </div>

        <nav className={styles.tabs} aria-label="Основные разделы">
          <span className={`${styles.tab} ${styles.tabActive}`}>Обзор</span>
          <span className={styles.tab}>Обучение</span>
          <span className={styles.tab}>Поддержка</span>
        </nav>

        <form className={styles.form} role="search" onSubmit={(event) => event.preventDefault()}>
          <label className={styles.labelField}>
            <span className="sr-only">Строка поиска</span>
            <input
              className={styles.input}
              type="search"
              value={inputValue}
              placeholder="Поиск статьи"
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
      </header>

      <div className={styles.body}>
        <aside className={styles.sidebar} aria-label="Содержание справочника">
          <h2 className={styles.sidebarTitle}>Spring Framework</h2>
          <ul className={styles.sidebarList}>
            <li>
              <a className={`${styles.sidebarLink} ${styles.sidebarLinkActive}`} href="#overview" aria-current="page">
                Overview
              </a>
            </li>
            <li>
              <a className={styles.sidebarLink} href="#learn">
                Learn
              </a>
            </li>
            <li>
              <a className={styles.sidebarLink} href="#support">
                Support
              </a>
            </li>
            <li>
              <a className={styles.sidebarLink} href="#features">
                Key features
              </a>
            </li>
            <li>
              <a className={styles.sidebarLink} href="#migration">
                Migration policy
              </a>
            </li>
          </ul>
        </aside>

        <div className={styles.main}>
          {hasQuery ? (
            <div className={styles.results}>
              {isFetching && <p className={styles.message}>Ищем…</p>}

              {isError && !isFetching && (
                <p className={`${styles.message} ${styles.messageError}`} role="alert">
                  Ошибка: {error instanceof Error ? error.message : 'не удалось выполнить поиск'}
                </p>
              )}

              {data && data.items.length === 0 && !isFetching && !isError && (
                <p className={styles.message}>Ничего не найдено. Попробуйте другой запрос.</p>
              )}

              {data && data.items.length > 0 && (
                <ul className={styles.list}>
                  {data.items.map((item) => {
                    const link =
                      item.type === 'section' && item.sectionAnchor
                        ? `/articles/${item.slug}#${item.sectionAnchor}`
                        : `/articles/${item.slug}`;

                    return (
                      <li key={`${item.type}-${item.id}`} className={styles.result}>
                        <Link to={link} className={styles.resultLink}>
                          <span className={styles.resultBadge} data-type={item.type}>
                            {item.type === 'section' ? 'Секция' : 'Статья'}
                          </span>
                          <h2 className={styles.resultTitle}>{item.title}</h2>
                          <p className={styles.resultSnippet}>{clampSnippet(item.snippet, 200)}</p>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}

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
          ) : (
            <div className={styles.empty}>
              <p className={styles.message}>Введите запрос, чтобы увидеть результаты.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default SearchPage;
