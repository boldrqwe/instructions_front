import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import styles from './ArticlePreviewPage.module.css';

interface PreviewState {
  readonly title?: string;
  readonly summary?: string;
  readonly coverImageUrl?: string | null;
  readonly contentHtml?: string;
}

export function ArticlePreviewPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state ?? {}) as PreviewState;

  useEffect(() => {
    if (!state.contentHtml) {
      navigate('/admin/articles/new', { replace: true });
    }
  }, [state.contentHtml, navigate]);

  if (!state.contentHtml) {
    return null;
  }

  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>{state.title || 'Предпросмотр статьи'}</h1>
        {state.summary ? <p className={styles.summary}>{state.summary}</p> : null}
      </header>
      {state.coverImageUrl ? (
        <div className={styles.cover}>
          <img src={state.coverImageUrl} alt="Обложка" />
        </div>
      ) : null}
      <div className={styles.content} dangerouslySetInnerHTML={{ __html: state.contentHtml }} />
    </article>
  );
}
