import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchArticles, publishArticle, unpublishArticle } from '../../entities/articles/api';
import type { Article } from '../../entities/articles/types';
import { useAuth } from '../../shared/model/auth';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import styles from './DraftsPage.module.css';

const PAGE_SIZE = 50;

export function DraftsPage() {
  const { authHeader } = useAuth();
  const [articles, setArticles] = useState<Article[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [query]);

  const loadDrafts = useMemo(() => {
    if (!authHeader) return () => Promise.resolve();
    return async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchArticles(
          {
            status: 'DRAFT',
            query: debouncedQuery || undefined,
            page: 0,
            size: PAGE_SIZE,
          },
          authHeader,
        );
        setArticles(response.items);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
  }, [authHeader, debouncedQuery]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  async function togglePublish(id: string, action: 'publish' | 'unpublish') {
    if (!authHeader) return;
    try {
      const result =
        action === 'publish'
          ? await publishArticle(id, authHeader)
          : await unpublishArticle(id, authHeader);
      setArticles(prev =>
        prev.map(article => (article.id === id ? { ...article, status: result.status } : article)),
      );
    } catch (err) {
      // eslint-disable-next-line no-alert
      window.alert((err as Error).message);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Черновики</h1>
          <p className={styles.subtitle}>Управляйте черновыми версиями статей и публикуйте их</p>
        </div>
        <Link to="/admin/articles/new" className={styles.createLink}>
          <Button>Создать статью</Button>
        </Link>
      </header>
      <div className={styles.filters}>
        <Input
          label="Поиск по заголовку"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Введите часть заголовка"
        />
      </div>
      {isLoading ? <p className={styles.hint}>Загрузка черновиков...</p> : null}
      {error ? <p className={styles.error}>Ошибка: {error}</p> : null}
      <div className={styles.list}>
        {articles.map(article => (
          <Card key={article.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{article.title}</h2>
                <p className={styles.cardMeta}>
                  Обновлено {new Date(article.updatedAt).toLocaleString()}
                </p>
              </div>
              <span className={`${styles.status} ${styles[article.status.toLowerCase()]}`}>
                {article.status === 'PUBLISHED' ? 'Опубликовано' : 'Черновик'}
              </span>
            </div>
            <div className={styles.cardActions}>
              <Link to={`/admin/articles/${article.id}/edit`} className={styles.cardLink}>
                <Button variant="secondary">Редактировать</Button>
              </Link>
              {article.status === 'DRAFT' ? (
                <Button onClick={() => togglePublish(article.id, 'publish')}>Опубликовать</Button>
              ) : (
                <Button variant="secondary" onClick={() => togglePublish(article.id, 'unpublish')}>
                  Снять с публикации
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      {!isLoading && articles.length === 0 ? (
        <p className={styles.hint}>Черновиков пока нет. Создайте первую статью.</p>
      ) : null}
    </div>
  );
}
