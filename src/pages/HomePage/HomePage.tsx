import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useArticlesQuery } from '../../entities/article/api/queries';
import { clampSnippet } from '../../shared/lib/clampSnippet';
import styles from './HomePage.module.css';

export function HomePage() {
  const params = useMemo(() => ({ status: 'PUBLISHED' as const }), []);
  const { data, isLoading, isError } = useArticlesQuery(params);

  return (
    <section className={styles.root} aria-labelledby="home-title">
      <header className={styles.hero}>
        <h1 id="home-title" className={styles.title}>
          База знаний длинных инструкций
        </h1>
        <p className={styles.subtitle}>
          Находите статьи, переходите к нужным секциям и изучайте инструкции в удобном формате.
        </p>
      </header>
      {isLoading && <p className={styles.state}>Загружаем список статей…</p>}
      {isError && (
        <p className={styles.state} role="alert">
          Не удалось загрузить статьи. Попробуйте обновить страницу.
        </p>
      )}
      <ul className={styles.list}>
        {data?.items.map((article) => (
          <li key={article.id} className={styles.card}>
            <Link to={`/articles/${article.slug}`} className={styles.link}>
              <h2 className={styles.cardTitle}>{article.title}</h2>
              <p className={styles.cardDescription}>{clampSnippet(article.description, 160)}</p>
              <span className={styles.meta}>
                Обновлено {new Date(article.updatedAt).toLocaleDateString('ru-RU')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HomePage;
