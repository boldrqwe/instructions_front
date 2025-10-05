import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useArticlesQuery } from '../../entities/article/api/queries';
import { clampSnippet } from '../../shared/lib/clampSnippet';
import styles from './HomePage.module.css';

export function HomePage() {
  const params = useMemo(() => ({ status: 'PUBLISHED' as const }), []);
  const { data, isLoading, isError } = useArticlesQuery(params);

  // --- DEBUG: выводим все состояния ---
  console.group('[HomePage Debug]');
  console.log('isLoading:', isLoading);
  console.log('isError:', isError);
  console.log('data:', data);
  console.groupEnd();

  // --- базовые состояния ---
  if (isLoading) {
    return <p className={styles.state}>Загружаем список статей…</p>;
  }

  if (isError) {
    return (
      <p className={styles.state} role="alert">
        Не удалось загрузить статьи. Попробуйте обновить страницу.
      </p>
    );
  }

  // --- Проверка структуры данных ---
  if (!data || !Array.isArray(data.content)) {
    console.error('[HomePage] data.content отсутствует или не массив:', data);
    return (
      <p className={styles.state} role="alert">
        ⚠️ Ошибка данных: поле <code>content</code> отсутствует или некорректно.
      </p>
    );
  }

  // --- Если статей нет ---
  if (data.content.length === 0) {
    return (
      <p className={styles.state}>Пока нет опубликованных статей.</p>
    );
  }

  // --- Основной рендер ---
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

      <ul className={styles.list}>
        {data.content.map((article) => (
          <li key={article.id ?? article.slug ?? Math.random()} className={styles.card}>
            <Link to={`/articles/${article.slug}`} className={styles.link}>
              <h2 className={styles.cardTitle}>{article.title}</h2>
              <p className={styles.cardDescription}>
                {clampSnippet(article.description ?? '', 160)}
              </p>
              <span className={styles.meta}>
                Обновлено{' '}
                {article.updatedAt
                  ? new Date(article.updatedAt).toLocaleDateString('ru-RU')
                  : '—'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default HomePage;
