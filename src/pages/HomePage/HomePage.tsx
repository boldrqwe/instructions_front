import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useArticlesQuery } from '../../entities/article/api/queries';
import { clampSnippet } from '../../shared/lib/clampSnippet';
import styles from './HomePage.module.css';

/**
 * Главная страница, отображающая список опубликованных статей.
 */
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

  const articles = data.content;

  let latestUpdatedArticle: (typeof articles)[number] | undefined;
  for (const article of articles) {
    if (!article.updatedAt) {
      continue;
    }
    if (!latestUpdatedArticle) {
      latestUpdatedArticle = article;
      continue;
    }
    const currentTime = new Date(article.updatedAt).getTime();
    const latestTime = latestUpdatedArticle.updatedAt
      ? new Date(latestUpdatedArticle.updatedAt).getTime()
      : 0;
    if (currentTime > latestTime) {
      latestUpdatedArticle = article;
    }
  }

  const featuredArticle = latestUpdatedArticle ?? articles.find(article => Boolean(article.slug));
  const featuredArticleSlug = featuredArticle?.slug;
  const latestUpdateDate = latestUpdatedArticle?.updatedAt
    ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(
        new Date(latestUpdatedArticle.updatedAt)
      )
    : null;

  // --- Основной рендер ---
  return (
    <section className={styles.root} aria-labelledby="home-title">
      <aside className={styles.sidebar} aria-label="Навигация по опубликованным статьям">
        <h2 className={styles.sidebarTitle}>Все статьи</h2>
        <p className={styles.sidebarHint}>
          Откройте любую инструкцию или воспользуйтесь поиском, чтобы найти нужную информацию.
        </p>
        <nav>
          <ul className={styles.sidebarList}>
            {articles.map((article) => (
              <li key={`nav-${article.id ?? article.slug ?? article.title}`} className={styles.sidebarItem}>
                <Link to={`/articles/${article.slug}`} className={styles.sidebarLink}>
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className={styles.contentArea}>
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Справочник</span>
          <h1 id="home-title" className={styles.title}>
            База знаний длинных инструкций
          </h1>
          <p className={styles.subtitle}>
            Изучайте подробные руководства в формате, напоминающем документацию: структурированно, с понятной навигацией и быстрым доступом к нужным материалам.
          </p>
          <div className={styles.heroMeta}>
            <span className={styles.heroBadge}>Всего {articles.length} статей</span>
            {latestUpdateDate ? (
              <span className={styles.heroUpdate}>Последнее обновление {latestUpdateDate}</span>
            ) : null}
          </div>
          <div className={styles.heroActions}>
            <Link to="/search" className={styles.primaryButton}>
              Найти инструкцию
            </Link>
            {featuredArticleSlug ? (
              <Link to={`/articles/${featuredArticleSlug}`} className={styles.secondaryLink}>
                Читать свежую статью
              </Link>
            ) : null}
          </div>
        </header>

        <ul className={styles.list}>
          {articles.map((article) => (
            <li key={article.id ?? article.slug ?? article.title} className={styles.card}>
              <Link to={`/articles/${article.slug}`} className={styles.link}>
                <div>
                  <h2 className={styles.cardTitle}>{article.title}</h2>
                  <p className={styles.cardDescription}>
                    {clampSnippet(article.description ?? '', 180)}
                  </p>
                </div>
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
      </div>
    </section>
  );
}

export default HomePage;
