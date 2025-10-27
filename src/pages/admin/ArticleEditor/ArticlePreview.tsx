import { useMemo } from 'react';

import { MarkdownView } from '../../../widgets/MarkdownView/MarkdownView';
import articleStyles from '../../ArticlePage/ArticlePage.module.css';
import styles from './ArticlePreview.module.css';

interface ArticlePreviewProps {
    readonly title: string;
    readonly summary: string;
    readonly contentHtml: string;
    readonly updatedAt: string | null;
}

function formatUpdatedAt(value: string | null): string {
    if (!value) {
        return 'Черновик · пока не сохранено';
    }
    try {
        return `Обновлено ${new Date(value).toLocaleDateString('ru-RU')}`;
    } catch (error) {
        console.error('Failed to format updatedAt for preview', error);
        return 'Обновлено —';
    }
}

export function ArticlePreview({ title, summary, contentHtml, updatedAt }: ArticlePreviewProps) {
    const headerTitle = title.trim() || 'Без заголовка';
    const description = summary.trim() || 'Добавьте краткое описание, чтобы оно появилось здесь.';
    const formattedMeta = useMemo(() => formatUpdatedAt(updatedAt), [updatedAt]);
    const hasContent = contentHtml.trim().length > 0;

    return (
        <section className={styles.previewSection} aria-label="Предпросмотр статьи">
            <header className={styles.previewHeader}>
                <h2 className={styles.previewTitle}>Предпросмотр</h2>
                <p className={styles.previewHint}>
                    Здесь отображается статья так, как она будет выглядеть на странице публикации.
                </p>
            </header>

            <div className={styles.previewSurface}>
                <article className={`${articleStyles.article} ${styles.article}`.trim()}>
                    <header className={articleStyles.header}>
                        <h1 className={articleStyles.title}>{headerTitle}</h1>
                        <p className={`${articleStyles.description} ${summary.trim() ? '' : styles.placeholder}`.trim()}>
                            {description}
                        </p>
                        <span className={articleStyles.meta}>{formattedMeta}</span>
                    </header>
                    <div className={`${articleStyles.articleBody} ${styles.articleBody}`.trim()}>
                        {hasContent ? (
                            <MarkdownView content={contentHtml} />
                        ) : (
                            <p className={styles.emptyContent}>Добавьте контент в редактор, чтобы увидеть превью.</p>
                        )}
                    </div>
                </article>
            </div>
        </section>
    );
}
