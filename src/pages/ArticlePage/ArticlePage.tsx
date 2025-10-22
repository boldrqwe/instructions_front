// src/pages/ArticlePage/ArticlePage.tsx

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { useArticleQuery } from '../../entities/article/api/queries';
import { ApiError } from '../../shared/config/api';
import { scrollToAnchor } from '../../shared/lib/scrollToAnchor';
import { PageSpinner } from '../../shared/ui/PageSpinner/PageSpinner';
import { MarkdownView } from '../../widgets/MarkdownView/MarkdownView';
import { Toc } from '../../widgets/Toc/Toc';
import { NotFoundPage } from '../NotFoundPage/NotFoundPage';
import styles from './ArticlePage.module.css';
import { useHtmlToc, type TocItem } from '../../shared/lib/useHtmlToc';

/** Узкий type-guard, чтобы TS понял, что это HTMLElement. */
function isHTMLElement(el: unknown): el is HTMLElement {
  return el instanceof HTMLElement;
}

/**
 * UI-тип, который обычно ждёт твой <Toc />:
 * глава с набором секций. (Если у тебя в Toc другие имена полей —
 * поменяй ниже в адаптере соответствующие ключи.)
 */
type UiTocSection = { id: string; title: string };
type UiTocChapter = { id: string; title: string; sections: UiTocSection[] };

/**
 * Простой адаптер плоских заголовков → главы/секции для <Toc />.
 *
 * Правило группировки:
 * - h1: игнорируем в ToC (это заголовок всей статьи).
 * - h2: создаёт новую главу.
 * - h3: добавляется как секция в последнюю h2-главу.
 * - h4–h6: складываем тоже в последнюю главу как плоские секции.
 *
 * При желании легко усложнить (вложенные уровни и т.п.).
 */
function buildChaptersFrom(items: TocItem[]): UiTocChapter[] {
  const chapters: UiTocChapter[] = [];

  for (const h of items) {
    if (h.level <= 1) {
      // h1 пропускаем
      continue;
    }
    if (h.level === 2) {
      chapters.push({ id: h.id, title: h.text, sections: [] });
      continue;
    }
    // h3–h6 → секции последней главы; если главы ещё нет — создаём «Без раздела»
    if (chapters.length === 0) {
      chapters.push({ id: 'misc', title: 'Раздел', sections: [] });
    }
    chapters[chapters.length - 1].sections.push({ id: h.id, title: h.text });
  }
  return chapters;
}

/**
 * @file ArticlePage
 * @module pages/ArticlePage
 *
 * @summary Просмотр опубликованной статьи.
 *
 * @description
 * - Грузит статью по slug.
 * - Строит ToC из реального HTML (h1–h6) — без API ToC.
 * - Рендерит markdown+html через <MarkdownView/> (rehype-slug обязателен).
 * - Подсвечивает активный пункт ToC с помощью IntersectionObserver.
 * - Переходит к якорю из location.hash после первой отрисовки.
 */
export function ArticlePage() {
  const { slug } = useParams();
  const location = useLocation();

  /** Контейнер с отрендеренным HTML статьи — из него берём DOM-заголовки. */
  const contentRef = useRef<HTMLDivElement | null>(null);

  /** Текущий активный id заголовка (подсветка в ToC). */
  const [activeSectionId, setActiveSectionId] = useState<string>();

  /** Desktop (фиксированный ToC) vs mobile (выезжающая панель). */
  const [isDesktop, setIsDesktop] = useState(false);

  /** Состояние выезжающей панели ToC на мобильных. */
  const [isTocOpen, setIsTocOpen] = useState(false);

  /** Определяем desktop-режим. */
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /** Загружаем статью по slug. */
  const { data: article, isLoading, isError, error } = useArticleQuery(
      slug ?? '',
      Boolean(slug),
  );

  /** Плоские заголовки из HTML тела статьи. */
  const tocFlat = useHtmlToc(article?.body ?? '');

  /** Группируем под UI <Toc /> — главы + секции. */
  const tocChapters: UiTocChapter[] = useMemo(
      () => buildChaptersFrom(tocFlat),
      [tocFlat],
  );

  /** Реальные DOM-элементы заголовков внутри контента — для наблюдения. */
  const [headingElements, setHeadingElements] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root || tocFlat.length === 0) {
      setHeadingElements([]);
      return;
    }

    const esc = (s: string) =>
      (window.CSS && 'escape' in window.CSS ? (window.CSS as any).escape(s) : s);

    const collect = () => {
      const nodes = tocFlat
        .map((h) => {
          const direct = root.querySelector<HTMLElement>(`#${esc(h.id)}`);
          if (direct) return direct;
          return root.querySelector<HTMLElement>(`#${esc(`user-content-${h.id}`)}`);
        })
        .filter(isHTMLElement);
      setHeadingElements(nodes);
    };

    collect();

    const observer = new MutationObserver(() => collect());
    observer.observe(root, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [tocFlat, article?.body]);

  /** Подсветка активной секции при скролле. */
  useEffect(() => {
    if (headingElements.length === 0) return;

    const normalize = (value: string) => value.replace(/^user-content-/, '');

    const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
              .filter((e) => e.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

          if (visible.length > 0) {
            setActiveSectionId(normalize((visible[0].target as HTMLElement).id));
            return;
          }

          const firstAbove = entries
              .filter((e) => e.boundingClientRect.top < 0)
              .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);

          if (firstAbove.length > 0) {
            setActiveSectionId(normalize((firstAbove[0].target as HTMLElement).id));
          }
        },
        {
          // центральная «сладкая зона» — попадание даёт приоритет
          rootMargin: '-40% 0px -40% 0px',
          threshold: [0.1, 0.25, 0.5, 0.75],
        },
    );

    headingElements.forEach((el) => observer.observe(el));
    return () => {
      headingElements.forEach((el) => observer.unobserve(el));
      observer.disconnect();
    };
  }, [headingElements]);

  /** Переход к якорю из URL после первой отрисовки контента. */
  useEffect(() => {
    if (!location.hash || tocFlat.length === 0) return;
    const anchor = decodeURIComponent(location.hash.slice(1));
    const t = window.setTimeout(() => {
      scrollToAnchor(anchor, { smooth: false });
      setActiveSectionId(anchor);
    }, 150);
    return () => window.clearTimeout(t);
  }, [location.hash, tocFlat]);

  /** В desktop-режиме прячем мобильную панель ToC. */
  useEffect(() => {
    if (isDesktop) setIsTocOpen(false);
  }, [isDesktop]);

  // Состояния загрузки/ошибки
  if (isLoading) return <PageSpinner />;
  if (isError) {
    if (error instanceof ApiError && error.status === 404) return <NotFoundPage />;
    return (
        <div className={styles.error} role="alert">
          Не удалось загрузить статью. Попробуйте обновить страницу.
        </div>
    );
  }
  if (!article) return null;

  /** Видимость ToC: desktop — всегда; mobile — по кнопке. */
  const isTocVisible = isDesktop || isTocOpen;

  return (
      <article className={styles.layout}>
        {/* Рендерим ToC только когда реально есть пункты */}
        {tocChapters.length > 0 && (
            <Toc
                items={tocChapters} // <-- теперь форма данных такая, какую ожидает твой Toc
                activeId={activeSectionId}
                onNavigate={(id: string) => {
                  scrollToAnchor(id);
                  setActiveSectionId(id);
                  if (!isDesktop) setIsTocOpen(false);
                }}
                isOpen={isTocVisible}
                onClose={!isDesktop ? () => setIsTocOpen(false) : undefined}
            />
        )}

        <div className={styles.content}>
          {/* Кнопка открытия ToC — только на мобиле и только если есть пункты */}
          {!isDesktop && tocChapters.length > 0 && (
              <button
                  type="button"
                  className={styles.tocToggle}
                  onClick={() => setIsTocOpen((v) => !v)}
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

          {/* Контейнер с контентом: из него берём DOM заголовков для подсветки */}
          <div className={styles.markdown} ref={contentRef}>
            <MarkdownView content={article.body} />
          </div>
        </div>
      </article>
  );
}

export default ArticlePage;
