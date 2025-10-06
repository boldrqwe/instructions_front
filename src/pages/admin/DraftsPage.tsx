import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { listArticles } from '../../entities/articles/api';
import type { ArticleListItem } from '../../entities/articles/types';
import { useAuth } from '../../shared/model/auth';
import { Button } from '../../shared/ui/Button/Button';
import styles from './DraftsPage.module.css';

interface DraftsResponse {
  readonly content?: ArticleListItem[];
  readonly totalElements?: number;
}

export function DraftsPage() {
  const { authHeader } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['drafts', authHeader],
    queryFn: () =>
      listArticles({ status: 'DRAFT', size: 50, authHeader: authHeader ?? undefined }) as Promise<DraftsResponse>,
    enabled: Boolean(authHeader),
  });

  const drafts = useMemo(() => data?.content ?? [], [data]);

  if (isLoading) {
    return (
      <div className={styles.root}>
        <p>Загрузка черновиков…</p>
      </div>
    );
  }

  if (isError || !authHeader) {
    return (
      <div className={styles.root}>
        <p role="alert">Не удалось загрузить черновики. Попробуйте обновить страницу.</p>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <h1>Черновики статей</h1>
      {drafts.length === 0 ? (
        <div className={styles.empty}>У вас пока нет черновиков. Создайте новую статью!</div>
      ) : (
        <div className={styles.list}>
          {drafts.map((draft) => (
            <div key={draft.id} className={styles.draft}>
              <div className={styles.title}>{draft.title}</div>
              <div className={styles.meta}>
                Обновлено {new Date(draft.updatedAt).toLocaleString('ru-RU')}
              </div>
              <div className={styles.actions}>
                <Button onClick={() => navigate(`/admin/articles/${draft.id}/edit`)}>Редактировать</Button>
                <Button variant="secondary" onClick={() => navigate(`/articles/${draft.slug}`)}>
                  Открыть публичную версию
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
