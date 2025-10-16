import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useArticleQuery, useTocQuery } from '../../entities/article/api/queries';
import type { Section } from '../../entities/article/model/types';
import { ApiError } from '../../shared/config/api';
import { scrollToAnchor } from '../../shared/lib/scrollToAnchor';
import { PageSpinner } from '../../shared/ui/PageSpinner/PageSpinner';
import { MarkdownView } from '../../widgets/MarkdownView/MarkdownView';
import { Toc } from '../../widgets/Toc/Toc';
import { NotFoundPage } from '../NotFoundPage/NotFoundPage';
import styles from './ArticlePage.module.css';

/**
 * Узнаёт, является ли переданный объект HTML-элементом.
 */
function isHTMLElement(el: unknown): el is HTMLElement {
  return el instanceof HTMLElement;
}

/**
 * Страница отображения статьи с оглавлением и прокруткой к разделам.
 */
export function ArticlePage() {
  const { slug } = useParams();
  const location = useLocation();
  const [activeSectionId, setActiveSectionId] = useState<string>();
  const [isDesktop, setIsDesktop] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);

  useEffect(() => {
    const handler = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const { data: article, isLoading, isError, error } = useArticleQuery(slug ?? '', Boolean(slug));
  const { data: toc } = useTocQuery(article?.id);

  const sections = useMemo<Section[]>(() => {
    if (!toc) return [];
    return toc.items.flatMap((chapter) => chapter.sections);
  }, [toc]);

  useEffect(() => {
    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length > 0) {
          setActiveSectionId(visible[0].target.id);
          return;
        }

        const firstAbove = entries
          .filter((entry) => entry.boundingClientRect.top < 0)
          .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);

        if (firstAbove.length > 0) {
          setActiveSectionId(firstAbove[0].target.id);
        }
      },
      {
        rootMargin: '-40% 0px -40% 0px',
        threshold: [0.1, 0.25, 0.5, 0.75],
      },
    );

    // собираем элементы разделов безопасно
    const observed: HTMLElement[] = sections
      .map((section) => {
        const candidateIds: string[] = [];
        if (section.anchor) {
          candidateIds.push(section.anchor, `user-content-${section.anchor}`);
        }
        candidateIds.push(section.id);

        const el =
          candidateIds
            .map((id) => document.getElementById(id))
            .find((node) => isHTMLElement(node)) ?? null;

        return el;
      })
      .filter(isHTMLElement);

    observed.forEach((el) => observer.observe(el));

    return () => {
      observed.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [sections]);

  useEffect(() => {
    if (!location.hash || !sections.length) return;
    const anchor = location.hash.slice(1);
    const timeout = window.setTimeout(() => {
      scrollToAnchor(anchor, { smooth: false });
      setActiveSectionId(anchor);
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [location.hash, sections]);

  useEffect(() => {
    if (isDesktop) setIsTocOpen(false);
  }, [isDesktop]);

  if (isLoading) return <PageSpinner />;

  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return <NotFoundPage />;
    }
    return (
      <div className={styles.error} role="alert">
        Не удалось загрузить статью. Попробуйте обновить страницу.
      </div>
    );
  }

  if (!article) return null;

  const isTocVisible = isDesktop || isTocOpen;

  return (
    <article className={styles.layout}>
      {toc && (
        <Toc
          items={toc.items}
          activeId={activeSectionId}
          onNavigate={(anchor) => {
            scrollToAnchor(anchor);
            setActiveSectionId(anchor);
            if (!isDesktop) setIsTocOpen(false);
          }}
          isOpen={isTocVisible}
          onClose={!isDesktop ? () => setIsTocOpen(false) : undefined}
        />
      )}
      <div className={styles.content}>
        {!isDesktop && toc && (
          <button
            type="button"
            className={styles.tocToggle}
            onClick={() => setIsTocOpen((prev) => !prev)}
          >
            {isTocOpen ? 'Скрыть оглавление' : 'Открыть оглавление'}
          </button>
        )}
        <header className={styles.header}>
          <h1 className={styles.title}>{article.title}</h1>
          <p className={styles.description}>{article.description}</p>
          <span className={styles.meta}>
            Обновлено {new Date(article.updatedAt).toLocaleDateString('ru-RU')}
          </span>
        </header>
        <div className={styles.markdown}>
          <MarkdownView content={article.body} />
        </div>
      </div>
    </article>
  );
}

export default ArticlePage;
